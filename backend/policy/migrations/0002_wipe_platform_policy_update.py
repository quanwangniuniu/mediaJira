from django.db import migrations


def wipe_policy_updates(apps, schema_editor):
    PlatformPolicyUpdate = apps.get_model("policy", "PlatformPolicyUpdate")
    PlatformPolicyUpdate.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("policy", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(wipe_policy_updates, migrations.RunPython.noop),
    ]
