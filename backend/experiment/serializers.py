from rest_framework import serializers
from .models import Experiment, ExperimentProgressUpdate
from optimization.serializers import validate_campaign_id




class ExperimentProgressUpdateSerializer(serializers.ModelSerializer):
    """Serializer for ExperimentProgressUpdate model"""
    experiment = serializers.PrimaryKeyRelatedField(required=False, queryset=Experiment.objects.all())
    
    class Meta:
        model = ExperimentProgressUpdate
        fields = [
            'id',
            'experiment',
            'update_date',
            'notes',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class ExperimentSerializer(serializers.ModelSerializer):
    """Serializer for Experiment model"""
    
    progress_updates = ExperimentProgressUpdateSerializer(many=True, read_only=True)
    
    class Meta:
        model = Experiment
        fields = [
            'id',
            'name',
            'hypothesis',
            'expected_outcome',
            'description',
            'control_group',
            'variant_group',
            'success_metric',
            'constraints',
            'start_date',
            'end_date',
            'started_at',
            'status',
            'experiment_outcome',
            'outcome_notes',
            'task',
            'created_by',
            'created_at',
            'updated_at',
            'progress_updates',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'progress_updates']
    
    def validate_control_group(self, value):
        """Validate control_group JSON structure"""
        if value is None:
            return value
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("Control group must be a dictionary")
        
        valid_keys = ['campaigns', 'ad_set_ids', 'ad_ids']
        # Validate structure - empty dict should fail
        if not any(key in value for key in valid_keys):
            raise serializers.ValidationError(
                "Control group should contain at least one of: campaigns, ad_set_ids, ad_ids"
            )
        
        # Validate IDs format
        for key in valid_keys:
            if key in value:
                ids = value[key]
                if not isinstance(ids, list):
                    raise serializers.ValidationError(f"{key} must be a list")
                
                for item_id in ids:
                    if not validate_campaign_id(item_id):
                        raise serializers.ValidationError(
                            f"Invalid ID format in {key}: {item_id}. "
                            "Must be in format 'platform:id' where platform is non-empty and id is numeric"
                        )
        
        return value
    
    def validate_variant_group(self, value):
        """Validate variant_group JSON structure"""
        if value is None:
            return value
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("Variant group must be a dictionary")
        
        valid_keys = ['campaigns', 'ad_set_ids', 'ad_ids']
        # Validate structure - empty dict should fail
        if not any(key in value for key in valid_keys):
            raise serializers.ValidationError(
                "Variant group should contain at least one of: campaigns, ad_set_ids, ad_ids"
            )
        
        # Validate IDs format
        for key in valid_keys:
            if key in value:
                ids = value[key]
                if not isinstance(ids, list):
                    raise serializers.ValidationError(f"{key} must be a list")
                
                for item_id in ids:
                    if not validate_campaign_id(item_id):
                        raise serializers.ValidationError(
                            f"Invalid ID format in {key}: {item_id}. "
                            "Must be in format 'platform:id' where platform is non-empty and id is numeric"
                        )
        
        return value
    
    def validate(self, data):
        """Validate experiment data"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        started_at = data.get('started_at')
        experiment_outcome = data.get('experiment_outcome')
        status = data.get('status')
        task = data.get('task')
        
        # For updates, get existing values if not provided
        if self.instance:
            if start_date is None:
                start_date = self.instance.start_date
            if end_date is None:
                end_date = self.instance.end_date
            if status is None:
                status = self.instance.status
        
        # Validate date range
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        # Validate started_at is not before start_date
        if started_at and start_date:
            # Handle both datetime objects and strings
            if isinstance(started_at, str):
                from django.utils.dateparse import parse_datetime
                started_at_dt = parse_datetime(started_at)
                if started_at_dt:
                    started_at_date = started_at_dt.date()
                else:
                    # If parsing fails, skip validation (will be caught by field validation)
                    started_at_date = None
            else:
                started_at_date = started_at.date() if hasattr(started_at, 'date') else None
            
            if started_at_date and started_at_date < start_date:
                raise serializers.ValidationError({
                    'started_at': 'Started at date cannot be before start_date.'
                })
        
        # Validate experiment_outcome can only be set when status=COMPLETED
        if experiment_outcome is not None:
            # For updates, check the instance status if status is not being updated
            # For creates, status must be provided and be COMPLETED
            current_status = status
            if self.instance and status is None:
                current_status = self.instance.status
            
            if current_status != Experiment.ExperimentStatus.COMPLETED:
                raise serializers.ValidationError({
                    'experiment_outcome': 'Experiment outcome can only be set when status is completed'
                })
        
        # Validate task.type='experiment' if task is provided
        if task:
            # task may be a Task object (from field validation) or an ID
            from task.models import Task
            if isinstance(task, Task):
                task_obj = task
            else:
                # task is an ID, need to get the actual Task object
                try:
                    task_obj = Task.objects.get(id=task)
                except Task.DoesNotExist:
                    raise serializers.ValidationError({
                        'task': 'Task not found'
                    })
            
            if task_obj.type != 'experiment':
                raise serializers.ValidationError({
                    'task': 'Task type must be "experiment" to link to an experiment'
                })
        
        return data

