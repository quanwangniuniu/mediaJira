from django.core.management.base import BaseCommand
from campaigns.models import Organization, Team, TeamMember
from django.db import transaction


class Command(BaseCommand):
    help = 'Seed database with organization, team, and team member data'

    def handle(self, *args, **options):
        """Create seed data for organizations, teams, and team members"""
        
        with transaction.atomic():
            # # Clear existing data (optional - remove if you want to keep existing data)
            # self.stdout.write('Clearing existing data...')
            # TeamMember.objects.all().delete()
            # Team.objects.all().delete()
            # Organization.objects.all().delete()
            if Organization.objects.exists():
                self.stdout.write(self.style.WARNING('Data already exists. Skipping creation.'))
                return
            # Create 2 organizations
            self.stdout.write('Creating organizations...')
            
            org1 = Organization.objects.create(
                name='TechCorp Solutions',
                desc='Leading technology solutions provider',
                is_parent=True
            )
            
            org2 = Organization.objects.create(
                name='Creative Studio Inc',
                desc='Digital creative agency and design studio',
                is_parent=True
            )
            
            # Create 3 nested teams for TechCorp
            self.stdout.write('Creating teams...')
            
            # Root team
            engineering_team = Team.objects.create(
                name='Engineering',
                organization_id=org1.id,
                desc='Software engineering and development',
                is_parent=True
            )
            
            # Child teams under Engineering
            backend_team = Team.objects.create(
                name='Backend Development',
                organization_id=org1.id,
                parent_team_id=engineering_team.id,
                desc='Backend systems and API development',
                is_parent=False
            )
            
            frontend_team = Team.objects.create(
                name='Frontend Development',
                organization_id=org1.id,
                parent_team_id=engineering_team.id,
                desc='Frontend applications and user interfaces',
                is_parent=False
            )
            
            # Team for Creative Studio
            design_team = Team.objects.create(
                name='Design Team',
                organization_id=org2.id,
                desc='Creative design and branding',
                is_parent=True
            )
            
            # Create 5 team memberships (simulating users with IDs 1-5)
            self.stdout.write('Creating team memberships...')
            
            team_memberships = [
                # User 1 - Alice (Engineering Team Lead)
                {'user_id': 1, 'team_id': engineering_team.id, 'role_id': 1},
                
                # User 2 - Bob (Backend Developer)
                {'user_id': 2, 'team_id': backend_team.id, 'role_id': 2},
                
                # User 3 - Carol (Frontend Developer)
                {'user_id': 3, 'team_id': frontend_team.id, 'role_id': 2},
                
                # User 4 - David (Design Team Lead)
                {'user_id': 4, 'team_id': design_team.id, 'role_id': 1},
                
                # User 5 - Eva (Backend Developer)
                {'user_id': 5, 'team_id': backend_team.id, 'role_id': 2},
            ]
            
            for membership in team_memberships:
                TeamMember.objects.create(**membership)
            
            # Print summary
            self.stdout.write('\n' + '='*50)
            self.stdout.write(self.style.SUCCESS('SEED DATA CREATED SUCCESSFULLY'))
            self.stdout.write('='*50)
            
            self.stdout.write(f'\nOrganizations Created: {Organization.objects.count()}')
            for org in Organization.objects.all():
                self.stdout.write(f"  - {org.name} (ID: {org.id})")
            
            self.stdout.write(f'\nTeams Created: {Team.objects.count()}')
            for team in Team.objects.all():
                parent_info = f" -> Parent: Team ID {team.parent_team_id}" if team.parent_team_id else ""
                self.stdout.write(f"  - {team.name} (ID: {team.id}, Org: {team.organization_id}){parent_info}")
            
            self.stdout.write(f'\nTeam Memberships Created: {TeamMember.objects.count()}')
            for member in TeamMember.objects.all():
                team_name = Team.objects.get(id=member.team_id).name
                self.stdout.write(f"  - User {member.user_id} -> {team_name} (Role: {member.role_id})")
            
            self.stdout.write('\nTeam Hierarchy:')
            self.stdout.write('TechCorp Solutions:')
            self.stdout.write('  └── Engineering (Parent)')
            self.stdout.write('      ├── Backend Development')
            self.stdout.write('      └── Frontend Development')
            self.stdout.write('Creative Studio Inc:')
            self.stdout.write('  └── Design Team')
            
            self.stdout.write('\n' + '='*50)