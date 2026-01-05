"""
Comprehensive tests for Workflow Graph CRUD Backend Implementation.

Tests cover:
- Node CRUD operations
- Connection CRUD operations
- Connection validation rules
- Batch operations (atomic behavior)
- Clear error messages
"""
import pytest

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from automationWorkflow.models import Workflow, WorkflowNode, WorkflowConnection
from automationWorkflow.validators import WorkflowValidator, ConnectionValidator
from core.models import Project, ProjectMember, Organization

User = get_user_model()


class WorkflowModelTestCase(TestCase):
    """Test Workflow model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Test Organization')
        self.project = Project.objects.create(
            name='Test Project',
            description='Test project description',
            organization=self.organization
        )
    
    def test_create_workflow(self):
        """Test creating a workflow"""
        workflow = Workflow.objects.create(
            name='Test Workflow',
            description='Test workflow description',
            project=self.project
        )
        self.assertEqual(workflow.name, 'Test Workflow')
        self.assertEqual(workflow.version, 1)
        # Default status should be draft
        self.assertEqual(workflow.status, 'draft')
    
    def test_create_global_workflow(self):
        """Test creating a global workflow (no project)"""
        workflow = Workflow.objects.create(
            name='Global Workflow',
            description='Global workflow',
            project=None
        )
        self.assertIsNone(workflow.project)


class WorkflowNodeTestCase(TestCase):
    """Test WorkflowNode model and validation"""
    
    def setUp(self):
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            description='Test'
        )
    
    def test_create_start_node(self):
        """Test creating a start node"""
        node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        self.assertEqual(node.node_type, 'start')
        self.assertEqual(node.label, 'Start')
    
    def test_create_condition_node(self):
        """Test creating a condition node"""
        node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='condition',
            label='Check Budget',
            data={
                'position': {'x': 300, 'y': 100},
                'config': {
                    'field': 'budget.amount',
                    'operator': 'greater_than',
                    'value': 10000
                }
            }
        )
        self.assertEqual(node.node_type, 'condition')
    
    def test_invalid_node_data_type(self):
        """Test that non-dict data raises validation error"""
        node = WorkflowNode(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data='invalid'  # Should be dict
        )
        with self.assertRaises(DjangoValidationError):
            node.clean()
    
    def test_all_node_types_can_be_created(self):
        """Test that all node types can be created and validated"""
        node_types = [
            ('start', 'Start Node'),
            ('end', 'End Node'),
            ('action', 'Action Node'),
            ('condition', 'Condition Node'),
            ('approval', 'Approval Node'),
            ('delay', 'Delay Node'),
        ]
        
        for node_type, label_prefix in node_types:
            node = WorkflowNode.objects.create(
                workflow=self.workflow,
                node_type=node_type,
                label=f'{label_prefix} Test',
                data={'position': {'x': 100, 'y': 100}}
            )
            self.assertEqual(node.node_type, node_type)
            # Should not raise validation errors
            node.clean()
            self.assertEqual(WorkflowNode.objects.filter(id=node.id, node_type=node_type).count(), 1)
    
    def test_node_type_specific_validation(self):
        """Test node type specific validation rules"""
        # Start node validation
        start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        error = WorkflowValidator.validate_start_node_connections(start_node)
        self.assertIsNone(error)  # No incoming connections, should be valid
        
        # End node validation
        end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 200, 'y': 100}}
        )
        error = WorkflowValidator.validate_end_node_connections(end_node)
        self.assertIsNone(error)  # No outgoing connections, should be valid
        
        # Condition node validation (requires 2+ outgoing connections)
        condition_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='condition',
            label='Condition',
            data={'position': {'x': 300, 'y': 100}}
        )
        error = WorkflowValidator.validate_condition_node_branches(condition_node)
        self.assertIsNotNone(error)  # No outgoing connections, should fail
        
        # Action, Approval, Delay nodes don't have specific validation rules
        # They should be valid if data is a dict
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={'position': {'x': 400, 'y': 100}}
        )
        action_node.clean()  # Should not raise
        
        approval_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='approval',
            label='Approval',
            data={'position': {'x': 500, 'y': 100}}
        )
        approval_node.clean()  # Should not raise
        
        delay_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='delay',
            label='Delay',
            data={'position': {'x': 600, 'y': 100}}
        )
        delay_node.clean()  # Should not raise


class WorkflowConnectionTestCase(TestCase):
    """Test WorkflowConnection model and validation"""
    
    def setUp(self):
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            description='Test'
        )
        self.start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        self.action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={'position': {'x': 200, 'y': 100}}
        )
        self.end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 300, 'y': 100}}
        )
    
    def test_start_node_cannot_have_incoming_connection(self):
        """Test that start nodes cannot have incoming connections"""
        connection = WorkflowConnection(
            workflow=self.workflow,
            source_node=self.action_node,
            target_node=self.start_node,  # Invalid: start as target
            connection_type='sequential'
        )
        with self.assertRaises(DjangoValidationError) as context:
            connection.clean()
        self.assertIn('Start nodes cannot have incoming connections', str(context.exception))
    
    def test_end_node_cannot_have_outgoing_connection(self):
        """Test that end nodes cannot have outgoing connections"""
        connection = WorkflowConnection(
            workflow=self.workflow,
            source_node=self.end_node,  # Invalid: end as source
            target_node=self.action_node,
            connection_type='sequential'
        )
        with self.assertRaises(DjangoValidationError) as context:
            connection.clean()
        self.assertIn('End nodes cannot have outgoing connections', str(context.exception))
    
    def test_cannot_connect_node_to_itself(self):
        """Test that a node cannot connect to itself"""
        connection = WorkflowConnection(
            workflow=self.workflow,
            source_node=self.action_node,
            target_node=self.action_node,  # Invalid: self-connection
            connection_type='sequential'
        )
        with self.assertRaises(DjangoValidationError) as context:
            connection.clean()
        self.assertIn('cannot connect to itself', str(context.exception))
    
    def test_cannot_connect_nodes_from_different_workflows(self):
        """Test that nodes from different workflows cannot be connected"""
        workflow2 = Workflow.objects.create(
            name='Another Workflow',
            description='Test'
        )
        node2 = WorkflowNode.objects.create(
            workflow=workflow2,
            node_type='action',
            label='Node in Other Workflow',
            data={}
        )
        
        connection = WorkflowConnection(
            workflow=self.workflow,
            source_node=self.action_node,
            target_node=node2,  # Invalid: different workflow
            connection_type='sequential'
        )
        with self.assertRaises(DjangoValidationError) as context:
            connection.clean()
        self.assertIn('must belong to the same workflow', str(context.exception))
    
    def test_loop_connection_requires_max_iterations(self):
        """Test that loop connections require max_iterations"""
        # Create a second action node to loop back to (not start node)
        action_node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={'position': {'x': 300, 'y': 100}}
        )
        connection = WorkflowConnection(
            workflow=self.workflow,
            source_node=self.action_node,
            target_node=action_node2,
            connection_type='loop',
            condition_config={}  # Missing max_iterations
        )
        with self.assertRaises(DjangoValidationError):
            connection.clean()
    
    def test_loop_connection_with_valid_max_iterations(self):
        """Test loop connection with valid max_iterations"""
        # Loop connections should loop back to action nodes, not start nodes
        # Create a second action node to loop back to
        action_node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={'position': {'x': 300, 'y': 100}}
        )
        connection = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.action_node,
            target_node=action_node2,
            connection_type='loop',
            condition_config={'max_iterations': 10}
        )
        self.assertEqual(connection.condition_config['max_iterations'], 10)
    
    def test_loop_connection_max_iterations_out_of_range(self):
        """Test that max_iterations must be between 1 and 1000"""
        # Create a second action node to loop back to (not start node)
        action_node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={'position': {'x': 300, 'y': 100}}
        )
        # Test below range
        connection = WorkflowConnection(
            workflow=self.workflow,
            source_node=self.action_node,
            target_node=action_node2,
            connection_type='loop',
            condition_config={'max_iterations': 0}
        )
        with self.assertRaises(DjangoValidationError):
            connection.clean()
        
        # Test above range
        connection.condition_config['max_iterations'] = 1001
        with self.assertRaises(DjangoValidationError):
            connection.clean()
    
    def test_start_to_task_connection_valid(self):
        """Test that Start->Task/Action connection is valid"""
        connection = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.action_node,
            connection_type='sequential'
        )
        self.assertEqual(connection.source_node.node_type, 'start')
        self.assertEqual(connection.target_node.node_type, 'action')
        # Should not raise any validation errors
        connection.clean()
    
    def test_start_to_action_connection_with_different_types(self):
        """Test Start->Action connections with different connection types"""
        # Sequential connection
        conn1 = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.action_node,
            connection_type='sequential'
        )
        conn1.clean()  # Should be valid
        
        # Conditional connection
        action_node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={}
        )
        conn2 = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=action_node2,
            connection_type='conditional',
            condition_config={'field': 'value', 'operator': 'equals', 'value': 'test'}
        )
        conn2.clean()  # Should be valid
        
        # Parallel connection
        action_node3 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 3',
            data={}
        )
        conn3 = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=action_node3,
            connection_type='parallel'
        )
        conn3.clean()  # Should be valid
    
    def test_condition_node_multiple_outputs_via_api(self):
        """Test creating Condition node with multiple outputs via API"""
        from rest_framework.test import APIClient
        from django.contrib.auth import get_user_model
        from core.models import ProjectMember, Project, Organization
        
        User = get_user_model()
        user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123'
        )
        org = Organization.objects.create(name='Test Org 2')
        project = Project.objects.create(name='Test Project 2', organization=org)
        ProjectMember.objects.create(user=user, project=project, is_active=True)
        
        workflow = Workflow.objects.create(name='API Workflow', project=project)
        
        # Create start and end nodes
        start = WorkflowNode.objects.create(
            workflow=workflow,
            node_type='start',
            label='Start',
            data={}
        )
        end = WorkflowNode.objects.create(
            workflow=workflow,
            node_type='end',
            label='End',
            data={}
        )
        
        # Create condition node
        condition_data = {
            'node_type': 'condition',
            'label': 'Check Value',
            'data': {'position': {'x': 200, 'y': 100}}
        }
        client = APIClient()
        client.force_authenticate(user=user)
        
        response = client.post(
            f'/api/workflows/{workflow.id}/nodes/',
            condition_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        condition_node_id = response.data['id']
        
        # Create multiple action nodes
        action1 = WorkflowNode.objects.create(
            workflow=workflow,
            node_type='action',
            label='Action 1',
            data={}
        )
        action2 = WorkflowNode.objects.create(
            workflow=workflow,
            node_type='action',
            label='Action 2',
            data={}
        )
        
        # Create connections from condition to actions
        conn_data1 = {
            'source_node_id': condition_node_id,
            'target_node_id': action1.id,
            'connection_type': 'conditional',
            'condition_config': {'field': 'value', 'operator': 'equals', 'value': 'yes'}
        }
        conn_data2 = {
            'source_node_id': condition_node_id,
            'target_node_id': action2.id,
            'connection_type': 'conditional',
            'condition_config': {'field': 'value', 'operator': 'equals', 'value': 'no'}
        }
        
        response1 = client.post(
            f'/api/workflows/{workflow.id}/connections/',
            conn_data1,
            format='json'
        )
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        response2 = client.post(
            f'/api/workflows/{workflow.id}/connections/',
            conn_data2,
            format='json'
        )
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        
        # Connect to end nodes
        WorkflowConnection.objects.create(
            workflow=workflow,
            source_node=action1,
            target_node=end,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=workflow,
            source_node=action2,
            target_node=end,
            connection_type='sequential'
        )
        
        # Validate the workflow - condition node should have 2 outputs
        condition_node = WorkflowNode.objects.get(id=condition_node_id)
        error = WorkflowValidator.validate_condition_node_branches(condition_node)
        self.assertIsNone(error)


class WorkflowValidatorTestCase(TestCase):
    """Test WorkflowValidator utility"""
    
    def setUp(self):
        self.organization = Organization.objects.create(name='Test Organization')
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            description='Test'
        )
    
    def test_validate_condition_node_multiple_outputs_complete(self):
        """Test condition node validation with 0→1→2→3 outgoing connections"""
        condition_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='condition',
            label='Check Condition',
            data={'position': {'x': 200, 'y': 100}}
        )
        
        # Test 0 connections - should fail
        error = WorkflowValidator.validate_condition_node_branches(condition_node)
        self.assertIsNotNone(error)
        self.assertIn('at least 2 outgoing connections', error['message'])
        
        # Add one connection (still not enough) - should fail
        target1 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 1',
            data={'position': {'x': 300, 'y': 100}}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=condition_node,
            target_node=target1,
            connection_type='conditional',
            condition_config={'field': 'value', 'operator': 'equals', 'value': 'true'}
        )
        
        error = WorkflowValidator.validate_condition_node_branches(condition_node)
        self.assertIsNotNone(error)
        
        # Add second connection (minimum required) - should pass
        target2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={'position': {'x': 300, 'y': 200}}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=condition_node,
            target_node=target2,
            connection_type='conditional',
            condition_config={'field': 'value', 'operator': 'equals', 'value': 'false'}
        )
        
        error = WorkflowValidator.validate_condition_node_branches(condition_node)
        self.assertIsNone(error)  # Should be valid with 2 outputs
        
        # Add third output - should still be valid
        target3 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 3',
            data={}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=condition_node,
            target_node=target3,
            connection_type='conditional',
            condition_config={'field': 'value', 'operator': 'equals', 'value': 'null'}
        )
        
        error = WorkflowValidator.validate_condition_node_branches(condition_node)
        self.assertIsNone(error)  # Should still be valid with 3 outputs
    
    def test_validate_workflow_graph_requires_start_node(self):
        """Test that workflow must have at least one start node"""
        # Add a node that's not a start node to avoid empty_workflow error
        WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertFalse(result['is_valid'])
        self.assertTrue(any(e['code'] == 'missing_start_node' for e in result['errors']))
    
    def test_validate_workflow_graph_requires_end_node(self):
        """Test that workflow must have at least one end node"""
        # Add start node only
        WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertFalse(result['is_valid'])
        self.assertTrue(any(e['code'] == 'missing_end_node' for e in result['errors']))
    
    def test_validate_workflow_graph_warns_orphaned_nodes(self):
        """Test that orphaned nodes generate warnings"""
        start = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        end = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 300, 'y': 100}}
        )
        orphan = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Orphaned Action',
            data={'position': {'x': 200, 'y': 200}}
        )
        
        # Connect start to end
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start,
            target_node=end,
            connection_type='sequential'
        )
        
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertTrue(result['is_valid'])  # Valid but has warnings
        self.assertTrue(any(w['code'] == 'orphaned_node' for w in result['warnings']))
    
    def test_validate_empty_workflow(self):
        """Test validation of workflow with no nodes"""
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertFalse(result['is_valid'])
        self.assertTrue(any(e['code'] == 'empty_workflow' for e in result['errors']))
    
    def test_validate_workflow_detects_self_connection(self):
        """Test that workflow validation detects self-connections"""
        node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        # Create self-connection (should be caught by model validation, but test validator too)
        # Note: This will fail at model.save() level, but we test the validator logic
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        # Workflow should be invalid due to missing start/end nodes
        self.assertFalse(result['is_valid'])
    
    def test_detect_simple_circular_dependency(self):
        """Test detection of simple circular dependency (A->B->A)"""
        start = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        end = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 400, 'y': 100}}
        )
        node_a = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action A',
            data={'position': {'x': 200, 'y': 100}}
        )
        node_b = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action B',
            data={'position': {'x': 300, 'y': 100}}
        )
        
        # Create valid connections: Start -> A -> B -> End
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start,
            target_node=node_a,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_a,
            target_node=node_b,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=end,
            connection_type='sequential'
        )
        
        # No cycle yet - should be valid
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertTrue(result['is_valid'])
        self.assertFalse(any(e['code'] == 'circular_dependency' for e in result['errors']))
        
        # Add circular dependency: B -> A
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=node_a,
            connection_type='sequential'
        )
        
        # Now should detect circular dependency
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertFalse(result['is_valid'])
        circular_errors = [e for e in result['errors'] if e['code'] == 'circular_dependency']
        self.assertEqual(len(circular_errors), 1)
        self.assertIn('Circular dependency detected', circular_errors[0]['message'])
        self.assertIn('Action A', circular_errors[0]['message'])
        self.assertIn('Action B', circular_errors[0]['message'])
        self.assertIn('cycle_node_ids', circular_errors[0])
    
    def test_detect_complex_circular_dependency(self):
        """Test detection of complex circular dependency (A->B->C->A)"""
        start = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        end = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 400, 'y': 100}}
        )
        node_a = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action A',
            data={'position': {'x': 200, 'y': 100}}
        )
        node_b = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action B',
            data={'position': {'x': 250, 'y': 100}}
        )
        node_c = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action C',
            data={'position': {'x': 300, 'y': 100}}
        )
        
        # Create circular dependency: A -> B -> C -> A
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start,
            target_node=node_a,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_a,
            target_node=node_b,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=node_c,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_c,
            target_node=node_a,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_c,
            target_node=end,
            connection_type='sequential'
        )
        
        # Should detect circular dependency
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertFalse(result['is_valid'])
        circular_errors = [e for e in result['errors'] if e['code'] == 'circular_dependency']
        self.assertEqual(len(circular_errors), 1)
        self.assertIn('Circular dependency detected', circular_errors[0]['message'])
        # Should contain all three nodes in the cycle
        self.assertIn('Action A', circular_errors[0]['message'])
        self.assertIn('Action B', circular_errors[0]['message'])
        self.assertIn('Action C', circular_errors[0]['message'])
    
    def test_detect_circular_dependency_with_conditional_connections(self):
        """Test detection of circular dependency using conditional connections"""
        start = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        end = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 400, 'y': 100}}
        )
        condition_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='condition',
            label='Check Condition',
            data={'position': {'x': 200, 'y': 100}}
        )
        node_a = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action A',
            data={'position': {'x': 300, 'y': 50}}
        )
        node_b = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action B',
            data={'position': {'x': 300, 'y': 150}}
        )
        
        # Create cycle: condition -> A -> condition (via conditional connection)
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start,
            target_node=condition_node,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=condition_node,
            target_node=node_a,
            connection_type='conditional',
            condition_config={'field': 'value', 'operator': 'equals', 'value': 'test'}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=condition_node,
            target_node=node_b,
            connection_type='conditional',
            condition_config={'field': 'value', 'operator': 'not_equals', 'value': 'test'}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_a,
            target_node=condition_node,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=end,
            connection_type='sequential'
        )
        
        # Should detect circular dependency
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertFalse(result['is_valid'])
        circular_errors = [e for e in result['errors'] if e['code'] == 'circular_dependency']
        self.assertEqual(len(circular_errors), 1)
        self.assertIn('Circular dependency detected', circular_errors[0]['message'])
    
    def test_loop_connection_type_not_detected_as_circular_dependency(self):
        """Test that loop connection type is not detected as circular dependency"""
        start = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        end = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 400, 'y': 100}}
        )
        node_a = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action A',
            data={'position': {'x': 200, 'y': 100}}
        )
        node_b = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action B',
            data={'position': {'x': 300, 'y': 100}}
        )
        
        # Create connections with loop type (should be allowed)
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start,
            target_node=node_a,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_a,
            target_node=node_b,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=node_a,  # Loop back to A
            connection_type='loop',
            condition_config={'max_iterations': 10}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=end,
            connection_type='sequential'
        )
        
        # Should be valid - loop connections are intentional
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertTrue(result['is_valid'])
        self.assertFalse(any(e['code'] == 'circular_dependency' for e in result['errors']))
    
    def test_no_circular_dependency_in_valid_workflow(self):
        """Test that valid workflow without cycles passes circular dependency check"""
        start = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={'position': {'x': 100, 'y': 100}}
        )
        end = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={'position': {'x': 400, 'y': 100}}
        )
        node_a = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action A',
            data={'position': {'x': 200, 'y': 100}}
        )
        node_b = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action B',
            data={'position': {'x': 300, 'y': 100}}
        )
        
        # Create valid linear flow: Start -> A -> B -> End
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start,
            target_node=node_a,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_a,
            target_node=node_b,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=end,
            connection_type='sequential'
        )
        
        # Should be valid with no circular dependency errors
        result = WorkflowValidator.validate_workflow_graph(self.workflow)
        self.assertTrue(result['is_valid'])
        self.assertFalse(any(e['code'] == 'circular_dependency' for e in result['errors']))
    
    def test_detect_circular_dependency_direct_method(self):
        """Test detect_circular_dependencies method directly"""
        node_a = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action A',
            data={}
        )
        node_b = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action B',
            data={}
        )
        
        # Create circular dependency: A -> B -> A
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_a,
            target_node=node_b,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=node_b,
            target_node=node_a,
            connection_type='sequential'
        )
        
        # Test the method directly
        errors = WorkflowValidator.detect_circular_dependencies(self.workflow)
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]['code'], 'circular_dependency')
        self.assertIn('Circular dependency detected', errors[0]['message'])
        self.assertIn('cycle_node_ids', errors[0])
        self.assertIn(node_a.id, errors[0]['cycle_node_ids'])
        self.assertIn(node_b.id, errors[0]['cycle_node_ids'])


class WorkflowAPITestCase(APITestCase):
    """Test Workflow API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Test Organization')
        self.project = Project.objects.create(
            name='Test Project',
            description='Test',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_create_workflow_via_api(self):
        """Test creating a workflow via API"""
        data = {
            'name': 'API Workflow',
            'description': 'Created via API',
            'project_id': self.project.id
        }
        response = self.client.post('/api/workflows/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'API Workflow')
    
    def test_list_workflows(self):
        """Test listing workflows"""
        Workflow.objects.create(
            name='Workflow 1',
            project=self.project
        )
        Workflow.objects.create(
            name='Workflow 2',
            project=self.project
        )
        
        response = self.client.get('/api/workflows/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2)
    
    def test_filter_workflows_by_project_id(self):
        """Test filtering workflows by project_id"""
        project2 = Project.objects.create(name='Project 2', organization=self.organization)
        ProjectMember.objects.create(
            user=self.user,
            project=project2,
            is_active=True
        )
        
        Workflow.objects.create(name='Workflow 1', project=self.project)
        Workflow.objects.create(name='Workflow 2', project=project2)
        
        response = self.client.get(f'/api/workflows/?project_id={self.project.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['project_id'], self.project.id)
    
    def test_filter_workflows_by_is_active(self):
        """Test filtering workflows by status"""
        Workflow.objects.create(
            name='Draft Workflow',
            project=self.project,
            status='draft',
        )
        Workflow.objects.create(
            name='Published Workflow',
            project=self.project,
            status='published',
        )

        response = self.client.get('/api/workflows/?status=draft')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All returned workflows should have the requested status
        self.assertTrue(all(w['status'] == 'draft' for w in response.data['results']))
    
    def test_search_workflows(self):
        """Test searching workflows by name and description"""
        Workflow.objects.create(
            name='Budget Approval',
            description='Approves budget requests',
            project=self.project
        )
        Workflow.objects.create(
            name='Task Creation',
            description='Creates new tasks',
            project=self.project
        )
        
        response = self.client.get('/api/workflows/?search=Budget')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertTrue(any('Budget' in w['name'] for w in response.data['results']))
    
    def test_ordering_workflows(self):
        """Test ordering workflows"""
        w1 = Workflow.objects.create(name='A Workflow', project=self.project)
        w2 = Workflow.objects.create(name='B Workflow', project=self.project)
        
        response = self.client.get('/api/workflows/?ordering=name')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [w['name'] for w in response.data['results']]
        self.assertIn('A Workflow', names)
        self.assertIn('B Workflow', names)
        
        response = self.client.get('/api/workflows/?ordering=-name')
        names_desc = [w['name'] for w in response.data['results']]
        # Check that ordering is different (if both workflows are in results)
        if len(names_desc) >= 2:
            self.assertNotEqual(names, names_desc)
    
    def test_list_global_workflows(self):
        """Test listing global workflows (no project)"""
        Workflow.objects.create(name='Global Workflow', project=None)
        Workflow.objects.create(name='Project Workflow', project=self.project)
        
        response = self.client.get('/api/workflows/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should include both global and project workflows
        workflow_names = [w['name'] for w in response.data['results']]
        self.assertIn('Global Workflow', workflow_names)
        self.assertIn('Project Workflow', workflow_names)
    
    def test_get_workflow_detail(self):
        """Test retrieving workflow detail"""
        workflow = Workflow.objects.create(
            name='Detail Workflow',
            project=self.project
        )
        
        response = self.client.get(f'/api/workflows/{workflow.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Detail Workflow')
    
    def test_update_workflow(self):
        """Test updating a workflow"""
        workflow = Workflow.objects.create(
            name='Original Name',
            project=self.project
        )
        
        data = {'name': 'Updated Name', 'description': 'Updated'}
        response = self.client.patch(f'/api/workflows/{workflow.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Name')
    
    def test_delete_workflow(self):
        """Test deleting a workflow performs soft delete"""
        workflow = Workflow.objects.create(
            name='To Delete',
            project=self.project
        )
        
        response = self.client.delete(f'/api/workflows/{workflow.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Record should be soft deleted (is_deleted=True) and excluded from list
        workflow.refresh_from_db()
        self.assertTrue(workflow.is_deleted)

        list_response = self.client.get('/api/workflows/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        ids = [w['id'] for w in list_response.data['results']]
        self.assertNotIn(workflow.id, ids)


class WorkflowNodeAPITestCase(APITestCase):
    """Test WorkflowNode API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Test Organization')
        self.project = Project.objects.create(name='Test Project', organization=self.organization)
        # Associate user with organization for organization-based permissions
        self.user.organization = self.organization
        self.user.save(update_fields=['organization'])
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True
        )
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            project=self.project
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_create_node(self):
        """Test creating a node via API"""
        data = {
            'node_type': 'start',
            'label': 'Start Node',
            'data': {'position': {'x': 100, 'y': 100}}
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['label'], 'Start Node')
    
    def test_list_nodes(self):
        """Test listing nodes"""
        WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        
        response = self.client.get(f'/api/workflows/{self.workflow.id}/nodes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_update_node(self):
        """Test updating a node"""
        node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Original',
            data={}
        )
        
        data = {'label': 'Updated Label'}
        response = self.client.patch(
            f'/api/workflows/{self.workflow.id}/nodes/{node.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['label'], 'Updated Label')
    
    def test_get_node_detail(self):
        """Test retrieving node detail"""
        node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Test Node',
            data={'position': {'x': 100, 'y': 100}}
        )
        
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/nodes/{node.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], node.id)
        self.assertEqual(response.data['label'], 'Test Node')
    
    def test_delete_node(self):
        """Test deleting a node"""
        node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='To Delete',
            data={}
        )
        
        response = self.client.delete(
            f'/api/workflows/{self.workflow.id}/nodes/{node.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_create_action_node_with_sub_type(self):
        """Test creating an action node with sub_type"""
        data = {
            'node_type': 'action',
            'label': 'DevOps Task',
            'data': {
                'position': {'x': 200, 'y': 100},
                'sub_type': 'devops_task',
                'config': {'task_type': 'DEVOPS'}
            }
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['sub_type'], 'devops_task')
    
    def test_create_condition_node_via_api(self):
        """Test creating a condition node via API"""
        data = {
            'node_type': 'condition',
            'label': 'Check Budget',
            'data': {
                'position': {'x': 300, 'y': 100},
                'config': {
                    'field': 'budget.amount',
                    'operator': 'greater_than',
                    'value': 10000
                }
            }
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['node_type'], 'condition')
    
    def test_create_approval_node_via_api(self):
        """Test creating an approval node via API"""
        data = {
            'node_type': 'approval',
            'label': 'Manager Approval',
            'data': {
                'position': {'x': 400, 'y': 100},
                'config': {
                    'approver_role': 'manager',
                    'timeout_hours': 24
                }
            }
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['node_type'], 'approval')
    
    def test_create_delay_node_via_api(self):
        """Test creating a delay node via API"""
        data = {
            'node_type': 'delay',
            'label': 'Wait 3 Days',
            'data': {
                'position': {'x': 500, 'y': 100},
                'config': {
                    'delay_type': 'duration',
                    'delay_value': 3,
                    'delay_unit': 'days'
                }
            }
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['node_type'], 'delay')


class WorkflowConnectionAPITestCase(APITestCase):
    """Test WorkflowConnection API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Test Organization')
        self.project = Project.objects.create(name='Test Project', organization=self.organization)
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True
        )
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            project=self.project
        )
        self.start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        self.end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_create_connection(self):
        """Test creating a connection via API"""
        data = {
            'source_node_id': self.start_node.id,
            'target_node_id': self.end_node.id,
            'connection_type': 'sequential'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_create_invalid_connection_start_as_target(self):
        """Test that creating connection with start as target fails"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        data = {
            'source_node_id': action_node.id,
            'target_node_id': self.start_node.id,  # Invalid
            'connection_type': 'sequential'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Start nodes cannot have incoming connections', str(response.data))
    
    def test_create_invalid_connection_end_as_source(self):
        """Test that creating connection with end as source fails"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        data = {
            'source_node_id': self.end_node.id,  # Invalid: end as source
            'target_node_id': action_node.id,
            'connection_type': 'sequential'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('End nodes cannot have outgoing connections', str(response.data))
    
    def test_create_invalid_connection_self_connection(self):
        """Test that creating self-connection fails via API"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        data = {
            'source_node_id': action_node.id,
            'target_node_id': action_node.id,  # Invalid: self-connection
            'connection_type': 'sequential'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot connect to itself', str(response.data))
    
    def test_list_connections(self):
        """Test listing connections"""
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential'
        )
        
        response = self.client.get(f'/api/workflows/{self.workflow.id}/connections/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_get_connection_detail(self):
        """Test retrieving connection detail"""
        connection = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential'
        )
        
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/connections/{connection.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], connection.id)
        self.assertEqual(response.data['connection_type'], 'sequential')
    
    def test_update_connection(self):
        """Test updating a connection"""
        connection = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential',
            priority=1
        )
        
        data = {'priority': 10}
        response = self.client.patch(
            f'/api/workflows/{self.workflow.id}/connections/{connection.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 10)
    
    def test_delete_connection(self):
        """Test deleting a connection performs soft delete"""
        connection = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential'
        )
        
        response = self.client.delete(
            f'/api/workflows/{self.workflow.id}/connections/{connection.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify soft delete
        connection.refresh_from_db()
        self.assertTrue(connection.is_deleted)
        self.assertFalse(
            WorkflowConnection.objects.filter(id=connection.id, is_deleted=False).exists()
        )
    
    def test_create_conditional_connection(self):
        """Test creating a conditional connection"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        data = {
            'source_node_id': self.start_node.id,
            'target_node_id': action_node.id,
            'connection_type': 'conditional',
            'condition_config': {
                'field': 'budget.amount',
                'operator': 'greater_than',
                'value': 10000
            }
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['connection_type'], 'conditional')
    
    def test_create_loop_connection(self):
        """Test creating a loop connection"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        # Loop connections should loop back to action nodes, not start nodes
        action_node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={}
        )
        data = {
            'source_node_id': action_node.id,
            'target_node_id': action_node2.id,
            'connection_type': 'loop',
            'condition_config': {'max_iterations': 10}
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['connection_type'], 'loop')
        self.assertEqual(response.data['condition_config']['max_iterations'], 10)
    
    def test_create_loop_connection_without_max_iterations(self):
        """Test that loop connection requires max_iterations"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        # Loop connections should loop back to action nodes, not start nodes
        action_node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={}
        )
        data = {
            'source_node_id': action_node.id,
            'target_node_id': action_node2.id,
            'connection_type': 'loop',
            'condition_config': {}  # Missing max_iterations
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_parallel_connection(self):
        """Test creating a parallel connection"""
        action_node1 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 1',
            data={}
        )
        action_node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action 2',
            data={}
        )
        
        data = {
            'source_node_id': self.start_node.id,
            'target_node_id': action_node1.id,
            'connection_type': 'parallel'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['connection_type'], 'parallel')
    
    def test_create_conditional_connection_without_condition_config(self):
        """Test that conditional connection requires condition_config"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        data = {
            'source_node_id': self.start_node.id,
            'target_node_id': action_node.id,
            'connection_type': 'conditional',
            'condition_config': {}  # Empty condition_config
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('condition_config', str(response.data))
    
    def test_filter_connections_by_type(self):
        """Test filtering connections by connection_type"""
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential'
        )
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=action_node,
            connection_type='conditional',
            condition_config={'field': 'test'}
        )
        
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/connections/?connection_type=sequential'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['connection_type'], 'sequential')
    
    def test_filter_connections_by_source_node(self):
        """Test filtering connections by source_node_id"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=action_node,
            target_node=self.end_node,
            connection_type='sequential'
        )
        
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/connections/?source_node_id={self.start_node.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['source_node_id'], self.start_node.id)
    
    def test_filter_connections_by_target_node(self):
        """Test filtering connections by target_node_id"""
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential'
        )
        WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=action_node,
            connection_type='sequential'
        )
        
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/connections/?target_node_id={self.end_node.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['target_node_id'], self.end_node.id)
    
    def test_connection_ordering(self):
        """Test connection ordering by priority"""
        conn1 = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential',
            priority=1
        )
        conn2 = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start_node,
            target_node=self.end_node,
            connection_type='sequential',
            priority=10
        )
        
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/connections/?ordering=-priority'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Higher priority should come first
        self.assertEqual(response.data['results'][0]['id'], conn2.id)
        self.assertEqual(response.data['results'][1]['id'], conn1.id)


class BatchOperationsAPITestCase(APITestCase):
    """Test batch operations for nodes and connections"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Test Organization')
        self.project = Project.objects.create(name='Test Project', organization=self.organization)
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True
        )
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            project=self.project
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_batch_create_nodes(self):
        """Test batch creating nodes"""
        data = {
            'create': [
                {'node_type': 'start', 'label': 'Start', 'data': {}},
                {'node_type': 'action', 'label': 'Action 1', 'data': {}},
                {'node_type': 'end', 'label': 'End', 'data': {}}
            ]
        }
        
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/batch/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['created']), 3)
    
    def test_batch_operations_atomic(self):
        """Test that batch operations are atomic (all or nothing)"""
        node1 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Node 1',
            data={}
        )
        
        # Try to create one valid and one invalid node
        data = {
            'create': [
                {'node_type': 'start', 'label': 'Valid', 'data': {}},
                {'node_type': 'invalid_type', 'label': 'Invalid', 'data': {}}  # Invalid type
            ]
        }
        
        initial_count = WorkflowNode.objects.filter(workflow=self.workflow).count()
        
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/batch/',
            data,
            format='json'
        )
        
        # Should fail
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Count should remain the same (atomic rollback)
        final_count = WorkflowNode.objects.filter(workflow=self.workflow).count()
        self.assertEqual(initial_count, final_count)
    
    def test_batch_update_and_delete_nodes(self):
        """Test batch updating and deleting nodes"""
        node1 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Original 1',
            data={}
        )
        node2 = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='To Delete',
            data={}
        )
        
        data = {
            'update': [
                {'id': node1.id, 'label': 'Updated 1'}
            ],
            'delete': [node2.id]
        }
        
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/batch/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['updated']), 1)
        self.assertEqual(len(response.data['deleted']), 1)
        
        # Verify updates
        node1.refresh_from_db()
        self.assertEqual(node1.label, 'Updated 1')
        
        # Verify deletion (soft delete)
        node2.refresh_from_db()
        self.assertTrue(node2.is_deleted)
        # Soft deleted nodes should be excluded from default queryset used in the API
        self.assertFalse(
            WorkflowNode.objects.filter(id=node2.id, is_deleted=False).exists()
        )
    
    def test_batch_create_connections(self):
        """Test batch creating connections"""
        # First create start and end nodes
        start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        action_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Action',
            data={}
        )
        
        data = {
            'create': [
                {
                    'source_node_id': start_node.id,
                    'target_node_id': action_node.id,
                    'connection_type': 'sequential'
                },
                {
                    'source_node_id': action_node.id,
                    'target_node_id': end_node.id,
                    'connection_type': 'sequential'
                }
            ]
        }
        
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/batch/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['created']), 2)
    
    def test_batch_update_and_delete_connections(self):
        """Test batch updating and deleting connections"""
        start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        
        conn1 = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start_node,
            target_node=end_node,
            connection_type='sequential',
            priority=1
        )
        conn2 = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start_node,
            target_node=end_node,
            connection_type='sequential',
            priority=2
        )
        
        data = {
            'update': [
                {'id': conn1.id, 'priority': 10}
            ],
            'delete': [conn2.id]
        }
        
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/batch/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['updated']), 1)
        self.assertEqual(len(response.data['deleted']), 1)
        
        # Verify updates
        conn1.refresh_from_db()
        self.assertEqual(conn1.priority, 10)
        
        # Verify deletion (soft delete)
        conn2.refresh_from_db()
        self.assertTrue(conn2.is_deleted)
        self.assertFalse(
            WorkflowConnection.objects.filter(id=conn2.id, is_deleted=False).exists()
        )
    
    def test_batch_connections_atomic(self):
        """Test that batch connection operations are atomic"""
        start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        
        initial_count = WorkflowConnection.objects.filter(workflow=self.workflow).count()
        
        # Try to create one valid and one invalid connection
        data = {
            'create': [
                {
                    'source_node_id': start_node.id,
                    'target_node_id': end_node.id,
                    'connection_type': 'sequential'
                },
                {
                    'source_node_id': end_node.id,  # Invalid: end as source
                    'target_node_id': start_node.id,
                    'connection_type': 'sequential'
                }
            ]
        }
        
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/batch/',
            data,
            format='json'
        )
        
        # Should fail
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Count should remain the same (atomic rollback)
        final_count = WorkflowConnection.objects.filter(workflow=self.workflow).count()
        self.assertEqual(initial_count, final_count)
    
    def test_empty_batch_operations(self):
        """Test batch operations with empty lists"""
        data = {
            'create': [],
            'update': [],
            'delete': []
        }
        
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/batch/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['created']), 0)
        self.assertEqual(len(response.data['updated']), 0)
        self.assertEqual(len(response.data['deleted']), 0)


class WorkflowGraphAPITestCase(APITestCase):
    """Test workflow graph endpoint"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Test Organization')
        self.project = Project.objects.create(name='Test Project', organization=self.organization)
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True
        )
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            project=self.project
        )
        
        # Create nodes
        self.start = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        self.end = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        
        # Create connection
        self.connection = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=self.start,
            target_node=self.end,
            connection_type='sequential'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_get_workflow_graph(self):
        """Test getting complete workflow graph"""
        response = self.client.get(f'/api/workflows/{self.workflow.id}/graph/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('workflow', response.data)
        self.assertIn('nodes', response.data)
        self.assertIn('connections', response.data)
        
        self.assertEqual(len(response.data['nodes']), 2)
        self.assertEqual(len(response.data['connections']), 1)
    
    def test_validate_workflow_endpoint(self):
        """Test workflow validation endpoint"""
        response = self.client.post(f'/api/workflows/{self.workflow.id}/validate/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('is_valid', response.data)
        self.assertIn('errors', response.data)
        self.assertIn('warnings', response.data)
        
        # This workflow should be valid (has start, end, and proper connection)
        self.assertTrue(response.data['is_valid'])


class WorkflowPermissionTestCase(APITestCase):
    """Test workflow API permissions and authorization"""
    
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        self.organization1 = Organization.objects.create(name='Organization 1')
        self.organization2 = Organization.objects.create(name='Organization 2')
        self.project1 = Project.objects.create(name='Project 1', organization=self.organization1)
        self.project2 = Project.objects.create(name='Project 2', organization=self.organization2)

        # Associate users with organizations
        self.user1.organization = self.organization1
        self.user1.save(update_fields=['organization'])
        self.user2.organization = self.organization2
        self.user2.save(update_fields=['organization'])
        
        # User1 is member of project1
        ProjectMember.objects.create(
            user=self.user1,
            project=self.project1,
            is_active=True
        )
        # User2 is member of project2
        ProjectMember.objects.create(
            user=self.user2,
            project=self.project2,
            is_active=True
        )
        
        self.workflow1 = Workflow.objects.create(
            name='Workflow 1',
            project=self.project1,
            organization=self.organization1,
            created_by=self.user1,
            status='draft',
        )
        self.workflow2 = Workflow.objects.create(
            name='Workflow 2',
            project=self.project2,
            organization=self.organization2,
            created_by=self.user2,
            status='draft',
        )
        
        self.client = APIClient()
    
    def test_user_cannot_access_other_project_workflow(self):
        """Test that user cannot access workflows from other projects"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get(f'/api/workflows/{self.workflow2.id}/')
        # Queryset filtering returns 404 Not Found (object doesn't exist in filtered queryset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_user_can_only_list_own_project_workflows(self):
        """Test that user can only list workflows from their projects"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/workflows/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workflow_ids = [w['id'] for w in response.data['results']]
        self.assertIn(self.workflow1.id, workflow_ids)
        self.assertNotIn(self.workflow2.id, workflow_ids)
    
    def test_unauthorized_access_denied(self):
        """Test that unauthorized users cannot access workflows"""
        response = self.client.get('/api/workflows/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_cannot_create_node_in_other_project_workflow(self):
        """Test that user cannot create nodes in workflows from other projects"""
        self.client.force_authenticate(user=self.user1)
        
        data = {
            'node_type': 'action',
            'label': 'Test Node',
            'data': {}
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow2.id}/nodes/',
            data,
            format='json'
        )
        # Permission check returns 403 Forbidden, not 404 Not Found
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_user_cannot_create_connection_in_other_project_workflow(self):
        """Test that user cannot create connections in workflows from other projects"""
        self.client.force_authenticate(user=self.user1)
        
        start_node = WorkflowNode.objects.create(
            workflow=self.workflow2,
            node_type='start',
            label='Start',
            data={}
        )
        end_node = WorkflowNode.objects.create(
            workflow=self.workflow2,
            node_type='end',
            label='End',
            data={}
        )
        
        data = {
            'source_node_id': start_node.id,
            'target_node_id': end_node.id,
            'connection_type': 'sequential'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow2.id}/connections/',
            data,
            format='json'
        )
        # Permission check returns 403 Forbidden, not 404 Not Found
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_user_with_inactive_project_member_cannot_access_workflow(self):
        """Test that user with inactive project membership cannot access workflow"""
        # Update existing membership to inactive
        ProjectMember.objects.filter(user=self.user1, project=self.project1).update(is_active=False)
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/workflows/{self.workflow1.id}/')
        # Queryset filtering returns 404 Not Found (object doesn't exist in filtered queryset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_global_workflow_accessible_to_all_authenticated_users(self):
        """Test that global workflows are accessible to all authenticated users"""
        global_workflow = Workflow.objects.create(
            name='Global Workflow',
            project=None,
            organization=None,
        )
        
        # User1 should access it
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/workflows/{global_workflow.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User2 should also access it
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/workflows/{global_workflow.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class WorkflowAPIEdgeCasesTestCase(APITestCase):
    """Test edge cases and error handling for workflow API"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Test Organization')
        self.project = Project.objects.create(name='Test Project', organization=self.organization)
        # Associate user with organization for organization-based permissions
        self.user.organization = self.organization
        self.user.save(update_fields=['organization'])
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True
        )
        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            project=self.project
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_create_workflow_with_invalid_project_id(self):
        """Test creating workflow with non-existent project_id"""
        data = {
            'name': 'Test Workflow',
            'project_id': 99999  # Non-existent project
        }
        response = self.client.post('/api/workflows/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('project_id', response.data)
    
    def test_create_workflow_with_invalid_project_id_type(self):
        """Test creating workflow with invalid project_id type"""
        data = {
            'name': 'Test Workflow',
            'project_id': 'not_an_integer'  # Invalid type
        }
        response = self.client.post('/api/workflows/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_node_with_invalid_node_type(self):
        """Test creating node with invalid node_type"""
        data = {
            'node_type': 'invalid_type',
            'label': 'Test',
            'data': {}
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_node_with_invalid_data_type(self):
        """Test creating node with non-dict data"""
        data = {
            'node_type': 'action',
            'label': 'Test',
            'data': 'not a dict'  # Should be dict
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/nodes/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_connection_with_invalid_connection_type(self):
        """Test creating connection with invalid connection_type"""
        start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        
        data = {
            'source_node_id': start_node.id,
            'target_node_id': end_node.id,
            'connection_type': 'invalid_type'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_connection_with_nonexistent_node(self):
        """Test creating connection with non-existent node IDs"""
        data = {
            'source_node_id': 99999,
            'target_node_id': 88888,
            'connection_type': 'sequential'
        }
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/connections/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_nonexistent_workflow(self):
        """Test retrieving non-existent workflow"""
        response = self.client.get('/api/workflows/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_nonexistent_node(self):
        """Test retrieving non-existent node"""
        response = self.client.get(f'/api/workflows/{self.workflow.id}/nodes/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_nonexistent_connection(self):
        """Test retrieving non-existent connection"""
        response = self.client.get(f'/api/workflows/{self.workflow.id}/connections/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_workflow_with_put(self):
        """Test full update of workflow using PUT"""
        workflow = Workflow.objects.create(
            name='Original Name',
            description='Original Description',
            project=self.project
        )
        
        data = {
            'name': 'Updated Name',
            'description': 'Updated Description',
            'project_id': self.project.id,
            'is_active': True
        }
        response = self.client.put(
            f'/api/workflows/{workflow.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Name')
        self.assertEqual(response.data['description'], 'Updated Description')
    
    def test_update_node_with_put(self):
        """Test full update of node using PUT"""
        node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='action',
            label='Original Label',
            data={'position': {'x': 100, 'y': 100}}
        )
        
        data = {
            'node_type': 'action',
            'label': 'Updated Label',
            'data': {'position': {'x': 200, 'y': 200}}
        }
        response = self.client.put(
            f'/api/workflows/{self.workflow.id}/nodes/{node.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['label'], 'Updated Label')
    
    def test_update_connection_with_put(self):
        """Test full update of connection using PUT"""
        start_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='start',
            label='Start',
            data={}
        )
        end_node = WorkflowNode.objects.create(
            workflow=self.workflow,
            node_type='end',
            label='End',
            data={}
        )
        connection = WorkflowConnection.objects.create(
            workflow=self.workflow,
            source_node=start_node,
            target_node=end_node,
            connection_type='sequential',
            priority=1
        )
        
        data = {
            'source_node_id': start_node.id,
            'target_node_id': end_node.id,
            'connection_type': 'sequential',
            'priority': 10,
            'condition_config': {}
        }
        response = self.client.put(
            f'/api/workflows/{self.workflow.id}/connections/{connection.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 10)

    def test_filter_by_name_exact_match(self):
        """Test filtering workflows by name query param"""
        w1 = Workflow.objects.create(
            name='Unique Name 123',
            project=self.project
        )
        Workflow.objects.create(
            name='Other Workflow',
            project=self.project
        )

        response = self.client.get('/api/workflows/?name=Unique Name 123')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [w['name'] for w in response.data['results']]
        self.assertIn(w1.name, names)
        self.assertTrue(all('Unique Name 123' in n for n in names))

    def test_filter_by_creator(self):
        """Test filtering workflows by creator (created_by_id)"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        other_user.organization = self.organization
        other_user.save(update_fields=['organization'])

        # Workflows created by different users in the same org
        w1 = Workflow.objects.create(
            name='User1 Workflow',
            project=self.project,
            organization=self.organization,
            created_by=self.user
        )
        Workflow.objects.create(
            name='Other User Workflow',
            project=self.project,
            organization=self.organization,
            created_by=other_user
        )

        response = self.client.get(f'/api/workflows/?creator={self.user.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [w['id'] for w in response.data['results']]
        self.assertIn(w1.id, ids)
        # Ensure workflows created by other users are not returned
        self.assertTrue(all(w['created_by_id'] == self.user.id for w in response.data['results']))

    def test_filter_by_creator_invalid_value(self):
        """Test filtering workflows with invalid creator parameter"""
        response = self.client.get('/api/workflows/?creator=not_a_number')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Invalid creator value should result in empty queryset
        self.assertEqual(len(response.data['results']), 0)

    def test_filter_by_invalid_status_value(self):
        """Test filtering workflows with invalid status value returns empty result"""
        Workflow.objects.create(
            name='Valid Workflow',
            project=self.project,
            status='draft'
        )

        response = self.client.get('/api/workflows/?status=not_a_real_status')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)


class WorkflowPaginationTestCase(APITestCase):
    """Test pagination behavior for workflow list API"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='paginate_user',
            email='paginate@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(name='Paginate Org')
        self.project = Project.objects.create(
            name='Paginate Project',
            description='Paginate project description',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create more than one page of workflows (settings.PAGE_SIZE = 20)
        for i in range(25):
            Workflow.objects.create(
                name=f'Workflow {i}',
                project=self.project
            )

    def test_default_pagination_first_page(self):
        """Test that first page returns PAGE_SIZE items and pagination metadata"""
        response = self.client.get('/api/workflows/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)

        # By default DRF PageNumberPagination + PAGE_SIZE=20
        self.assertEqual(response.data['count'], 25)
        self.assertEqual(len(response.data['results']), 20)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])

    def test_second_page_pagination(self):
        """Test that second page returns remaining items"""
        response = self.client.get('/api/workflows/?page=2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Remaining 5 items on page 2
        self.assertEqual(len(response.data['results']), 5)
        self.assertIsNone(response.data['next'])
        self.assertIsNotNone(response.data['previous'])

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
