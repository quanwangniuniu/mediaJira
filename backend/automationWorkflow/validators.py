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
        Validate that START nodes do not have incoming connections.
        START nodes are entry points in the workflow.

        Args:
            node: WorkflowNode instance

        Returns:
            Error dict if validation fails, None otherwise
        """
        if node.node_type == "start":
            incoming_count = node.get_incoming_connections().count()
            if incoming_count > 0:
                return {
                    "code": "start_node_incoming_connection",
                    "message": f'START node cannot have incoming connections. It is the entry point of the workflow.',
                    "node_id": node.id,
                }
        return None

    @staticmethod
    def validate_done_node_connections(node) -> Optional[Dict[str, str]]:
        """
        Validate that done nodes do not have outgoing connections.
        Done nodes are terminal statuses in the workflow.

        Args:
            node: WorkflowNode instance

        Returns:
            Error dict if validation fails, None otherwise
        """
        if node.node_type == "done":
            outgoing_count = node.get_outgoing_connections().count()
            if outgoing_count > 0:
                return {
                    "code": "done_node_outgoing_connection",
                    "message": f'Done node "{node.label}" cannot have outgoing connections. Done is a terminal status.',
                    "node_id": node.id,
                }
        return None

    @staticmethod
    def detect_circular_dependencies(workflow) -> List[Dict[str, Any]]:
        """
        Detect circular dependencies in workflow graph using DFS.

        Only checks non-loop connections, as loop connections are intentional
        and have max_iterations limits to prevent infinite loops.

        Args:
            workflow: Workflow instance

        Returns:
            List of error dicts describing detected cycles
        """
        from automationWorkflow.models import WorkflowConnection

        errors: List[Dict[str, Any]] = []
        connections = workflow.connections.exclude(
            connection_type=WorkflowConnection.CONNECTION_TYPE_LOOP
        )

        if not connections.exists():
            return errors

        graph: Dict[int, List[int]] = {}
        node_ids = set()

        for conn in connections:
            source_id = conn.source_node_id
            target_id = conn.target_node_id
            node_ids.add(source_id)
            node_ids.add(target_id)

            if source_id not in graph:
                graph[source_id] = []
            graph[source_id].append(target_id)

        for node_id in node_ids:
            if node_id not in graph:
                graph[node_id] = []

        color: Dict[int, int] = {node_id: 0 for node_id in node_ids}
        path: List[int] = []

        def find_cycle(node_id: int) -> Optional[List[int]]:
            if color[node_id] == 2:
                return None
            if color[node_id] == 1:
                cycle_start = path.index(node_id)
                cycle = path[cycle_start:] + [node_id]
                return cycle

            color[node_id] = 1
            path.append(node_id)

            for neighbor_id in graph.get(node_id, []):
                cycle = find_cycle(neighbor_id)
                if cycle:
                    return cycle

            color[node_id] = 2
            path.pop()
            return None

        for node_id in node_ids:
            if color[node_id] == 0:
                path = []
                cycle = find_cycle(node_id)
                if cycle:
                    node_id_to_label = {}
                    for node in workflow.nodes.filter(id__in=cycle):
                        node_id_to_label[node.id] = node.label

                    cycle_labels = [node_id_to_label.get(nid, f"Node {nid}") for nid in cycle]
                    cycle_path_str = " -> ".join(cycle_labels)

                    errors.append(
                        {
                            "code": "circular_dependency",
                            "message": f"Circular dependency detected: {cycle_path_str}",
                            "cycle_node_ids": cycle,
                        }
                    )

                    for nid in cycle:
                        color[nid] = 2

        return errors

    @staticmethod
    def validate_node(node) -> List[Dict[str, Any]]:
        """
        Validate a single node against all rules.
        """
        errors: List[Dict[str, Any]] = []

        # Validate START nodes cannot have incoming connections
        error = WorkflowValidator.validate_start_node_connections(node)
        if error:
            errors.append(error)

        # Validate done nodes cannot have outgoing connections
        error = WorkflowValidator.validate_done_node_connections(node)
        if error:
            errors.append(error)

        return errors

    @staticmethod
    def validate_workflow_graph(workflow) -> Dict[str, Any]:
        """
        Validate entire workflow graph structure.
        """
        errors: List[Dict[str, Any]] = []
        warnings: List[Dict[str, Any]] = []

        nodes = workflow.nodes.all()
        connections = workflow.connections.all()

        if not nodes.exists():
            errors.append(
                {"code": "empty_workflow", "message": "Workflow has no nodes"}
            )
            return {"is_valid": False, "errors": errors, "warnings": warnings}

        # Validate that workflow has exactly one START node
        start_nodes = nodes.filter(node_type="start")
        start_count = start_nodes.count()
        
        if start_count == 0:
            errors.append(
                {
                    "code": "missing_start_node",
                    "message": "Workflow must have exactly one START node",
                }
            )
        elif start_count > 1:
            errors.append(
                {
                    "code": "multiple_start_nodes",
                    "message": f"Workflow has {start_count} START nodes, but must have exactly one",
                }
            )

        # Validate individual nodes
        for node in nodes:
            node_errors = WorkflowValidator.validate_node(node)
            errors.extend(node_errors)

        # Check for orphaned nodes (nodes with no connections)
        # Exclude START node from orphan check if it has no connections (allowed at creation)
        if connections.exists():
            connected_node_ids = set()
            for conn in connections:
                connected_node_ids.add(conn.source_node_id)
                connected_node_ids.add(conn.target_node_id)

            for node in nodes:
                if node.id not in connected_node_ids and node.node_type != "start":
                    warnings.append(
                        {
                            "code": "orphaned_node",
                            "message": f'Node "{node.label}" has no connections',
                            "node_id": node.id,
                        }
                    )

        # Check for self-connections
        for conn in connections:
            if conn.source_node_id == conn.target_node_id:
                errors.append(
                    {
                        "code": "self_connection",
                        "message": "Node connects to itself",
                        "node_id": conn.source_node_id,
                        "connection_id": conn.id,
                    }
                )

        # Detect circular dependencies
        circular_deps = WorkflowValidator.detect_circular_dependencies(workflow)
        errors.extend(circular_deps)

        return {"is_valid": len(errors) == 0, "errors": errors, "warnings": warnings}


class ConnectionValidator:
    """Validator for workflow connections"""

    @staticmethod
    def validate_connection_create(source_node, target_node, workflow) -> None:
        """
        Validate connection creation rules.
        """
        errors: Dict[str, Any] = {}

        # Rule 1: Node cannot connect to itself
        if source_node.id == target_node.id:
            errors["non_field_errors"] = "A node cannot connect to itself"

        # Rule 2: Nodes must belong to the workflow
        if source_node.workflow_id != workflow.id:
            errors["source_node_id"] = f"Source node does not belong to workflow {workflow.id}"

        if target_node.workflow_id != workflow.id:
            errors["target_node_id"] = f"Target node does not belong to workflow {workflow.id}"

        if source_node.workflow_id != target_node.workflow_id:
            errors["non_field_errors"] = "Source and target nodes must belong to the same workflow"

        # Rule 3: Done nodes cannot have outgoing connections (terminal status)
        if source_node.node_type == "done":
            errors["source_node_id"] = "Done nodes cannot have outgoing connections. Done is a terminal status."
        
        # Rule 4: START node cannot be target (no incoming connections)
        if target_node.node_type == "start":
            errors["target_node_id"] = "START node cannot have incoming connections. It is the entry point of the workflow."

        if errors:
            raise ValidationError(errors)

    @staticmethod
    def validate_connection_update(connection, source_node=None, target_node=None) -> None:
        """
        Validate connection update rules.
        """
        if source_node is None:
            source_node = connection.source_node
        if target_node is None:
            target_node = connection.target_node

        ConnectionValidator.validate_connection_create(source_node, target_node, connection.workflow)
