from django.db import migrations

def seed_plans(apps, schema_editor):
    Plan = apps.get_model('stripe_meta', 'Plan')
    
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
        # We manually replicate update_or_create logic because 
        # update_or_create is a manager method, which might not be fully available on the historical model
        # although usually it works, explicit get/create is safer in migrations
        obj, created = Plan.objects.get_or_create(
            name=plan_data['name'],
            defaults=plan_data
        )
        if not created:
            # Update existing plan with new defaults if it existed
            for key, value in plan_data.items():
                setattr(obj, key, value)
            obj.save()

def reverse_seed(apps, schema_editor):
    # Optional: Delete plans on reverse? Usually we keep user data, but strict reverse would be:
    # Plan = apps.get_model('stripe_meta', 'Plan')
    # Plan.objects.filter(name__in=['Free', 'Pro', 'Ultimate']).delete()
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('stripe_meta', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_plans, reverse_seed),
    ]
