# Generated migration for chat app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),  # Depends on core app for Project and CustomUser
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Chat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('chat_type', models.CharField(choices=[('private', 'Private Chat'), ('group', 'Group Chat')], help_text='Type of chat: private (1-on-1) or group', max_length=20)),
                ('name', models.CharField(blank=True, help_text='Name of the chat (required for group chats, optional for private)', max_length=200, null=True)),
                ('created_by', models.ForeignKey(help_text='User who created this chat', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_chats', to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(help_text='Project this chat belongs to (required)', on_delete=django.db.models.deletion.CASCADE, related_name='chats', to='core.project')),
            ],
            options={
                'verbose_name': 'Chat',
                'verbose_name_plural': 'Chats',
                'db_table': 'chat',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('content', models.TextField(help_text='Message content')),
                ('message_type', models.CharField(choices=[('text', 'Text Message'), ('system', 'System Message'), ('file', 'File Attachment')], default='text', help_text='Type of message', max_length=20)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Additional metadata for extensibility (e.g., file info, mentions)')),
                ('chat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chat.chat')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Message',
                'verbose_name_plural': 'Messages',
                'db_table': 'chat_message',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='ChatParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('joined_at', models.DateTimeField(auto_now_add=True, help_text='When the user joined this chat')),
                ('last_read_at', models.DateTimeField(blank=True, help_text='Last time the user read messages in this chat', null=True)),
                ('is_active', models.BooleanField(default=True, help_text='Whether the user is still an active participant')),
                ('chat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='chat.chat')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_participations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Chat Participant',
                'verbose_name_plural': 'Chat Participants',
                'db_table': 'chat_participant',
                'ordering': ['joined_at'],
                'unique_together': {('chat', 'user')},
            },
        ),
        migrations.CreateModel(
            name='MessageStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('status', models.CharField(choices=[('sent', 'Sent'), ('delivered', 'Delivered'), ('read', 'Read')], default='sent', help_text='Status of the message for this user', max_length=20)),
                ('timestamp', models.DateTimeField(auto_now=True, help_text='When the status was last updated')),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='statuses', to='chat.message')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='message_statuses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Message Status',
                'verbose_name_plural': 'Message Statuses',
                'db_table': 'chat_message_status',
                'unique_together': {('message', 'user')},
            },
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='chat',
            index=models.Index(fields=['project', 'chat_type'], name='chat_project_c02e6e_idx'),
        ),
        migrations.AddIndex(
            model_name='chat',
            index=models.Index(fields=['created_at'], name='chat_created_679c9d_idx'),
        ),
        migrations.AddIndex(
            model_name='chat',
            index=models.Index(fields=['updated_at'], name='chat_updated_8c3af6_idx'),
        ),
        migrations.AddIndex(
            model_name='chatparticipant',
            index=models.Index(fields=['user', 'is_active'], name='chat_partic_user_id_4f8e9a_idx'),
        ),
        migrations.AddIndex(
            model_name='chatparticipant',
            index=models.Index(fields=['chat', 'is_active'], name='chat_partic_chat_id_2d7c1b_idx'),
        ),
        migrations.AddIndex(
            model_name='chatparticipant',
            index=models.Index(fields=['last_read_at'], name='chat_partic_last_re_5a8f3c_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['chat', 'created_at'], name='chat_messag_chat_id_3e4b2a_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['sender', 'created_at'], name='chat_messag_sender__6f7d8e_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['message_type'], name='chat_messag_message_9a2c1f_idx'),
        ),
        migrations.AddIndex(
            model_name='messagestatus',
            index=models.Index(fields=['message', 'user'], name='chat_messag_message_1b3e4d_idx'),
        ),
        migrations.AddIndex(
            model_name='messagestatus',
            index=models.Index(fields=['user', 'status'], name='chat_messag_user_id_5c6f2a_idx'),
        ),
        migrations.AddIndex(
            model_name='messagestatus',
            index=models.Index(fields=['timestamp'], name='chat_messag_timesta_7d8e3b_idx'),
        ),
    ]

