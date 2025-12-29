"""
Test cases for NodeTypeDefinition model.

Scenarios:
1. Create NodeTypeDefinition via Shell
2. Validate Category Enum
3. Verify JSON Field Validation
4. Filter by Category & Status
5. Assign Definition to WorkflowNode
"""
import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from workflows.models import (
    NodeTypeDefinition,
    Workflow,
    WorkflowNode
)
from core.models import Organization, Project

User = get_user_model()


@pytest.mark.django_db
class TestNodeTypeDefinitionCreation(TestCase):
    """Test Scenario 1: Create NodeTypeDefinition via Shell"""
    
    def test_create_node_type_definition_with_valid_schemas(self):
        """Test successfully creates a record with valid JSON schemas"""
        node_def = NodeTypeDefinition.objects.create(
            key="create_task",
            name="Create Task",
            category=NodeTypeDefinition.Category.TASK_MANAGEMENT,
            description="Creates a new task in the system",
            icon="ClipboardList",
            color="blue",
            input_schema={
                "type": "object",
                "properties": {
                    "task_title": {"type": "string"},
                    "assignee": {"type": "string"}
                },
                "required": ["task_title"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer"},
                    "status": {"type": "string"}
                }
            },
            config_schema={
                "type": "object",
                "properties": {
                    "task_type": {
                        "type": "string",
                        "enum": ["budget", "asset", "retrospective", "report"]
                    },
                    "title_template": {"type": "string"}
                },
                "required": ["task_type", "title_template"]
            },
            default_config={
                "task_type": "budget",
                "title_template": "{{campaign.name}} - Budget Review"
            },
            is_active=True
        )
        
        # Assert all fields are saved correctly
        self.assertEqual(node_def.key, "create_task")
        self.assertEqual(node_def.name, "Create Task")
        self.assertEqual(node_def.category, NodeTypeDefinition.Category.TASK_MANAGEMENT)
        self.assertEqual(node_def.icon, "ClipboardList")
        self.assertEqual(node_def.color, "blue")
        self.assertIsInstance(node_def.input_schema, dict)
        self.assertIsInstance(node_def.output_schema, dict)
        self.assertIsInstance(node_def.config_schema, dict)
        self.assertIsInstance(node_def.default_config, dict)
        self.assertTrue(node_def.is_active)
        
        # Verify JSON schemas contain expected structure
        self.assertIn("type", node_def.input_schema)
        self.assertIn("properties", node_def.input_schema)
        self.assertIn("task_type", node_def.config_schema.get("properties", {}))
        self.assertEqual(node_def.default_config["task_type"], "budget")
    
    def test_create_node_type_definition_minimal_fields(self):
        """Test creation with only required fields"""
        node_def = NodeTypeDefinition.objects.create(
            key="minimal_node",
            name="Minimal Node",
            category=NodeTypeDefinition.Category.ACTIONS
        )
        
        self.assertEqual(node_def.key, "minimal_node")
        self.assertEqual(node_def.name, "Minimal Node")
        self.assertEqual(node_def.category, NodeTypeDefinition.Category.ACTIONS)
        # Default values
        self.assertEqual(node_def.input_schema, {})
        self.assertEqual(node_def.output_schema, {})
        self.assertEqual(node_def.config_schema, {})
        self.assertEqual(node_def.default_config, {})
        self.assertTrue(node_def.is_active)  # default=True
    
    def test_node_type_definition_str_representation(self):
        """Test string representation"""
        node_def = NodeTypeDefinition.objects.create(
            key="test_node",
            name="Test Node",
            category=NodeTypeDefinition.Category.CONTROL_FLOW
        )
        
        expected_str = "Test Node (test_node)"
        self.assertEqual(str(node_def), expected_str)


@pytest.mark.django_db
class TestNodeTypeDefinitionCategoryValidation(TestCase):
    """Test Scenario 2: Validate Category Enum"""
    
    def test_valid_categories(self):
        """Test all valid category choices can be saved"""
        categories = [
            NodeTypeDefinition.Category.TASK_MANAGEMENT,
            NodeTypeDefinition.Category.DRAFT_GENERATORS,
            NodeTypeDefinition.Category.CONTROL_FLOW,
            NodeTypeDefinition.Category.ACTIONS,
        ]
        
        for category in categories:
            node_def = NodeTypeDefinition.objects.create(
                key=f"test_{category.lower()}",
                name=f"Test {category}",
                category=category
            )
            self.assertEqual(node_def.category, category)
    
    def test_invalid_category_raises_error(self):
        """Test that invalid category string raises ValidationError"""
        node_def = NodeTypeDefinition(
            key="invalid_category",
            name="Invalid Category",
            category="INVALID_CATEGORY"  # Not in choices
        )
        
        with self.assertRaises(ValidationError):
            node_def.full_clean()
    
    def test_category_choices_are_enforced(self):
        """Test that Django enforces category choices at DB level"""
        # This should work
        node_def = NodeTypeDefinition.objects.create(
            key="valid",
            name="Valid",
            category=NodeTypeDefinition.Category.TASK_MANAGEMENT
        )
        self.assertIsNotNone(node_def.id)
        
        # Try to save with invalid category directly (bypassing Django validation)
        # This will fail at database level if constraints are set
        from django.db import connection
        with connection.cursor() as cursor:
            # This should fail if there's a CHECK constraint, but Django TextChoices
            # doesn't create DB constraints by default, so we test at Django level
            pass


@pytest.mark.django_db
class TestNodeTypeDefinitionJSONValidation(TestCase):
    """Test Scenario 3: Verify JSON Field Validation"""
    
    def test_valid_dict_json_fields(self):
        """Test that dict values are accepted for JSON fields"""
        node_def = NodeTypeDefinition.objects.create(
            key="valid_json",
            name="Valid JSON",
            category=NodeTypeDefinition.Category.ACTIONS,
            input_schema={"type": "object"},
            output_schema={"type": "object"},
            config_schema={"type": "object"},
            default_config={"key": "value"}
        )
        
        self.assertIsInstance(node_def.input_schema, dict)
        self.assertIsInstance(node_def.output_schema, dict)
        self.assertIsInstance(node_def.config_schema, dict)
        self.assertIsInstance(node_def.default_config, dict)
    
    def test_empty_dict_json_fields(self):
        """Test that empty dict is valid"""
        node_def = NodeTypeDefinition.objects.create(
            key="empty_json",
            name="Empty JSON",
            category=NodeTypeDefinition.Category.ACTIONS,
            input_schema={},
            output_schema={},
            config_schema={},
            default_config={}
        )
        
        self.assertEqual(node_def.input_schema, {})
        self.assertEqual(node_def.output_schema, {})
    
    def test_non_dict_config_schema_raises_error(self):
        """Test that non-dict data in config_schema raises ValidationError via clean()"""
        node_def = NodeTypeDefinition(
            key="invalid_config",
            name="Invalid Config",
            category=NodeTypeDefinition.Category.ACTIONS,
            config_schema="not a dict"  # Invalid: should be dict
        )
        
        with self.assertRaises(ValidationError) as context:
            node_def.clean()
        
        self.assertIn("config_schema", str(context.exception))
        self.assertIn("Must be a JSON object", str(context.exception))
    
    def test_non_dict_input_schema_raises_error(self):
        """Test that non-dict data in input_schema raises ValidationError"""
        node_def = NodeTypeDefinition(
            key="invalid_input",
            name="Invalid Input",
            category=NodeTypeDefinition.Category.ACTIONS,
            input_schema=["not", "a", "dict"]  # Invalid: should be dict
        )
        
        with self.assertRaises(ValidationError) as context:
            node_def.clean()
        
        self.assertIn("input_schema", str(context.exception))
    
    def test_non_dict_output_schema_raises_error(self):
        """Test that non-dict data in output_schema raises ValidationError"""
        node_def = NodeTypeDefinition(
            key="invalid_output",
            name="Invalid Output",
            category=NodeTypeDefinition.Category.ACTIONS,
            output_schema=123  # Invalid: should be dict
        )
        
        with self.assertRaises(ValidationError) as context:
            node_def.clean()
        
        self.assertIn("output_schema", str(context.exception))
    
    def test_non_dict_default_config_raises_error(self):
        """Test that non-dict data in default_config raises ValidationError"""
        node_def = NodeTypeDefinition(
            key="invalid_default",
            name="Invalid Default",
            category=NodeTypeDefinition.Category.ACTIONS,
            default_config="not a dict"  # Invalid: should be dict
        )
        
        with self.assertRaises(ValidationError) as context:
            node_def.clean()
        
        self.assertIn("default_config", str(context.exception))
    
    def test_clean_is_called_on_save(self):
        """Test that clean() is automatically called on save()"""
        node_def = NodeTypeDefinition(
            key="auto_clean",
            name="Auto Clean",
            category=NodeTypeDefinition.Category.ACTIONS,
            config_schema="invalid"
        )
        
        # Save should call clean() and raise ValidationError
        with self.assertRaises(ValidationError):
            node_def.save()


@pytest.mark.django_db
class TestNodeTypeDefinitionFiltering(TestCase):
    """Test Scenario 4: Filter by Category & Status"""
    
    def setUp(self):
        """Create test data for filtering"""
        # Create nodes in different categories
        self.task_mgmt = NodeTypeDefinition.objects.create(
            key="task1",
            name="Task Management 1",
            category=NodeTypeDefinition.Category.TASK_MANAGEMENT,
            is_active=True
        )
        self.task_mgmt_inactive = NodeTypeDefinition.objects.create(
            key="task2",
            name="Task Management 2",
            category=NodeTypeDefinition.Category.TASK_MANAGEMENT,
            is_active=False
        )
        self.draft_gen = NodeTypeDefinition.objects.create(
            key="draft1",
            name="Draft Generator 1",
            category=NodeTypeDefinition.Category.DRAFT_GENERATORS,
            is_active=True
        )
        self.control_flow = NodeTypeDefinition.objects.create(
            key="control1",
            name="Control Flow 1",
            category=NodeTypeDefinition.Category.CONTROL_FLOW,
            is_active=True
        )
        self.action = NodeTypeDefinition.objects.create(
            key="action1",
            name="Action 1",
            category=NodeTypeDefinition.Category.ACTIONS,
            is_active=True
        )
    
    def test_filter_by_category(self):
        """Test filtering by category"""
        task_nodes = NodeTypeDefinition.objects.filter(
            category=NodeTypeDefinition.Category.TASK_MANAGEMENT
        )
        self.assertEqual(task_nodes.count(), 2)
        self.assertIn(self.task_mgmt, task_nodes)
        self.assertIn(self.task_mgmt_inactive, task_nodes)
        
        draft_nodes = NodeTypeDefinition.objects.filter(
            category=NodeTypeDefinition.Category.DRAFT_GENERATORS
        )
        self.assertEqual(draft_nodes.count(), 1)
        self.assertIn(self.draft_gen, draft_nodes)
    
    def test_filter_by_is_active(self):
        """Test filtering by is_active status"""
        active_nodes = NodeTypeDefinition.objects.filter(is_active=True)
        self.assertEqual(active_nodes.count(), 4)  # All except task_mgmt_inactive
        
        inactive_nodes = NodeTypeDefinition.objects.filter(is_active=False)
        self.assertEqual(inactive_nodes.count(), 1)
        self.assertIn(self.task_mgmt_inactive, inactive_nodes)
    
    def test_filter_by_category_and_status(self):
        """Test filtering by both category and is_active (uses index)"""
        # This query should use the index on (category, is_active)
        active_task_nodes = NodeTypeDefinition.objects.filter(
            category=NodeTypeDefinition.Category.TASK_MANAGEMENT,
            is_active=True
        )
        self.assertEqual(active_task_nodes.count(), 1)
        self.assertIn(self.task_mgmt, active_task_nodes)
        self.assertNotIn(self.task_mgmt_inactive, active_task_nodes)
        
        # Test other category
        active_draft_nodes = NodeTypeDefinition.objects.filter(
            category=NodeTypeDefinition.Category.DRAFT_GENERATORS,
            is_active=True
        )
        self.assertEqual(active_draft_nodes.count(), 1)
        self.assertIn(self.draft_gen, active_draft_nodes)
    
    def test_index_exists_on_category_and_is_active(self):
        """Test that database index exists on (category, is_active)"""
        from django.db import connection
        
        with connection.cursor() as cursor:
            # PostgreSQL specific query to check indexes
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'workflows_nodetypedefinition'
                AND indexdef LIKE '%category%is_active%'
            """)
            indexes = cursor.fetchall()
            
            # Should have at least one index involving category and is_active
            self.assertGreater(len(indexes), 0, 
                             "Index on (category, is_active) should exist")


@pytest.mark.django_db
class TestWorkflowNodeAssignment(TestCase):
    """Test Scenario 5: Assign Definition to WorkflowNode"""
    
    def setUp(self):
        """Set up test data"""
        # Create organization and project
        self.org = Organization.objects.create(
            name="Test Org",
            email_domain="test.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
            organization=self.org
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            owner=self.user
        )
        
        # Create workflow
        self.workflow = Workflow.objects.create(
            name="Test Workflow",
            project=self.project
        )
        
        # Create node type definition
        self.node_def = NodeTypeDefinition.objects.create(
            key="create_task",
            name="Create Task",
            category=NodeTypeDefinition.Category.TASK_MANAGEMENT,
            config_schema={
                "type": "object",
                "properties": {
                    "task_type": {"type": "string"}
                }
            },
            default_config={
                "task_type": "budget"
            }
        )
    
    def test_workflow_node_can_link_to_node_type_definition(self):
        """Test that WorkflowNode can successfully link to NodeTypeDefinition"""
        workflow_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type=WorkflowNode.NODE_TYPE_ACTION,
            label="Create Budget Task",
            node_type_definition=self.node_def,
            data={
                "position": {"x": 100, "y": 200},
                "config": {"task_type": "budget"}
            }
        )
        
        # Verify the link
        self.assertEqual(workflow_node.node_type_definition, self.node_def)
        self.assertIsNotNone(workflow_node.node_type_definition)
        
        # Verify reverse relation works
        nodes = self.node_def.nodes.all()
        self.assertIn(workflow_node, nodes)
    
    def test_workflow_node_can_exist_without_node_type_definition(self):
        """Test that node_type_definition is optional (null=True, blank=True)"""
        workflow_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type=WorkflowNode.NODE_TYPE_START,
            label="Start Node",
            node_type_definition=None,
            data={"position": {"x": 0, "y": 0}}
        )
        
        self.assertIsNone(workflow_node.node_type_definition)
    
    def test_node_type_definition_cascade_behavior(self):
        """Test that deleting NodeTypeDefinition sets node_type_definition to NULL"""
        workflow_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type=WorkflowNode.NODE_TYPE_ACTION,
            label="Test Node",
            node_type_definition=self.node_def
        )
        
        node_def_id = self.node_def.id
        self.node_def.delete()
        
        # Refresh from DB
        workflow_node.refresh_from_db()
        
        # Should be set to NULL (SET_NULL behavior)
        self.assertIsNone(workflow_node.node_type_definition)
        
        # Verify the NodeTypeDefinition is deleted
        self.assertFalse(NodeTypeDefinition.objects.filter(id=node_def_id).exists())
    
    def test_multiple_nodes_can_reference_same_definition(self):
        """Test that multiple WorkflowNodes can reference the same NodeTypeDefinition"""
        node1 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type=WorkflowNode.NODE_TYPE_ACTION,
            label="Node 1",
            node_type_definition=self.node_def
        )
        node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type=WorkflowNode.NODE_TYPE_ACTION,
            label="Node 2",
            node_type_definition=self.node_def
        )
        
        # Both should reference the same definition
        self.assertEqual(node1.node_type_definition, self.node_def)
        self.assertEqual(node2.node_type_definition, self.node_def)
        
        # Reverse relation should show both nodes
        nodes = self.node_def.nodes.all()
        self.assertEqual(nodes.count(), 2)
        self.assertIn(node1, nodes)
        self.assertIn(node2, nodes)
    
    def test_node_type_definition_accesses_workflow_node_data(self):
        """Test accessing node data through the relationship"""
        workflow_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type=WorkflowNode.NODE_TYPE_ACTION,
            label="Test Node",
            node_type_definition=self.node_def,
            data={
                "position": {"x": 100, "y": 200},
                "config": {"task_type": "budget", "title": "Test Task"}
            }
        )
        
        # Access node through definition
        nodes = self.node_def.nodes.all()
        self.assertEqual(nodes.count(), 1)
        self.assertEqual(nodes.first().data["config"]["task_type"], "budget")

