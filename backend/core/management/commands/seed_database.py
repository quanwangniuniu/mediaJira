"""
Django management command to seed the database with realistic test data.

Usage:
    python manage.py seed_database
    python manage.py seed_database --clear
    python manage.py seed_database --count 50
"""
import random
import time
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction
from faker import Faker

# Import all factories
from factories.core_factories import (
    OrganizationFactory,
    CustomUserFactory,
    ProjectFactory,
    TeamFactory,
    TeamMemberFactory,
    RoleFactory,
    PermissionFactory,
    ProjectMemberFactory,
    AdChannelFactory,
    ProjectInvitationFactory,
)
from factories.asset_factories import (
    AssetFactory,
    AssetVersionFactory,
    AssetCommentFactory,
)
from factories.campaign_factories import (
    CampaignTaskFactory,
    ExecutionLogFactory,
    ChannelConfigFactory,
    ROIAlertTriggerFactory,
)
from factories.task_factories import (
    TaskFactory,
    ApprovalRecordFactory,
    TaskCommentFactory,
)
from factories.budget_approval_factories import (
    BudgetPoolFactory,
    BudgetRequestFactory,
    BudgetEscalationRuleFactory,
)
from factories.remaining_factories import (
    RetrospectiveTaskFactory,
    InsightFactory,
    CampaignMetricFactory,
    ReportTemplateFactory,
    ReportFactory,
    ReportSectionFactory,
    OptimizationExperimentFactory,
    ScalingActionFactory,
    OptimizationFactory,
)

fake = Faker()


class Command(BaseCommand):
    help = 'Seed the database with realistic test data using Factory Boy'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of records to generate per model (default: 50, range: 10-100)',
        )
        parser.add_argument(
            '--seed',
            type=int,
            default=42,
            help='Random seed for reproducibility (default: 42)',
        )

    def handle(self, *args, **options):
        # Check if running in DEBUG mode
        if not settings.DEBUG:
            raise CommandError(
                'This command can only be run in DEBUG mode. '
                'Set DEBUG=True in your settings to use this command.'
            )

        clear = options['clear']
        count = options['count']
        seed = options['seed']

        # Validate count range
        if count < 10 or count > 100:
            raise CommandError('Count must be between 10 and 100')

        # Set fixed random seed for reproducibility
        random.seed(seed)
        Faker.seed(seed)

        self.stdout.write(self.style.SUCCESS(f'Starting database seeding with seed={seed}, count={count}'))

        if clear:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            self._clear_data()

        start_time = time.time()

        try:
            with transaction.atomic():
                self._seed_data(count)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during seeding: {str(e)}'))
            raise CommandError(f'Seeding failed: {str(e)}')

        elapsed_time = time.time() - start_time
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Database seeding completed successfully in {elapsed_time:.2f} seconds'
            )
        )

    def _clear_data(self):
        """Clear existing data from all tables"""
        from django.apps import apps
        from django.db import connection

        # Get all models
        all_models = []
        for app_config in apps.get_app_configs():
            all_models.extend(app_config.get_models())

        # Disable foreign key checks temporarily
        with connection.cursor() as cursor:
            # PostgreSQL specific
            cursor.execute("SET session_replication_role = 'replica';")

            for model in all_models:
                try:
                    count = model.objects.all().delete()[0]
                    if count > 0:
                        self.stdout.write(f'  Deleted {count} {model.__name__} records')
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'  Could not delete {model.__name__}: {str(e)}')
                    )

            cursor.execute("SET session_replication_role = 'origin';")

    def _seed_data(self, count):
        """Generate seed data in proper dependency order"""
        self.stdout.write('\nGenerating seed data...\n')

        # Phase 1: Core entities (no dependencies)
        self.stdout.write('Phase 1: Core entities...')
        organizations = self._generate(OrganizationFactory, count, 'Organizations')
        permissions = self._generate(PermissionFactory, min(count, 25), 'Permissions')

        # Phase 2: Users and Roles (depend on Organizations)
        self.stdout.write('\nPhase 2: Users and Roles...')
        users = []
        for i in range(count):
            org = organizations[i % len(organizations)] if organizations else None
            user = CustomUserFactory.create(organization=org) if org else CustomUserFactory.create()
            users.append(user)
        self.stdout.write(f'  ✓ Generated {len(users)} Users')
        
        roles = []
        for i in range(min(count, 20)):
            org = organizations[i % len(organizations)] if organizations else None
            role = RoleFactory.create(organization=org) if org else RoleFactory.create()
            roles.append(role)
        self.stdout.write(f'  ✓ Generated {len(roles)} Roles')

        # Phase 3: Projects and Teams (depend on Organizations and Users)
        self.stdout.write('\nPhase 3: Projects and Teams...')
        projects = []
        for i in range(count):
            org = organizations[i % len(organizations)] if organizations else None
            owner = users[i % len(users)] if users else None
            project = ProjectFactory.create(organization=org, owner=owner) if org and owner else ProjectFactory.create()
            projects.append(project)
        self.stdout.write(f'  ✓ Generated {len(projects)} Projects')
        
        teams = []
        for i in range(min(count, 30)):
            org = organizations[i % len(organizations)] if organizations else None
            team = TeamFactory.create(organization=org) if org else TeamFactory.create()
            teams.append(team)
        self.stdout.write(f'  ✓ Generated {len(teams)} Teams')

        # Phase 4: Project and Team memberships
        self.stdout.write('\nPhase 4: Memberships...')
        project_members = []
        for i in range(count * 2):
            project = projects[i % len(projects)] if projects else None
            user = users[i % len(users)] if users else None
            if project and user:
                pm = ProjectMemberFactory.create(project=project, user=user)
                project_members.append(pm)
        self.stdout.write(f'  ✓ Generated {len(project_members)} Project Members')
        
        team_members = []
        for i in range(count):
            team = teams[i % len(teams)] if teams else None
            user = users[i % len(users)] if users else None
            if team and user:
                tm = TeamMemberFactory.create(team=team, user=user)
                team_members.append(tm)
        self.stdout.write(f'  ✓ Generated {len(team_members)} Team Members')

        # Phase 5: Ad Channels (depend on Projects)
        self.stdout.write('\nPhase 5: Ad Channels...')
        ad_channels = []
        for i in range(min(count, 40)):
            project = projects[i % len(projects)] if projects else None
            channel = AdChannelFactory.create(project=project) if project else AdChannelFactory.create()
            ad_channels.append(channel)
        self.stdout.write(f'  ✓ Generated {len(ad_channels)} Ad Channels')

        # Phase 6: Budget Pools (depend on Projects and Ad Channels)
        self.stdout.write('\nPhase 6: Budget Pools...')
        budget_pools = []
        for i in range(min(count, 30)):
            project = projects[i % len(projects)] if projects else None
            ad_channel = ad_channels[i % len(ad_channels)] if ad_channels else None
            if project and ad_channel:
                pool = BudgetPoolFactory.create(project=project, ad_channel=ad_channel)
                budget_pools.append(pool)
        self.stdout.write(f'  ✓ Generated {len(budget_pools)} Budget Pools')

        # Phase 7: Tasks (depend on Projects and Users)
        self.stdout.write('\nPhase 7: Tasks...')
        tasks = []
        for i in range(count):
            project = projects[i % len(projects)] if projects else None
            owner = users[i % len(users)] if users else None
            if project and owner:
                task = TaskFactory.create(project=project, owner=owner)
                tasks.append(task)
        self.stdout.write(f'  ✓ Generated {len(tasks)} Tasks')

        # Phase 8: Budget Requests (depend on Budget Pools, Tasks, Users, Ad Channels)
        self.stdout.write('\nPhase 8: Budget Requests...')
        budget_requests = []
        for i in range(min(count, 40)):
            budget_pool = budget_pools[i % len(budget_pools)] if budget_pools else None
            requested_by = users[i % len(users)] if users else None
            ad_channel = ad_channels[i % len(ad_channels)] if ad_channels else None
            if budget_pool and requested_by and ad_channel:
                br = BudgetRequestFactory.create(
                    budget_pool=budget_pool,
                    requested_by=requested_by,
                    ad_channel=ad_channel
                )
                budget_requests.append(br)
        self.stdout.write(f'  ✓ Generated {len(budget_requests)} Budget Requests')

        # Phase 9: Assets (depend on Users, Teams, Tasks)
        self.stdout.write('\nPhase 9: Assets...')
        assets = []
        for i in range(count):
            owner = users[i % len(users)] if users else None
            team = teams[i % len(teams)] if teams else None
            if owner:
                asset = AssetFactory.create(owner=owner, team=team)
                assets.append(asset)
        self.stdout.write(f'  ✓ Generated {len(assets)} Assets')

        # Phase 10: Asset Versions (depend on Assets)
        self.stdout.write('\nPhase 10: Asset Versions...')
        asset_versions = []
        for i in range(min(count * 2, 100)):
            asset = assets[i % len(assets)] if assets else None
            uploaded_by = users[i % len(users)] if users else None
            if asset and uploaded_by:
                av = AssetVersionFactory.create(asset=asset, uploaded_by=uploaded_by)
                asset_versions.append(av)
        self.stdout.write(f'  ✓ Generated {len(asset_versions)} Asset Versions')

        # Phase 11: Campaign Tasks (depend on Users)
        self.stdout.write('\nPhase 11: Campaign Tasks...')
        campaign_tasks = []
        for i in range(min(count, 40)):
            created_by = users[i % len(users)] if users else None
            if created_by:
                ct = CampaignTaskFactory.create(created_by=created_by)
                campaign_tasks.append(ct)
        self.stdout.write(f'  ✓ Generated {len(campaign_tasks)} Campaign Tasks')

        # Phase 12: Execution Logs (depend on Campaign Tasks)
        self.stdout.write('\nPhase 12: Execution Logs...')
        execution_logs = []
        for i in range(min(count * 2, 100)):
            campaign_task = campaign_tasks[i % len(campaign_tasks)] if campaign_tasks else None
            if campaign_task:
                el = ExecutionLogFactory.create(campaign_task=campaign_task)
                execution_logs.append(el)
        self.stdout.write(f'  ✓ Generated {len(execution_logs)} Execution Logs')

        # Phase 13: Channel Configs (depend on Teams)
        self.stdout.write('\nPhase 13: Channel Configs...')
        channel_configs = []
        for i in range(min(count, 30)):
            team = teams[i % len(teams)] if teams else None
            if team:
                cc = ChannelConfigFactory.create(team=team)
                channel_configs.append(cc)
        self.stdout.write(f'  ✓ Generated {len(channel_configs)} Channel Configs')

        # Phase 14: ROI Alert Triggers (depend on Campaign Tasks)
        self.stdout.write('\nPhase 14: ROI Alert Triggers...')
        roi_alerts = []
        for i in range(min(count, 30)):
            campaign_task = campaign_tasks[i % len(campaign_tasks)] if campaign_tasks else None
            if campaign_task:
                alert = ROIAlertTriggerFactory.create(campaign_task=campaign_task)
                roi_alerts.append(alert)
        self.stdout.write(f'  ✓ Generated {len(roi_alerts)} ROI Alert Triggers')

        # Phase 15: Retrospectives (depend on Projects, Users)
        self.stdout.write('\nPhase 15: Retrospectives...')
        retrospectives = []
        for i in range(min(count, 30)):
            campaign = projects[i % len(projects)] if projects else None
            created_by = users[i % len(users)] if users else None
            if campaign and created_by:
                retro = RetrospectiveTaskFactory.create(campaign=campaign, created_by=created_by)
                retrospectives.append(retro)
        self.stdout.write(f'  ✓ Generated {len(retrospectives)} Retrospectives')

        # Phase 16: Insights (depend on Retrospectives)
        self.stdout.write('\nPhase 16: Insights...')
        insights = []
        for i in range(min(count * 2, 100)):
            retrospective = retrospectives[i % len(retrospectives)] if retrospectives else None
            if retrospective:
                insight = InsightFactory.create(retrospective=retrospective)
                insights.append(insight)
        self.stdout.write(f'  ✓ Generated {len(insights)} Insights')

        # Phase 17: Campaign Metrics (depend on Projects)
        self.stdout.write('\nPhase 17: Campaign Metrics...')
        campaign_metrics = []
        for i in range(min(count * 3, 150)):
            campaign = projects[i % len(projects)] if projects else None
            if campaign:
                cm = CampaignMetricFactory.create(campaign=campaign)
                campaign_metrics.append(cm)
        self.stdout.write(f'  ✓ Generated {len(campaign_metrics)} Campaign Metrics')

        # Phase 18: Reports (depend on Report Templates)
        self.stdout.write('\nPhase 18: Reports...')
        report_templates = self._generate(ReportTemplateFactory, min(count, 20), 'Report Templates')
        reports = []
        for i in range(min(count, 30)):
            template = report_templates[i % len(report_templates)] if report_templates else None
            report = ReportFactory.create(report_template=template) if template else ReportFactory.create()
            reports.append(report)
        self.stdout.write(f'  ✓ Generated {len(reports)} Reports')

        # Phase 19: Report Sections (depend on Reports)
        self.stdout.write('\nPhase 19: Report Sections...')
        report_sections = []
        for i in range(min(count * 2, 100)):
            report = reports[i % len(reports)] if reports else None
            if report:
                section = ReportSectionFactory.create(report=report, order_index=i+1)
                report_sections.append(section)
        self.stdout.write(f'  ✓ Generated {len(report_sections)} Report Sections')

        # Phase 20: Optimization Experiments (depend on Users)
        self.stdout.write('\nPhase 20: Optimization Experiments...')
        experiments = []
        for i in range(min(count, 30)):
            created_by = users[i % len(users)] if users else None
            if created_by:
                exp = OptimizationExperimentFactory.create(created_by=created_by)
                experiments.append(exp)
        self.stdout.write(f'  ✓ Generated {len(experiments)} Optimization Experiments')

        # Phase 21: Scaling Actions (depend on Experiments, Users)
        self.stdout.write('\nPhase 21: Scaling Actions...')
        scaling_actions = []
        for i in range(min(count, 30)):
            performed_by = users[i % len(users)] if users else None
            if performed_by:
                sa = ScalingActionFactory.create(performed_by=performed_by)
                scaling_actions.append(sa)
        self.stdout.write(f'  ✓ Generated {len(scaling_actions)} Scaling Actions')

        # Phase 22: Optimizations (depend on Tasks)
        self.stdout.write('\nPhase 22: Optimizations...')
        optimizations = []
        for i in range(min(count, 30)):
            task = tasks[i % len(tasks)] if tasks else None
            if task:
                opt = OptimizationFactory.create(task=task)
                optimizations.append(opt)
        self.stdout.write(f'  ✓ Generated {len(optimizations)} Optimizations')

        # Phase 23: Additional relationships and comments
        self.stdout.write('\nPhase 23: Comments and Relationships...')
        task_comments = []
        for i in range(min(count * 2, 100)):
            task = tasks[i % len(tasks)] if tasks else None
            user = users[i % len(users)] if users else None
            if task and user:
                tc = TaskCommentFactory.create(task=task, user=user)
                task_comments.append(tc)
        self.stdout.write(f'  ✓ Generated {len(task_comments)} Task Comments')
        
        asset_comments = []
        for i in range(min(count, 50)):
            asset = assets[i % len(assets)] if assets else None
            user = users[i % len(users)] if users else None
            if asset and user:
                ac = AssetCommentFactory.create(asset=asset, user=user)
                asset_comments.append(ac)
        self.stdout.write(f'  ✓ Generated {len(asset_comments)} Asset Comments')

        self.stdout.write('\n' + self.style.SUCCESS('✓ All data generated successfully!'))

    def _generate(self, factory_class, count, label, **defaults):
        """Generate records using a factory"""
        start_time = time.time()
        instances = []

        for i in range(count):
            try:
                instance = factory_class.create(**defaults)
                instances.append(instance)
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'  Warning: Failed to create {label} #{i+1}: {str(e)}')
                )

        elapsed = time.time() - start_time
        self.stdout.write(
            f'  ✓ Generated {len(instances)} {label} ({elapsed:.2f}s)'
        )

        return instances
