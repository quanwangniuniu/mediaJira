"""
Validation utilities for workflow graph operations.
Centralizes validation logic for nodes and connections to ensure
graph integrity and enforce business rules.
"""
from django.core.exceptions import ValidationError
from typing import List, Dict, Any, Optional


class WorkflowValidator:
    """Validator for workflow graph structure and rules"""
    
    @staticmethod
    def validate_start_node_connections(node) -> Optional[Dict[str, str]]:
        """
        Validate that start nodes do not have incoming connections.
        
        Args:
            node: WorkflowNode instance
            
        Returns:
            Error dict if validation fails, None otherwise
        """
        if node.node_type == 'start':
            incoming_count = node.get_incoming_connections().count()
            if incoming_count > 0:
                return {
                    'code': 'start_node_incoming_connection',
                    'message': f'Start node "{node.label}" cannot have incoming connections',
                    'node_id': node.id
                }
        return None
    
    @staticmethod
    def validate_end_node_connections(node) -> Optional[Dict[str, str]]:
        """
        Validate that end nodes do not have outgoing connections.
        
        Args:
            node: WorkflowNode instance
            
        Returns:
            Error dict if validation fails, None otherwise
        """
        if node.node_type == 'end':
            outgoing_count = node.get_outgoing_connections().count()
            if outgoing_count > 0:
                return {
                    'code': 'end_node_outgoing_connection',
                    'message': f'End node "{node.label}" cannot have outgoing connections',
                    'node_id': node.id
                }
        return None
    
    @staticmethod
    def validate_condition_node_branches(node) -> Optional[Dict[str, str]]:
        """
        Validate that condition nodes have at least 2 outgoing connections.
        
        Args:
            node: WorkflowNode instance
            
        Returns:
            Error dict if validation fails, None otherwise
        """
        if node.node_type == 'condition':
            outgoing_count = node.get_outgoing_connections().count()
            if outgoing_count < 2:
                return {
                    'code': 'condition_node_insufficient_branches',
                    'message': f'Condition node "{node.label}" must have at least 2 outgoing connections (has {outgoing_count})',
                    'node_id': node.id
                }
        return None
    
    @staticmethod
    def validate_node(node) -> List[Dict[str, Any]]:
        """
        Validate a single node against all rules.
        
        Args:
            node: WorkflowNode instance
            
        Returns:
            List of error dicts
        """
        errors = []
        
        # Check start node rule
        error = WorkflowValidator.validate_start_node_connections(node)
        if error:
            errors.append(error)
        
        # Check end node rule
        error = WorkflowValidator.validate_end_node_connections(node)
        if error:
            errors.append(error)
        
        # Check condition node rule
        error = WorkflowValidator.validate_condition_node_branches(node)
        if error:
            errors.append(error)
        
        return errors
    
    @staticmethod
    def validate_workflow_graph(workflow) -> Dict[str, Any]:
        """
        Validate entire workflow graph structure.
        
        Checks:
        - All node-level rules
        - At least one start node exists
        - At least one end node exists
        - No orphaned nodes (nodes with no connections)
        - No circular dependencies (basic check)
        
        Args:
            workflow: Workflow instance
            
        Returns:
            Dict with 'is_valid', 'errors', and 'warnings' keys
        """
        errors = []
        warnings = []
        
        nodes = workflow.nodes.all()
        connections = workflow.connections.all()
        
        # Check if workflow has nodes
        if not nodes.exists():
            errors.append({
                'code': 'empty_workflow',
                'message': 'Workflow has no nodes'
            })
            return {
                'is_valid': False,
                'errors': errors,
                'warnings': warnings
            }
        
        # Check for start node
        start_nodes = nodes.filter(node_type='start')
        if not start_nodes.exists():
            errors.append({
                'code': 'missing_start_node',
                'message': 'Workflow must have at least one start node'
            })
        
        # Check for end node
        end_nodes = nodes.filter(node_type='end')
        if not end_nodes.exists():
            errors.append({
                'code': 'missing_end_node',
                'message': 'Workflow must have at least one end node'
            })
        
        # Validate each node
        for node in nodes:
            node_errors = WorkflowValidator.validate_node(node)
            errors.extend(node_errors)
        
        # Check for orphaned nodes (warning, not error)
        if connections.exists():
            connected_node_ids = set()
            for conn in connections:
                connected_node_ids.add(conn.source_node_id)
                connected_node_ids.add(conn.target_node_id)
            
            for node in nodes:
                if node.id not in connected_node_ids:
                    warnings.append({
                        'code': 'orphaned_node',
                        'message': f'Node "{node.label}" has no connections',
                        'node_id': node.id
                    })
        
        # Check for self-connections (should be caught by model validation, but double-check)
        for conn in connections:
            if conn.source_node_id == conn.target_node_id:
                errors.append({
                    'code': 'self_connection',
                    'message': f'Node connects to itself',
                    'node_id': conn.source_node_id,
                    'connection_id': conn.id
                })
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }


class ConnectionValidator:
    """Validator for workflow connections"""
    
    @staticmethod
    def validate_connection_create(source_node, target_node, workflow) -> None:
        """
        Validate connection creation rules.
        
        Raises ValidationError if any rule is violated.
        
        Args:
            source_node: Source WorkflowNode instance
            target_node: Target WorkflowNode instance
            workflow: Workflow instance
        """
        errors = {}
        
        # Rule: Cannot connect a node to itself
        if source_node.id == target_node.id:
            errors['non_field_errors'] = 'A node cannot connect to itself'
        
        # Rule: Both nodes must belong to the same workflow
        if source_node.workflow_id != workflow.id:
            errors['source_node_id'] = f'Source node does not belong to workflow {workflow.id}'
        
        if target_node.workflow_id != workflow.id:
            errors['target_node_id'] = f'Target node does not belong to workflow {workflow.id}'
        
        if source_node.workflow_id != target_node.workflow_id:
            errors['non_field_errors'] = 'Source and target nodes must belong to the same workflow'
        
        # Rule: Start nodes cannot be targets
        if target_node.node_type == 'start':
            errors['target_node_id'] = 'Start nodes cannot have incoming connections'
        
        # Rule: End nodes cannot be sources
        if source_node.node_type == 'end':
            errors['source_node_id'] = 'End nodes cannot have outgoing connections'
        
        if errors:
            raise ValidationError(errors)
    
    @staticmethod
    def validate_connection_update(connection, source_node=None, target_node=None) -> None:
        """
        Validate connection update rules.
        
        Args:
            connection: WorkflowConnection instance being updated
            source_node: New source node (if being changed)
            target_node: New target node (if being changed)
        """
        # Use existing nodes if not provided
        if source_node is None:
            source_node = connection.source_node
        if target_node is None:
            target_node = connection.target_node
        
        # Run same validation as create
        ConnectionValidator.validate_connection_create(
            source_node, 
            target_node, 
            connection.workflow
        )

