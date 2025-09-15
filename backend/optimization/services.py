from .models import OptimizationExperiment, RollbackHistory


class ExperimentService:
    """Service layer for experiment-related operations"""
    
    @staticmethod
    def check_experiment_exists(experiment_id):
        """
        Check if experiment exists by ID
        
        Args:
            experiment_id (int): The experiment ID
            
        Returns:
            experiment: OptimizationExperiment instance or None if not found
        """
        try:
            experiment = OptimizationExperiment.objects.get(id=experiment_id)
            return experiment
        except OptimizationExperiment.DoesNotExist:
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
            OptimizationExperiment.ExperimentStatus.RUNNING: [
                OptimizationExperiment.ExperimentStatus.PAUSED,
                OptimizationExperiment.ExperimentStatus.COMPLETED,
                OptimizationExperiment.ExperimentStatus.ROLLED_BACK
            ],
            OptimizationExperiment.ExperimentStatus.PAUSED: [
                OptimizationExperiment.ExperimentStatus.RUNNING,
                OptimizationExperiment.ExperimentStatus.COMPLETED,
                OptimizationExperiment.ExperimentStatus.ROLLED_BACK
            ],
            OptimizationExperiment.ExperimentStatus.COMPLETED: [
                # No valid transitions from completed
            ],
            OptimizationExperiment.ExperimentStatus.ROLLED_BACK: [
                # No valid transitions from rolled_back
            ]
        }
        
        # If status is the same, it's valid (no change)
        if current_status == new_status:
            return True, None
        
        # Check if transition is valid
        allowed_transitions = valid_transitions.get(current_status, [])
        if new_status not in allowed_transitions:
            return False, f"Cannot change status from '{current_status}' to '{new_status}'. Valid transitions from '{current_status}' are: {', '.join(allowed_transitions) if allowed_transitions else 'none'}"
        
        return True, None

class RollbackHistoryService:
    """Service layer for rollback history-related operations"""
    
    @staticmethod
    def check_rollback_history_exists_by_scaling_action_id(scaling_action_id):
        """
        Check if rollback history exists by scaling action ID
        """
        try:
            rollback_history = RollbackHistory.objects.get(scaling_action_id=scaling_action_id)
            return rollback_history
        except RollbackHistory.DoesNotExist:
            return None