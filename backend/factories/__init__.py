"""
Factory classes for database seeding.

This package contains Factory Boy factories for all Django models,
organized by app. These factories are used by the seed_database management
command to generate realistic test data.

This package also integrates with model_bakery for automatic field handling
and provides validation utilities to keep factories in sync with models.
"""

# Import all factories to make them available
from .core_factories import (
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

from .asset_factories import (
    AssetFactory,
    AssetVersionFactory,
    AssetCommentFactory,
    AssetStateTransitionFactory,
    AssetVersionStateTransitionFactory,
    ReviewAssignmentFactory,
)

# Campaign factories are commented out - models don't exist yet
# from .campaign_factories import (
#     CampaignTaskFactory,
#     ExecutionLogFactory,
#     ChannelConfigFactory,
#     ROIAlertTriggerFactory,
# )
from .campaign_factories import (
    CampaignTaskFactory,
    ExecutionLogFactory,
    ChannelConfigFactory,
    ROIAlertTriggerFactory,
)

from .task_factories import (
    TaskFactory,
    ApprovalRecordFactory,
    TaskCommentFactory,
    TaskAttachmentFactory,
    TaskRelationFactory,
    TaskHierarchyFactory,
)

from .budget_approval_factories import (
    BudgetPoolFactory,
    BudgetRequestFactory,
    BudgetEscalationRuleFactory,
)

from .remaining_factories import (
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

# Import utilities
from .utils import make_instance, prepare_instance
from .validators import validate_factory, validate_all_factories, get_model_fields_summary
from .registry import (
    register_factory,
    get_factory,
    get_all_registered_models,
    get_all_registered_factories,
    auto_register,
)

__all__ = [
    # Core factories
    'OrganizationFactory',
    'CustomUserFactory',
    'ProjectFactory',
    'TeamFactory',
    'TeamMemberFactory',
    'RoleFactory',
    'PermissionFactory',
    'ProjectMemberFactory',
    'AdChannelFactory',
    'ProjectInvitationFactory',
    # Asset factories
    'AssetFactory',
    'AssetVersionFactory',
    'AssetCommentFactory',
    'AssetStateTransitionFactory',
    'AssetVersionStateTransitionFactory',
    'ReviewAssignmentFactory',
    # Campaign factories
    'CampaignTaskFactory',
    'ExecutionLogFactory',
    'ChannelConfigFactory',
    'ROIAlertTriggerFactory',
    # Task factories
    'TaskFactory',
    'ApprovalRecordFactory',
    'TaskCommentFactory',
    'TaskAttachmentFactory',
    'TaskRelationFactory',
    'TaskHierarchyFactory',
    # Budget approval factories
    'BudgetPoolFactory',
    'BudgetRequestFactory',
    'BudgetEscalationRuleFactory',
    # Remaining factories
    'RetrospectiveTaskFactory',
    'InsightFactory',
    'CampaignMetricFactory',
    'ReportTemplateFactory',
    'ReportFactory',
    'ReportSectionFactory',
    'OptimizationExperimentFactory',
    'ScalingActionFactory',
    'OptimizationFactory',
    # Utilities
    'make_instance',
    'prepare_instance',
    'validate_factory',
    'validate_all_factories',
    'get_model_fields_summary',
    'register_factory',
    'get_factory',
    'get_all_registered_models',
    'get_all_registered_factories',
    'auto_register',
]

# Auto-register all factories
auto_register()
