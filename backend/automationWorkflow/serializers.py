"""
Serializers for Workflow, WorkflowNode, and WorkflowConnection models.
Handles data validation, transformation, and nested relationships.
"""
from rest_framework import serializers
from automationWorkflow.models import Workflow, WorkflowNode, WorkflowConnection, NodeTypeDefinition
from automationWorkflow.validators import ConnectionValidator
from core.models import Project
from django.core.exceptions import ValidationError as DjangoValidationError


class WorkflowSerializer(serializers.ModelSerializer):
    """Serializer for Workflow model"""

    project_id = serializers.IntegerField(required=False, allow_null=True)
    organization_id = serializers.IntegerField(read_only=True)
    created_by_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Workflow
        fields = [
            "id",
            "name",
            "description",
            "project_id",
            "organization_id",
            "created_by_id",
            "status",
            "version",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = [
            "id",
            "organization_id",
            "created_by_id",
            "version",
            "created_at",
            "updated_at",
            "is_deleted",
        ]

    def validate_project_id(self, value):
        """
        Validate that project exists and belongs to the same organization
        as the requesting user (if provided).
        """
        if value is not None:
            request = self.context.get("request")
            qs = Project.objects.filter(id=value, is_deleted=False)
            if not qs.exists():
                raise serializers.ValidationError(f"Project with id {value} does not exist")
            if request and request.user and request.user.is_authenticated:
                project = qs.select_related("organization").first()
                user_org_id = request.user.organization_id
                if user_org_id and project.organization_id != user_org_id:
                    raise serializers.ValidationError(
                        "Project must belong to the same organization as the creator."
                    )
        return value

    def create(self, validated_data):
        """
        Create workflow with organization / project / creator relationship.
        """
        request = self.context.get("request")
        project_id = validated_data.pop("project_id", None)
        project = None

        if project_id is not None:
            project = Project.objects.filter(id=project_id, is_deleted=False).select_related(
                "organization"
            ).first()

        organization = None
        if project is not None:
            organization = project.organization
        elif request and request.user and request.user.is_authenticated:
            organization = request.user.organization

        if project is not None:
            validated_data["project"] = project
        if organization is not None:
            validated_data["organization"] = organization
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Update workflow with project relationship.
        """
        request = self.context.get("request")
        project_id = validated_data.pop("project_id", None)

        if project_id is not None:
            project = Project.objects.filter(id=project_id, is_deleted=False).select_related(
                "organization"
            ).first()
            if not project:
                raise serializers.ValidationError(
                    {"project_id": f"Project with id {project_id} does not exist"}
                )

            target_org_id = project.organization_id
            current_org_id = instance.organization_id

            if current_org_id and target_org_id != current_org_id:
                raise serializers.ValidationError(
                    {
                        "project_id": "Project must belong to the same organization as the workflow."
                    }
                )

            if (
                not current_org_id
                and request
                and request.user
                and request.user.is_authenticated
                and request.user.organization_id
                and target_org_id != request.user.organization_id
            ):
                raise serializers.ValidationError(
                    {"project_id": "Project must belong to the same organization as the user."}
                )

            validated_data["project"] = project

        validated_data.pop("organization", None)
        validated_data.pop("created_by", None)

        return super().update(instance, validated_data)


class WorkflowNodeSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowNode model"""

    workflow_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkflowNode
        fields = [
            "id",
            "workflow_id",
            "node_type",
            "label",
            "data",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "workflow_id", "created_at", "updated_at", "is_deleted"]

    def validate_node_type(self, value):
        """Validate node type against allowed choices"""
        valid_types = [choice[0] for choice in WorkflowNode.NODE_TYPE_CHOICES]
        if value not in valid_types:
            raise serializers.ValidationError(
                f'Invalid node type "{value}". Must be one of: {", ".join(valid_types)}'
            )
        return value

    def validate_data(self, value):
        """Validate that data is a dictionary"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Node data must be a dictionary/object")
        return value

    def validate(self, attrs):
        """Additional validation for node creation"""
        if self.instance:
            node = self.instance
            for attr, value in attrs.items():
                setattr(node, attr, value)
            try:
                node.clean()
            except DjangoValidationError as e:
                raise serializers.ValidationError(e.message_dict)

        return attrs


class WorkflowNodeCreateSerializer(WorkflowNodeSerializer):
    """Serializer for creating workflow nodes"""

    class Meta(WorkflowNodeSerializer.Meta):
        fields = [
            "id",
            "node_type",
            "label",
            "data",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_deleted"]


class WorkflowConnectionSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowConnection model"""

    workflow_id = serializers.IntegerField(read_only=True)
    source_node_id = serializers.IntegerField(required=False, allow_null=False)
    target_node_id = serializers.IntegerField(required=False, allow_null=False)

    class Meta:
        model = WorkflowConnection
        fields = [
            "id",
            "workflow_id",
            "source_node_id",
            "target_node_id",
            "connection_type",
            "condition_config",
            "priority",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "workflow_id", "created_at", "updated_at", "is_deleted"]

    def validate_connection_type(self, value):
        """Validate connection type against allowed choices"""
        valid_types = [choice[0] for choice in WorkflowConnection.CONNECTION_TYPE_CHOICES]
        if value not in valid_types:
            raise serializers.ValidationError(
                f'Invalid connection type "{value}". Must be one of: {", ".join(valid_types)}'
            )
        return value

    def validate_condition_config(self, value):
        """Validate condition_config structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Condition configuration must be a dictionary")
        return value

    def validate(self, attrs):
        """Validate connection rules"""
        workflow = self.context.get("workflow")
        if not workflow:
            raise serializers.ValidationError("Workflow context is required")

        if self.instance:
            source_node_id = attrs.get("source_node_id", self.instance.source_node_id)
            target_node_id = attrs.get("target_node_id", self.instance.target_node_id)
            connection_type = attrs.get("connection_type", self.instance.connection_type)
            condition_config = attrs.get("condition_config", self.instance.condition_config)
        else:
            source_node_id = attrs.get("source_node_id")
            target_node_id = attrs.get("target_node_id")
            connection_type = attrs.get("connection_type", "sequential")
            condition_config = attrs.get("condition_config", {})

        try:
            source_node = WorkflowNode.objects.get(
                id=source_node_id,
                workflow=workflow,
                is_deleted=False,
            )
        except WorkflowNode.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "source_node_id": f"Node with id {source_node_id} does not exist in this workflow"
                }
            )

        try:
            target_node = WorkflowNode.objects.get(
                id=target_node_id,
                workflow=workflow,
                is_deleted=False,
            )
        except WorkflowNode.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "target_node_id": f"Node with id {target_node_id} does not exist in this workflow"
                }
            )

        try:
            ConnectionValidator.validate_connection_create(source_node, target_node, workflow)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict)

        if connection_type == WorkflowConnection.CONNECTION_TYPE_CONDITIONAL:
            if not condition_config:
                raise serializers.ValidationError(
                    {"condition_config": "Conditional connections require condition_config"}
                )

        if connection_type == WorkflowConnection.CONNECTION_TYPE_LOOP:
            if not condition_config:
                raise serializers.ValidationError(
                    {"condition_config": "Loop connections require condition_config"}
                )

            max_iterations = condition_config.get("max_iterations")
            if max_iterations is None:
                raise serializers.ValidationError(
                    {"condition_config": "Loop connections must specify max_iterations"}
                )

            if not isinstance(max_iterations, int) or max_iterations < 1 or max_iterations > 1000:
                raise serializers.ValidationError(
                    {
                        "condition_config": "max_iterations must be an integer between 1 and 1000"
                    }
                )

        return attrs


class WorkflowConnectionCreateSerializer(WorkflowConnectionSerializer):
    """Serializer for creating workflow connections"""

    class Meta(WorkflowConnectionSerializer.Meta):
        fields = [
            "id",
            "source_node_id",
            "target_node_id",
            "connection_type",
            "condition_config",
            "priority",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_deleted"]


class WorkflowGraphSerializer(serializers.Serializer):
    """Serializer for complete workflow graph (workflow + nodes + connections)"""

    workflow = WorkflowSerializer(read_only=True)
    nodes = WorkflowNodeSerializer(many=True, read_only=True)
    connections = WorkflowConnectionSerializer(many=True, read_only=True)


class BatchNodeOperationSerializer(serializers.Serializer):
    """Serializer for batch node operations"""

    create = WorkflowNodeCreateSerializer(many=True, required=False)
    update = serializers.ListSerializer(child=serializers.DictField(), required=False)
    delete = serializers.ListSerializer(child=serializers.IntegerField(), required=False)

    def validate_update(self, value):
        """Validate update operations have id field"""
        for item in value:
            if "id" not in item:
                raise serializers.ValidationError('Each update item must have an "id" field')
        return value


class BatchConnectionOperationSerializer(serializers.Serializer):
    """Serializer for batch connection operations"""

    create = serializers.ListSerializer(child=serializers.DictField(), required=False)
    update = serializers.ListSerializer(child=serializers.DictField(), required=False)
    delete = serializers.ListSerializer(child=serializers.IntegerField(), required=False)

    def validate_update(self, value):
        """Validate update operations have id field"""
        for item in value:
            if "id" not in item:
                raise serializers.ValidationError('Each update item must have an "id" field')
        return value


class NodeTypeDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for NodeTypeDefinition model with icon URL and color code"""
    
    icon_url = serializers.SerializerMethodField()
    color_code = serializers.CharField(source='color', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = NodeTypeDefinition
        fields = [
            "id",
            "key",
            "name",
            "category",
            "category_display",
            "description",
            "icon",
            "icon_url",
            "color",
            "color_code",
            "input_schema",
            "output_schema",
            "config_schema",
            "default_config",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "icon_url",
            "color_code",
            "category_display",
        ]
    
    def get_icon_url(self, obj):
        """
        Generate icon URL from icon name.
        If icon is a URL, return it as-is. Otherwise, construct path to icon asset.
        """
        if not obj.icon:
            return None
        
        # If icon is already a full URL, return it
        if obj.icon.startswith(('http://', 'https://')):
            return obj.icon
        
        # Otherwise, construct path to static icon asset
        # Frontend can map icon names to actual icon components/assets
        request = self.context.get('request')
        if request:
            base_url = request.build_absolute_uri('/')[:-1]  # Remove trailing slash
            return f"{base_url}/static/icons/{obj.icon}.svg"
        
        # Fallback if no request context
        return f"/static/icons/{obj.icon}.svg"
    
    def validate_category(self, value):
        """Validate category against allowed choices"""
        valid_categories = [choice[0] for choice in NodeTypeDefinition.Category.choices]
        if value not in valid_categories:
            raise serializers.ValidationError(
                f'Invalid category "{value}". Must be one of: {", ".join(valid_categories)}'
            )
        return value
    
    def validate_input_schema(self, value):
        """Validate that input_schema is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Input schema must be a JSON object (dict)")
        return value
    
    def validate_output_schema(self, value):
        """Validate that output_schema is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Output schema must be a JSON object (dict)")
        return value
    
    def validate_config_schema(self, value):
        """Validate that config_schema is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Config schema must be a JSON object (dict)")
        return value
    
    def validate_default_config(self, value):
        """Validate that default_config is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Default config must be a JSON object (dict)")
        return value

