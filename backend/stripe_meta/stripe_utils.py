from stripe_meta.models import Plan

def initialize_default_plans():
    """
    Initialize default subscription plans (Free, Pro, Ultimate) if they don't exist.
    This function is idempotent.
    """
    plans = [
        {
            'name': 'Free',
            'desc': 'Free plan',
            'max_team_members': 5,
            'max_previews_per_day': 2,
            'max_tasks_per_day': 5,
            'stripe_price_id': None
        },
        {
            'name': 'Pro',
            'desc': 'Pro plan',
            'max_team_members': 10,
            'max_previews_per_day': 10,
            'max_tasks_per_day': 20,
            'stripe_price_id': 'price_1SsOu9HPShvpl3V3M3QZ5R5T'
        },
        {
            'name': 'Ultimate',
            'desc': 'Ultimate plan',
            'max_team_members': 20,
            'max_previews_per_day': 50,
            'max_tasks_per_day': 50,
            'stripe_price_id': 'price_1SsOwQHPShvpl3V3Y2xMMWRG'
        }
    ]

    for plan_data in plans:
        Plan.objects.update_or_create(
            name=plan_data['name'],
            defaults=plan_data
        )
