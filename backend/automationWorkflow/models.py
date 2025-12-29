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
    
    def get_start_nodes(self):
        """Get all start nodes for this workflow"""
        return self.nodes.filter(node_type='start')
    
    def get_end_nodes(self):
        """Get all end nodes for this workflow"""
        return self.nodes.filter(node_type="end")


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
    WorkflowNode model - Represents a single step/node in a workflow graph.
    Each node has a type (start, action, condition, etc.) and stores its
    configuration in a flexible JSONB field.
    
    The node_type defines the basic category, while the 'sub_type' in the data
    field specifies the exact implementation (e.g., 'devops_task', 'tiktok_draft').
    
    Example data structures by node type:
    
    Start/End nodes:
        {"position": {"x": 100, "y": 200}}
    
    Action nodes (Task Creation):
        {
            "position": {"x": 100, "y": 200},
            "sub_type": "devops_task",  # or "campaign_task", "budget_task", etc.
            "config": {
                "task_type": "DEVOPS",
                "fields": {
                    "title": "{{campaign.name}} - Setup",
                    "assignee": "{{campaign.owner}}"
                }
            }
        }
    
    Action nodes (Draft Generation):
        {
            "position": {"x": 100, "y": 200},
            "sub_type": "tiktok_draft",  # or "facebook_draft", "google_draft", etc.
            "config": {
                "template_id": "123",
                "campaign_data": "{{campaign}}"
            }
        }
    
    Condition nodes:
        {
            "position": {"x": 100, "y": 200},
            "config": {
                "field": "budget.amount",
                "operator": "greater_than",
                "value": 10000
            }
        }
    
    Approval nodes:
        {
            "position": {"x": 100, "y": 200},
            "config": {
                "approver_role": "manager",
                "timeout_hours": 24,
                "escalation_rules": [...]
            }
        }
    
    Delay/Wait nodes:
        {
            "position": {"x": 100, "y": 200},
            "config": {
                "delay_type": "duration",  # or "until_date", "until_condition"
                "delay_value": 3,
                "delay_unit": "days"
            }
        }
    """
    
    # Node Types (Basic Categories)
    NODE_TYPE_START = 'start'
    NODE_TYPE_END = 'end'
    NODE_TYPE_ACTION = 'action'
    NODE_TYPE_CONDITION = 'condition'
    NODE_TYPE_APPROVAL = 'approval'
    NODE_TYPE_DELAY = 'delay'
    
    NODE_TYPE_CHOICES = [
        (NODE_TYPE_START, 'Start Node'),
        (NODE_TYPE_END, 'End Node'),
        (NODE_TYPE_ACTION, 'Action Node'),
        (NODE_TYPE_CONDITION, 'Condition Node'),
        (NODE_TYPE_APPROVAL, 'Approval Node'),
        (NODE_TYPE_DELAY, 'Delay Node'),
    ]
    
    # Foreign Key to Workflow
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='nodes',
        help_text="The workflow this node belongs to"
    )
    
    # Node Type
    node_type = models.CharField(
        max_length=32,
        choices=NODE_TYPE_CHOICES,
        help_text="Type of this node (start, action, condition, etc.)"
    )
    
    # Node Label
    label = models.CharField(
        max_length=255,
        help_text="Human-readable label for this node (e.g., 'Manager Approval')"
    )
    
    # Flexible Data Storage
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        Flexible storage for node configuration and position.
        Example structure:
        {
            "position": {"x": 100, "y": 200},  # Canvas position for visual editor
            "config": {                         # Node-specific configuration
                "action_type": "send_email",
                "email_template": "welcome"
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
        
        # Rule 3: Start node cannot be a target
        if self.target_node and self.target_node.node_type == WorkflowNode.NODE_TYPE_START:
            raise ValidationError(
                "Start nodes cannot have incoming connections"
            )
        
        # Rule 4: End node cannot be a source
        if self.source_node and self.source_node.node_type == WorkflowNode.NODE_TYPE_END:
            raise ValidationError(
                "End nodes cannot have outgoing connections"
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


class NodeTypeDefinition(TimeStampedModel):
    """
    Reusable definition for workflow node types, including:
    - Metadata: name, category, icon, color
    - Input / output JSON schemas
    - Configuration JSON schema
    - Default configuration template
    """

    class Category(models.TextChoices):
        TASK_MANAGEMENT = "TASK_MANAGEMENT", "Task Management"
        DRAFT_GENERATORS = "DRAFT_GENERATORS", "Draft Generators"
        CONTROL_FLOW = "CONTROL_FLOW", "Control Flow"
        ACTIONS = "ACTIONS", "Actions"

    # Machine‑readable identifier used in code (e.g. "create_task", "tiktok_draft")
    key = models.SlugField(
        max_length=64,
        unique=True,
        help_text="Machine‑readable key for this node type, e.g. 'create_task'"
    )

    # Human‑readable name
    name = models.CharField(
        max_length=128,
        help_text="Human‑readable node type name"
    )

    # High‑level category
    category = models.CharField(
        max_length=32,
        choices=Category.choices,
        help_text="High‑level category of this node type"
    )

    description = models.TextField(
        blank=True,
        help_text="Detailed description for editors and users"
    )

    # Icon & color for frontend rendering
    icon = models.CharField(
        max_length=64,
        blank=True,
        help_text="Icon name or identifier used by frontend"
    )
    color = models.CharField(
        max_length=32,
        blank=True,
        help_text="Color token or hex code used by frontend"
    )

    # JSON Schemas
    input_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON Schema describing the expected input payload of this node"
    )
    output_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON Schema describing the output payload of this node"
    )
    config_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON Schema used to validate the node configuration"
    )

    # Default configuration template that should conform to config_schema
    default_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Default configuration template for this node type"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this node type is available for use"
    )

    class Meta:
        verbose_name = "Node Type Definition"
        verbose_name_plural = "Node Type Definitions"
        indexes = [
            models.Index(fields=["category", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.key})"

    def clean(self):
        """
        Basic validation hook for JSON fields.
        If you later add 'jsonschema', you can extend this to perform
        full JSON Schema validation.
        """
        super().clean()
        for field_name in ["input_schema", "output_schema", "config_schema", "default_config"]:
            value = getattr(self, field_name)
            if value is not None and not isinstance(value, dict):
                raise ValidationError({field_name: "Must be a JSON object (dict)"})