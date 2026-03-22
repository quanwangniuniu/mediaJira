from django.contrib.auth import get_user_model

AGENT_BOT_EMAIL = 'agent-bot@system.local'
AGENT_BOT_USERNAME = 'agent-bot'


def get_agent_bot_user():
    """Return the singleton Agent Bot user, creating it on first call."""
    User = get_user_model()
    bot, created = User.objects.get_or_create(
        email=AGENT_BOT_EMAIL,
        defaults={
            'username': AGENT_BOT_USERNAME,
            'first_name': 'Agent',
            'last_name': 'Bot',
            'is_active': True,
            'is_verified': True,
            'password_set': False,
        },
    )
    if created:
        bot.set_unusable_password()
        bot.save(update_fields=['password'])
    return bot
