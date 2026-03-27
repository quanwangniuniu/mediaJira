from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("miro", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="boarditem",
            name="type",
            field=models.CharField(
                choices=[
                    ("text", "Text"),
                    ("shape", "Shape"),
                    ("sticky_note", "Sticky Note"),
                    ("frame", "Frame"),
                    ("line", "Line"),
                    ("connector", "Connector"),
                    ("freehand", "Freehand"),
                    ("emoji", "Emoji"),
                ],
                help_text="Type of the board item",
                max_length=20,
            ),
        ),
    ]
