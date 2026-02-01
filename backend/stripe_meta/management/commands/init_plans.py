from django.core.management.base import BaseCommand
from stripe_meta.stripe_utils import initialize_default_plans

class Command(BaseCommand):
    help = 'Initialize default subscription plans'
    
    """
    Usage:
        docker exec backend python manage.py init_plans
        
    This command populates the database with default Plans (Free, Pro, Ultimate).
    It is idempotent (safe to run multiple times).

    DEPRECATED: Please use `python manage.py migrate` instead. 
    Data seeding is now handled automatically by migration 0002_seed_plans.py.
    """

    def handle(self, *args, **options):
        initialize_default_plans()
        self.stdout.write(self.style.SUCCESS('Successfully initialized plans'))
