from django.utils import timezone
from .models import Experiment
from optimization.serializers import validate_campaign_id


class ExperimentService:
    """Service layer for experiment-related operations"""
    
    @staticmethod
    def check_experiment_exists(experiment_id):
        """
        Check if experiment exists by ID
        
        Args:
            experiment_id (int): The experiment ID
            
        Returns:
            experiment: Experiment instance or None if not found
        """
        try:
            experiment = Experiment.objects.get(id=experiment_id)
            return experiment
        except Experiment.DoesNotExist:
            return None
    
    @staticmethod
    def validate_experiment_status_transition(current_status, new_status):
        """
        Validate experiment status transition business rules
        
        Args:
            current_status (str): Current experiment status
            new_status (str): New experiment status
            
        Returns:
            tuple: (is_valid, error_message) where is_valid is bool and error_message is str or None
        """
        # Define valid status transitions
        valid_transitions = {
            Experiment.ExperimentStatus.DRAFT: [
                Experiment.ExperimentStatus.RUNNING,
                Experiment.ExperimentStatus.CANCELLED,
            ],
            Experiment.ExperimentStatus.RUNNING: [
                Experiment.ExperimentStatus.PAUSED,
                Experiment.ExperimentStatus.COMPLETED,
                Experiment.ExperimentStatus.CANCELLED,
            ],
            Experiment.ExperimentStatus.PAUSED: [
                Experiment.ExperimentStatus.RUNNING,
                Experiment.ExperimentStatus.COMPLETED,
                Experiment.ExperimentStatus.CANCELLED,
            ],
            Experiment.ExperimentStatus.COMPLETED: [
                # No valid transitions from completed
            ],
            Experiment.ExperimentStatus.CANCELLED: [
                # No valid transitions from cancelled
            ],
        }
        
        # If status is the same, it's valid (no change)
        if current_status == new_status:
            return True, None
        
        # Check if transition is valid
        allowed_transitions = valid_transitions.get(current_status, [])
        if new_status not in allowed_transitions:
            return False, f"Cannot change status from '{current_status}' to '{new_status}'. Valid transitions from '{current_status}' are: {', '.join(allowed_transitions) if allowed_transitions else 'none'}"
        
        return True, None
    
    @staticmethod
    def start_experiment(experiment):
        """
        Mark experiment as started by setting started_at timestamp
        
        Args:
            experiment: Experiment instance
            
        Returns:
            tuple: (success, error_message) where success is bool and error_message is str or None
        """
        if experiment.status != Experiment.ExperimentStatus.RUNNING:
            return False, "Can only start experiments with status 'running'"
        
        if experiment.started_at:
            return False, "Experiment has already been started"
        
        experiment.started_at = timezone.now()
        experiment.save(update_fields=['started_at'])
        
        return True, None
    
    @staticmethod
    def validate_experiment_outcome(experiment, outcome, notes):
        """
        Validate that experiment outcome can be set
        
        Args:
            experiment: Experiment instance
            outcome: Outcome value to set
            notes: Outcome notes
            
        Returns:
            tuple: (is_valid, error_message) where is_valid is bool and error_message is str or None
        """
        if experiment.status != Experiment.ExperimentStatus.COMPLETED:
            return False, "Experiment outcome can only be set when status is completed"
        
        if outcome and not notes:
            # Notes are recommended but not strictly required
            pass
        
        return True, None
    
    @staticmethod
    def validate_control_variant_groups(control_group, variant_group):
        """
        Validate control and variant group structures
        
        Args:
            control_group: Control group dict
            variant_group: Variant group dict
            
        Returns:
            tuple: (is_valid, error_message) where is_valid is bool and error_message is str or None
        """
        valid_keys = ['campaigns', 'ad_set_ids', 'ad_ids']
        
        # Validate control_group
        if control_group is not None:
            if not isinstance(control_group, dict):
                return False, "Control group must be a dictionary"
            
            if not any(key in control_group for key in valid_keys):
                return False, "Control group should contain at least one of: campaigns, ad_set_ids, ad_ids"
            
            # Validate IDs format
            for key in valid_keys:
                if key in control_group:
                    ids = control_group[key]
                    if not isinstance(ids, list):
                        return False, f"Control group {key} must be a list"
                    
                    for item_id in ids:
                        if not validate_campaign_id(item_id):
                            return False, f"Invalid ID format in control_group {key}: {item_id}"
        
        # Validate variant_group
        if variant_group is not None:
            if not isinstance(variant_group, dict):
                return False, "Variant group must be a dictionary"
            
            if not any(key in variant_group for key in valid_keys):
                return False, "Variant group should contain at least one of: campaigns, ad_set_ids, ad_ids"
            
            # Validate IDs format
            for key in valid_keys:
                if key in variant_group:
                    ids = variant_group[key]
                    if not isinstance(ids, list):
                        return False, f"Variant group {key} must be a list"
                    
                    for item_id in ids:
                        if not validate_campaign_id(item_id):
                            return False, f"Invalid ID format in variant_group {key}: {item_id}"
        
        return True, None
    
    @staticmethod
    def validate_campaign_ids(ids_list):
        """
        Validate list of campaign/ad set/ad IDs format
        
        Args:
            ids_list: List of ID strings
            
        Returns:
            tuple: (is_valid, error_message) where is_valid is bool and error_message is str or None
        """
        if not isinstance(ids_list, list):
            return False, "IDs must be a list"
        
        for item_id in ids_list:
            if not validate_campaign_id(item_id):
                return False, f"Invalid ID format: {item_id}. Must be in format 'platform:id'"
        
        return True, None

