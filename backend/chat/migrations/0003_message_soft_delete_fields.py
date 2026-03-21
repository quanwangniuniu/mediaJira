# Generated manually for Bug 1: Message is_deleted/deleted_at and index

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='deleted_at',
            field=models.DateTimeField(blank=True, help_text='When the message was soft deleted', null=True),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['chat', 'is_deleted'], name='chat_messag_chat_id_is_del_idx'),
        ),
    ]
