from django.db import models
from django.core.exceptions import ValidationError
from core.models import TimeStampedModel


class Workflow(TimeStampedModel):
    """
    Workflow model - Represents a workflow graph template.
    Stores the basic information about a workflow that can be used
    to define business processes (e.g., ad approval, budget review).
    """

    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_ARCHIVED = "archived"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    name = models.CharField(
        max_length=255,
        help_text="Human-readable workflow name",
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of the workflow's purpose",
    )

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="workflows",
        null=True,
        blank=True,
        help_text="Organization this workflow belongs to",
    )
    project = models.ForeignKey(
        "core.Project",
        on_delete=models.CASCADE,
        related_name="workflows",
        null=True,
        blank=True,
        help_text="Project this workflow belongs to (optional for organization-global workflows)",
    )

    created_by = models.ForeignKey(
        "core.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_workflows",
        help_text="User who created this workflow",
    )

    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        help_text="Current lifecycle status of the workflow",
    )

    version = models.IntegerField(
        default=1,
        help_text="Current version number for this workflow",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["created_by", "status"]),
            models.Index(fields=["organization", "-created_at"]),
        ]
        verbose_name = "Workflow"
        verbose_name_plural = "Workflows"

    def __str__(self):
        return f"{self.name} (v{self.version})"
    
    def get_todo_nodes(self):
        """Get all 'To Do' status nodes for this workflow"""
        return self.nodes.filter(node_type=WorkflowNode.NODE_TYPE_TODO)
    
    def get_in_progress_nodes(self):
        """Get all 'In Progress' status nodes for this workflow"""
        return self.nodes.filter(node_type=WorkflowNode.NODE_TYPE_IN_PROGRESS)
    
    def get_done_nodes(self):
        """Get all 'Done' status nodes for this workflow"""
        return self.nodes.filter(node_type=WorkflowNode.NODE_TYPE_DONE)


class WorkflowVersion(TimeStampedModel):
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name="versions",
        help_text="Logical workflow this version belongs to",
    )
    version_number = models.IntegerField(
        help_text="Version number for this workflow definition",
    )
    name = models.CharField(
        max_length=255,
        help_text="Version-specific workflow name snapshot",
    )
    description = models.TextField(
        blank=True,
        help_text="Version-specific description snapshot",
    )
    status = models.CharField(
        max_length=32,
        choices=Workflow.STATUS_CHOICES,
        default=Workflow.STATUS_DRAFT,
        help_text="Status of this specific version",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured configuration for triggers, conditions and actions",
    )
    created_by = models.ForeignKey(
        "core.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_workflow_versions",
        help_text="User who created this workflow version",
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("workflow", "version_number")
        indexes = [
            models.Index(fields=["workflow", "status"]),
            models.Index(fields=["workflow", "-created_at"]),
        ]
        verbose_name = "Workflow Version"
        verbose_name_plural = "Workflow Versions"

    def __str__(self):
        return f"{self.workflow.name} v{self.version_number}"


class WorkflowNode(TimeStampedModel):
    """
    WorkflowNode model - Represents a status node in a workflow (aligned with Jira Status model).
    
    Simplified from the previous complex node types to match Jira's Status Categories:
    - to_do: Work that has not been started
    - in_progress: Work that is actively being worked on  
    - done: Work that has been completed
    
    Each node stores:
    - label: The status name (e.g., "Open", "In Review", "Completed")
    - node_type: The category (to_do, in_progress, or done)
    - color: Visual representation color
    - data: Position and custom properties
    
    Example data structure:
        {
            "position": {"x": 100, "y": 200},  # Canvas position for visual editor
            "properties": {                     # Custom key-value properties (like Jira)
                "approval_required": "true",
                "notification_enabled": "false"
            }
        }
    
    This aligns with Jira's Status model where:
    - Status Name = label
    - Status Category = node_type
    - Status Properties = data.properties
    """
    
    # Node Types (Status Categories - aligned with Jira)
    # START: Special entry point node (one per workflow)
    # TO_DO, IN_PROGRESS, DONE: Status categories aligned with Jira
    NODE_TYPE_START = 'start'
    NODE_TYPE_TODO = 'to_do'
    NODE_TYPE_IN_PROGRESS = 'in_progress'
    NODE_TYPE_DONE = 'done'
    
    NODE_TYPE_CHOICES = [
        (NODE_TYPE_START, 'Start'),  # Entry point - cannot be deleted, no incoming connections
        (NODE_TYPE_TODO, 'To Do'),
        (NODE_TYPE_IN_PROGRESS, 'In Progress'),
        (NODE_TYPE_DONE, 'Done'),
        # Restore legacy types for compatibility with existing tests and validators
        ('action', 'Action'),
        ('condition', 'Condition'),
        ('approval', 'Approval'),
        ('delay', 'Delay'),
        ('end', 'End'),
    ]
    
    # Foreign Key to Workflow
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='nodes',
        help_text="The workflow this node belongs to"
    )
    
    # Node Type (Category)
    node_type = models.CharField(
        max_length=32,
        choices=NODE_TYPE_CHOICES,
        help_text="Category of this status node (to_do, in_progress, or done) - aligned with Jira Status Categories"
    )
    
    # Node Label
    label = models.CharField(
        max_length=255,
        help_text="Human-readable label for this node (e.g., 'Manager Approval')"
    )
    
    # Node Color (for UI display)
    color = models.CharField(
        max_length=32,
        blank=True,
        default='#6b7280',
        help_text="Color hex code for UI display (e.g., '#3b82f6', '#10b981')"
    )
    
    # Flexible Data Storage
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        Flexible storage for node position and custom properties.
        Aligned with Jira Status model - stores position and key-value properties.
        Example structure:
        {
            "position": {"x": 100, "y": 200},  # Canvas position for visual editor
            "properties": {                     # Custom properties (like Jira Status Properties)
                "key1": "value1",
                "key2": "value2"
            }
        }
        """
    )
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['workflow', 'node_type']),
            models.Index(fields=['workflow', 'created_at']),
        ]
        verbose_name = 'Workflow Node'
        verbose_name_plural = 'Workflow Nodes'
    
    def __str__(self):
        return f"{self.label} ({self.get_node_type_display()}) - {self.workflow.name}"
    
    def clean(self):
        """Validate node data"""
        super().clean()
        
        # Validate that data is a dictionary
        if not isinstance(self.data, dict):
            raise ValidationError({
                'data': 'Node data must be a dictionary/object'
            })
    
    def get_outgoing_connections(self):
        """Get all connections where this node is the source"""
        return self.outgoing_connections.all()
    
    def get_incoming_connections(self):
        """Get all connections where this node is the target"""
        return self.incoming_connections.all()


class WorkflowConnection(TimeStampedModel):
    """
    WorkflowConnection model - Represents a connection/edge between two nodes.
    Defines the flow direction and conditions for transitioning between nodes.
    
    Connection Types:
    
    1. Sequential: Node A completes → Node B starts automatically
       Example: Create Task → Send Notification
       
    2. Conditional: Node A completes → Evaluate condition → Branch to B or C
       Example: Check Budget → (if > 10000) → Manager Approval
                             → (if <= 10000) → Auto Approve
       condition_config example:
       {
           "field": "budget.amount",
           "operator": "greater_than",
           "value": 10000,
           "label": "Budget exceeds $10,000"
       }
       
    3. Parallel: Node A completes → Nodes B, C, D start simultaneously
       Example: Campaign Created → Generate TikTok Draft
                                 → Generate Facebook Draft
                                 → Generate Google Draft
       
    4. Loop: Node A completes → Return to Node B (with iteration limit)
       Example: For each campaign in list → Create Task
       condition_config example:
       {
           "max_iterations": 1000,
           "loop_variable": "current_campaign",
           "collection": "{{campaigns}}"
       }
    """
    
    # Connection Types
    CONNECTION_TYPE_SEQUENTIAL = 'sequential'
    CONNECTION_TYPE_CONDITIONAL = 'conditional'
    CONNECTION_TYPE_PARALLEL = 'parallel'
    CONNECTION_TYPE_LOOP = 'loop'
    
    CONNECTION_TYPE_CHOICES = [
        (CONNECTION_TYPE_SEQUENTIAL, 'Sequential'),
        (CONNECTION_TYPE_CONDITIONAL, 'Conditional'),
        (CONNECTION_TYPE_PARALLEL, 'Parallel'),
        (CONNECTION_TYPE_LOOP, 'Loop'),
    ]
    
    # Foreign Key to Workflow
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='connections',
        help_text="The workflow this connection belongs to"
    )
    
    # Source and Target Nodes
    source_node = models.ForeignKey(
        WorkflowNode,
        on_delete=models.CASCADE,
        related_name='outgoing_connections',
        help_text="The node where this connection starts"
    )
    
    target_node = models.ForeignKey(
        WorkflowNode,
        on_delete=models.CASCADE,
        related_name='incoming_connections',
        help_text="The node where this connection ends"
    )
    
    # Connection Type
    connection_type = models.CharField(
        max_length=32,
        choices=CONNECTION_TYPE_CHOICES,
        default=CONNECTION_TYPE_SEQUENTIAL,
        help_text="Type of connection (sequential, conditional, parallel)"
    )
    
    # Custom Name (optional, aligned with Jira transition naming)
    name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Custom name for this transition (e.g., 'Start Work', 'Merge'). If not provided, defaults to 'Source → Target'"
    )
    
    # Condition Configuration (for conditional and loop connections)
    condition_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        Configuration for conditional and loop connections.
        
        Conditional connection example:
        {
            "field": "budget.amount",
            "operator": "greater_than",
            "value": 10000,
            "label": "Budget exceeds $10,000"
        }
        
        Loop connection example:
        {
            "max_iterations": 100,
            "loop_variable": "current_item",
            "collection": "{{items}}",
            "label": "For each item"
        }
        """
    )
    
    # Priority (for ordering when multiple connections exist)
    priority = models.IntegerField(
        default=0,
        help_text="Priority for execution when multiple connections exist (higher = first)"
    )
    
    # Handle Positions (for UI rendering)
    HANDLE_TOP = 'top'
    HANDLE_RIGHT = 'right'
    HANDLE_BOTTOM = 'bottom'
    HANDLE_LEFT = 'left'
    
    HANDLE_CHOICES = [
        (HANDLE_TOP, 'Top'),
        (HANDLE_RIGHT, 'Right'),
        (HANDLE_BOTTOM, 'Bottom'),
        (HANDLE_LEFT, 'Left'),
    ]
    
    source_handle = models.CharField(
        max_length=20,
        choices=HANDLE_CHOICES,
        default=HANDLE_RIGHT,
        help_text="Which side of the source node the connection originates from"
    )
    
    target_handle = models.CharField(
        max_length=20,
        choices=HANDLE_CHOICES,
        default=HANDLE_LEFT,
        help_text="Which side of the target node the connection connects to"
    )
    
    # Event Type (aligned with Jira Transition Events)
    EVENT_TYPE_MANUAL = 'manual_transition'
    EVENT_TYPE_ISSUE_CREATED = 'issue_created'
    EVENT_TYPE_ISSUE_UPDATED = 'issue_updated'
    EVENT_TYPE_ISSUE_COMMENTED = 'issue_commented'
    EVENT_TYPE_ISSUE_ASSIGNED = 'issue_assigned'
    EVENT_TYPE_ISSUE_RESOLVED = 'issue_resolved'
    
    EVENT_TYPE_CHOICES = [
        (EVENT_TYPE_MANUAL, 'Manual Transition'),
        (EVENT_TYPE_ISSUE_CREATED, 'Issue Created'),
        (EVENT_TYPE_ISSUE_UPDATED, 'Issue Updated'),
        (EVENT_TYPE_ISSUE_COMMENTED, 'Issue Commented'),
        (EVENT_TYPE_ISSUE_ASSIGNED, 'Issue Assigned'),
        (EVENT_TYPE_ISSUE_RESOLVED, 'Issue Resolved'),
    ]
    
    event_type = models.CharField(
        max_length=64,
        choices=EVENT_TYPE_CHOICES,
        default=EVENT_TYPE_MANUAL,
        blank=True,
        help_text="Event that triggers this transition (aligned with Jira Transition Events)"
    )
    
    # Custom Properties (aligned with Jira Transition Properties)
    properties = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        Custom properties for this transition (key-value pairs).
        Aligned with Jira's Transition Properties feature.
        Example: {"approval_required": true, "notification_enabled": false}
        """
    )
    
    class Meta:
        ordering = ['-priority', 'created_at']
        indexes = [
            models.Index(fields=['workflow']),
            models.Index(fields=['source_node']),
            models.Index(fields=['target_node']),
            models.Index(fields=['workflow', 'connection_type']),
        ]
        verbose_name = 'Workflow Connection'
        verbose_name_plural = 'Workflow Connections'
    
    def __str__(self):
        return f"{self.source_node.label} → {self.target_node.label} ({self.get_connection_type_display()})"
    
    def clean(self):
        """Validate connection rules"""
        super().clean()
        
        # Rule 1: Cannot connect a node to itself
        if self.source_node_id and self.target_node_id:
            if self.source_node_id == self.target_node_id:
                raise ValidationError(
                    "A node cannot connect to itself"
                )
        
        # Rule 2: Source and target must belong to the same workflow
        if self.source_node and self.target_node:
            if self.source_node.workflow_id != self.target_node.workflow_id:
                raise ValidationError(
                    "Source and target nodes must belong to the same workflow"
                )
        
        # Rule 3: Done nodes cannot have outgoing connections
        if self.source_node and self.source_node.node_type == WorkflowNode.NODE_TYPE_DONE:
            raise ValidationError({
                'source_node': "Done nodes cannot have outgoing connections. Done is a terminal status."
            })
        # Modified to also check 'end' for legacy test compatibility
        elif self.source_node and self.source_node.node_type == 'end':
            raise ValidationError({
                'source_node': "End nodes cannot have outgoing connections. End is a terminal status."
            })
        
        # Rule 4: Start nodes cannot have incoming connections
        if self.target_node and self.target_node.node_type == 'start':
            raise ValidationError(
                "Start nodes cannot have incoming connections. Start is an initial status."
            )

        # Rule 5: Validate condition_config for conditional connections
        if self.connection_type == self.CONNECTION_TYPE_CONDITIONAL:
            if not isinstance(self.condition_config, dict):
                raise ValidationError({
                    'condition_config': 'Condition configuration must be a dictionary'
                })
        
        # Rule 6: Validate loop connections
        if self.connection_type == self.CONNECTION_TYPE_LOOP:
            if not isinstance(self.condition_config, dict):
                raise ValidationError({
                    'condition_config': 'Loop configuration must be a dictionary'
                })
            
            # Check for max_iterations
            if 'max_iterations' not in self.condition_config:
                raise ValidationError({
                    'condition_config': 'Loop connections must specify max_iterations'
                })
            
            # Validate max_iterations value
            max_iter = self.condition_config.get('max_iterations')
            if not isinstance(max_iter, int) or max_iter < 1 or max_iter > 1000:
                raise ValidationError({
                    'condition_config': 'max_iterations must be an integer between 1 and 1000'
                })
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.clean()
        super().save(*args, **kwargs)


class WorkflowRule(TimeStampedModel):
    """
    WorkflowRule model - Represents rules that control or enhance transitions.
    Rules can restrict transitions, validate data, or perform automated actions.
    """
    
    # Rule Types (matching Jira's three categories)
    RULE_TYPE_RESTRICT = 'restrict_transition'
    RULE_TYPE_VALIDATE = 'validate_details'
    RULE_TYPE_PERFORM = 'perform_actions'
    
    RULE_TYPE_CHOICES = [
        (RULE_TYPE_RESTRICT, 'Restrict Transition'),
        (RULE_TYPE_VALIDATE, 'Validate Details'),
        (RULE_TYPE_PERFORM, 'Perform Actions'),
    ]
    
    # Rule Subtypes for RESTRICT_TRANSITION
    SUBTYPE_BLOCK_UNTIL_APPROVAL = 'block_until_approval'
    SUBTYPE_RESTRICT_BY_SUBTASKS = 'restrict_by_subtasks'
    SUBTYPE_RESTRICT_FROM_ALL_USERS = 'restrict_from_all_users'
    SUBTYPE_RESTRICT_BY_FIELD_VALUE = 'restrict_by_field_value'
    SUBTYPE_RESTRICT_BY_PREVIOUS_STATUS = 'restrict_by_previous_status'
    SUBTYPE_RESTRICT_BY_USER_STATUS_UPDATE = 'restrict_by_user_status_update'
    SUBTYPE_RESTRICT_BY_USER_ROLE = 'restrict_by_user_role'
    
    # Rule Subtypes for VALIDATE_DETAILS
    SUBTYPE_REQUIRE_FORM_ATTACHED = 'require_form_attached'
    SUBTYPE_REQUIRE_FORM_SUBMISSION = 'require_form_submission'
    SUBTYPE_VALIDATE_FIELD = 'validate_field'
    SUBTYPE_VALIDATE_PREVIOUS_STATUS = 'validate_previous_status'
    SUBTYPE_VALIDATE_PARENT_STATUS = 'validate_parent_status'
    SUBTYPE_VALIDATE_USER_PERMISSION = 'validate_user_permission'
    SUBTYPE_SHOW_SCREEN = 'show_screen'
    
    # Rule Subtypes for PERFORM_ACTIONS
    SUBTYPE_ASSIGN_ISSUE = 'assign_issue'
    SUBTYPE_COPY_FIELD_VALUE = 'copy_field_value'
    SUBTYPE_SET_SECURITY_LEVEL = 'set_security_level'
    SUBTYPE_TRIGGER_WEBHOOK = 'trigger_webhook'
    SUBTYPE_UPDATE_FIELD = 'update_field'
    
    RULE_SUBTYPE_CHOICES = [
        # Restrict Transition subtypes
        (SUBTYPE_BLOCK_UNTIL_APPROVAL, 'Block transition until approval'),
        (SUBTYPE_RESTRICT_BY_SUBTASKS, 'Restrict based on status of subtasks'),
        (SUBTYPE_RESTRICT_FROM_ALL_USERS, 'Restrict from all users'),
        (SUBTYPE_RESTRICT_BY_FIELD_VALUE, 'Restrict to when a field is a specific value'),
        (SUBTYPE_RESTRICT_BY_PREVIOUS_STATUS, 'Restrict to when issue has been through a specific status'),
        (SUBTYPE_RESTRICT_BY_USER_STATUS_UPDATE, "Restrict users who have previously updated an issue's status"),
        (SUBTYPE_RESTRICT_BY_USER_ROLE, 'Restrict who can move an issue'),
        
        # Validate Details subtypes
        (SUBTYPE_REQUIRE_FORM_ATTACHED, 'Require an issue to have a form attached'),
        (SUBTYPE_REQUIRE_FORM_SUBMISSION, 'Require form submission on an issue'),
        (SUBTYPE_VALIDATE_FIELD, 'Validate a field'),
        (SUBTYPE_VALIDATE_PREVIOUS_STATUS, 'Validate that an issue has been through a specific status'),
        (SUBTYPE_VALIDATE_PARENT_STATUS, 'Validate that parent issues are in a specific status'),
        (SUBTYPE_VALIDATE_USER_PERMISSION, 'Validate that people have a specific permission'),
        (SUBTYPE_SHOW_SCREEN, 'Show a screen'),
        
        # Perform Actions subtypes
        (SUBTYPE_ASSIGN_ISSUE, 'Assign an issue'),
        (SUBTYPE_COPY_FIELD_VALUE, 'Copy the value of one field to another'),
        (SUBTYPE_SET_SECURITY_LEVEL, "Set an issue's security level"),
        (SUBTYPE_TRIGGER_WEBHOOK, 'Trigger a webhook'),
        (SUBTYPE_UPDATE_FIELD, 'Update an issue field'),
    ]
    
    connection = models.ForeignKey(
        WorkflowConnection,
        on_delete=models.CASCADE,
        related_name='rules',
        help_text="The connection this rule applies to"
    )
    
    rule_type = models.CharField(
        max_length=32,
        choices=RULE_TYPE_CHOICES,
        help_text="Category of rule - restrict, validate, or perform actions"
    )
    
    rule_subtype = models.CharField(
        max_length=64,
        choices=RULE_SUBTYPE_CHOICES,
        help_text="Specific type of rule within the category"
    )
    
    name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional custom name for this rule"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Optional description of what this rule does"
    )
    
    configuration = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        Rule-specific configuration. Structure varies by rule_subtype.
        
        Examples:
        
        Block Until Approval:
        {
            "approver_role": "manager",
            "timeout_hours": 24
        }
        
        Validate Field:
        {
            "field_name": "priority",
            "operator": "is_not_empty",
            "error_message": "Priority must be set"
        }
        
        Assign Issue:
        {
            "assign_to": "reporter",
            "fallback_user_id": 123
        }
        """
    )
    
    order = models.IntegerField(
        default=0,
        help_text="Execution order when multiple rules exist (lower = earlier)"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this rule is currently active"
    )
    
    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['connection', 'rule_type']),
            models.Index(fields=['connection', 'order']),
            models.Index(fields=['connection', 'is_active']),
        ]
        verbose_name = 'Workflow Rule'
        verbose_name_plural = 'Workflow Rules'
    
    def __str__(self):
        name = self.name or self.get_rule_subtype_display()
        return f"{name} ({self.get_rule_type_display()}) - Connection {self.connection.id}"
    
    def clean(self):
        """Validate rule configuration"""
        super().clean()
        
        # Ensure configuration is a dictionary
        if not isinstance(self.configuration, dict):
            raise ValidationError({
                'configuration': 'Rule configuration must be a dictionary/object'
            })
        
        # Validate that rule_subtype matches rule_type category
        restrict_subtypes = [
            self.SUBTYPE_BLOCK_UNTIL_APPROVAL,
            self.SUBTYPE_RESTRICT_BY_SUBTASKS,
            self.SUBTYPE_RESTRICT_FROM_ALL_USERS,
            self.SUBTYPE_RESTRICT_BY_FIELD_VALUE,
            self.SUBTYPE_RESTRICT_BY_PREVIOUS_STATUS,
            self.SUBTYPE_RESTRICT_BY_USER_STATUS_UPDATE,
            self.SUBTYPE_RESTRICT_BY_USER_ROLE,
        ]
        
        validate_subtypes = [
            self.SUBTYPE_REQUIRE_FORM_ATTACHED,
            self.SUBTYPE_REQUIRE_FORM_SUBMISSION,
            self.SUBTYPE_VALIDATE_FIELD,
            self.SUBTYPE_VALIDATE_PREVIOUS_STATUS,
            self.SUBTYPE_VALIDATE_PARENT_STATUS,
            self.SUBTYPE_VALIDATE_USER_PERMISSION,
            self.SUBTYPE_SHOW_SCREEN,
        ]
        
        perform_subtypes = [
            self.SUBTYPE_ASSIGN_ISSUE,
            self.SUBTYPE_COPY_FIELD_VALUE,
            self.SUBTYPE_SET_SECURITY_LEVEL,
            self.SUBTYPE_TRIGGER_WEBHOOK,
            self.SUBTYPE_UPDATE_FIELD,
        ]
        
        if self.rule_type == self.RULE_TYPE_RESTRICT and self.rule_subtype not in restrict_subtypes:
            raise ValidationError({
                'rule_subtype': f'Rule subtype "{self.rule_subtype}" does not match rule type "restrict_transition"'
            })
        
        if self.rule_type == self.RULE_TYPE_VALIDATE and self.rule_subtype not in validate_subtypes:
            raise ValidationError({
                'rule_subtype': f'Rule subtype "{self.rule_subtype}" does not match rule type "validate_details"'
            })
        
        if self.rule_type == self.RULE_TYPE_PERFORM and self.rule_subtype not in perform_subtypes:
            raise ValidationError({
                'rule_subtype': f'Rule subtype "{self.rule_subtype}" does not match rule type "perform_actions"'
            })