from django.db import migrations, models
import json
import re


def parse_context_string(context_str):
    """
    Parse existing context string into structured JSON format.
    Handles various formats including structured and unstructured text.
    """
    if not context_str or not context_str.strip():
        return {}
    
    context_str = context_str.strip()
    result = {
        "reporting_period": None,
        "situation": "",
        "what_changed": ""
    }
    
    # Try to parse structured format: "This report covers {period}.\n\n{situation}\n\n{change}"
    period_match = re.match(r"This report covers (.+?)\.", context_str)
    parts = re.split(r"\n\n+", context_str)
    
    if period_match:
        # Structured format detected
        period_text = period_match.group(1).strip()
        
        # Extract date info from period text if present [DATE:start,end]
        date_match = re.search(r"\[DATE:([^,]+),([^\]]+)\]", period_text)
        period_type = None
        start_date = None
        end_date = None
        
        if date_match:
            period_text = re.sub(r"\[DATE:[^\]]+\]", "", period_text).strip()
            start_date = date_match.group(1)
            end_date = date_match.group(2)
            period_type = "custom"
        else:
            # Try to identify period type
            period_lower = period_text.lower()
            if "last week" in period_lower or re.search(r"\d+.*week", period_lower):
                period_type = "last_week"
            elif "this month" in period_lower or re.search(r"\d+.*month", period_lower):
                period_type = "this_month"
            else:
                period_type = "custom"
        
        result["reporting_period"] = {
            "type": period_type,
            "text": period_text
        }
        
        if start_date and end_date:
            result["reporting_period"]["start_date"] = start_date
            result["reporting_period"]["end_date"] = end_date
        
        # Parse situation and what_changed
        if len(parts) == 2:
            # Only period + one content part (assume it's situation)
            result["situation"] = parts[1].strip() if len(parts) > 1 else ""
        elif len(parts) == 3:
            part1 = parts[1].strip() if len(parts) > 1 else ""
            part2 = parts[2].strip() if len(parts) > 2 else ""
            if part1 and part2:
                result["situation"] = part1
                result["what_changed"] = part2
            elif part1:
                result["situation"] = part1
            elif part2:
                result["what_changed"] = part2
        elif len(parts) > 3:
            result["situation"] = "\n\n".join(parts[1:-1]).strip()
            result["what_changed"] = parts[-1].strip()
    else:
        # No period match - check if starts with double newline (whatChanged only)
        if context_str.startswith("\n\n") or re.match(r"^\s*\n\n", context_str):
            result["what_changed"] = re.sub(r"^\s*\n\n+", "", context_str).strip()
        else:
            # Unstructured format - load entire text into situation
            result["situation"] = context_str
    
    return result


def migrate_context_to_json(apps, schema_editor):
    """
    Migrate existing TextField context to JSONField format.
    """
    ReportTask = apps.get_model("report", "ReportTask")
    
    for report_task in ReportTask.objects.all().only("id", "context", "context_data"):
        # Get the old text context
        old_context = getattr(report_task, "context", None)
        
        if not old_context:
            # Empty context - set to empty dict
            parsed = {}
        else:
            # Parse string context to JSON
            try:
                parsed = parse_context_string(str(old_context))
            except Exception as e:
                # If parsing fails, fallback to putting entire text in situation
                parsed = {
                    "reporting_period": None,
                    "situation": str(old_context),
                    "what_changed": ""
                }
        
        # Save to new context_data field
        report_task.context_data = parsed
        report_task.save(update_fields=["context_data"])


def reverse_migration(apps, schema_editor):
    """
    Reverse migration: convert JSON back to string format.
    This is a best-effort conversion for rollback purposes.
    Note: This assumes context_data field exists and context field will be recreated.
    """
    ReportTask = apps.get_model("report", "ReportTask")
    
    # In reverse, we need to convert context_data back to text and put it in context
    # But since we're reversing, context_data will become context again
    for report_task in ReportTask.objects.all().only("id", "context_data"):
        context_data = getattr(report_task, "context_data", None)
        
        if not context_data or not isinstance(context_data, dict):
            # Will be handled by AddField with default
            continue
        
        # Convert JSON back to string format
        parts = []
        
        # Add reporting period if exists
        rp = context_data.get("reporting_period")
        if rp and rp.get("text"):
            period_text = rp["text"]
            if rp.get("start_date") and rp.get("end_date"):
                period_text = f"{period_text} [DATE:{rp['start_date']},{rp['end_date']}]"
            parts.append(f"This report covers {period_text}.")
        
        # Add situation
        situation = context_data.get("situation", "").strip()
        if situation:
            parts.append(situation)
        
        # Add what_changed
        what_changed = context_data.get("what_changed", "").strip()
        if what_changed:
            if not parts:
                parts.append("")  # Add empty part if no period/situation
            parts.append(what_changed)
        
        # Store in context_data temporarily (will become context after RenameField reverse)
        report_task.context_data = "\n\n".join(parts) if parts else ""
        report_task.save(update_fields=["context_data"])


class Migration(migrations.Migration):

    dependencies = [
        ("report", "0002_reporttask_add_audience_prompt_version"),
    ]

    operations = [
        # Step 1: Add new JSONField as temporary field
        migrations.AddField(
            model_name="reporttask",
            name="context_data",
            field=models.JSONField(
                blank=True,
                default=dict,
                null=True,
                help_text="Structured context for the report: {reporting_period: {type, text, start_date?, end_date?}, situation, what_changed}",
            ),
        ),
        # Step 2: Migrate data from TextField to JSONField
        migrations.RunPython(migrate_context_to_json, reverse_code=reverse_migration),
        # Step 3: Remove old TextField
        migrations.RemoveField(
            model_name="reporttask",
            name="context",
        ),
        # Step 4: Rename new field to context
        migrations.RenameField(
            model_name="reporttask",
            old_name="context_data",
            new_name="context",
        ),
        # Step 5: Make context non-nullable
        migrations.AlterField(
            model_name="reporttask",
            name="context",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Structured context for the report: {reporting_period: {type, text, start_date?, end_date?}, situation, what_changed}",
            ),
        ),
    ]
