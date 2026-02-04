# Generated manually for avatar field
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_fix_password_set_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='avatar',
            field=models.ImageField(blank=True, null=True, upload_to='avatars/'),
        ),
    ]
