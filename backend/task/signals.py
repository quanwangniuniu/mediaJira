from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import TaskAttachment, TaskHierarchy
from .tasks import scan_task_attachment


@receiver(post_save, sender=TaskAttachment)
def trigger_virus_scan(sender, instance, created, **kwargs):
    """
    Trigger virus scan when a new task attachment is uploaded
    """
    if created and instance.scan_status == TaskAttachment.PENDING:
        # Trigger virus scan asynchronously
        scan_task_attachment.delay(instance.id)


@receiver(post_delete, sender=TaskHierarchy)
def handle_subtask_orphan_check(sender, instance, **kwargs):
    """
    When a TaskHierarchy record is deleted, check if the child_task
    has any remaining parent tasks. If not, delete the orphaned subtask.
    
    This handles the case when a parent task is deleted (CASCADE deletes
    the TaskHierarchy record). When all parent tasks are deleted, the
    orphaned subtask is automatically deleted.
    """
    # Get child_task_id before instance is fully deleted
    child_task_id = instance.child_task_id
    
    # Check if child_task still exists and has any other parent_task relationships
    # Note: instance.child_task may not be accessible if child_task was deleted
    from .models import Task
    try:
        child_task = Task.objects.get(id=child_task_id)
    except Task.DoesNotExist:
        # Child task was already deleted, nothing to do
        return
    
    # Check if child_task has any other parent_task relationships
    remaining_parents = TaskHierarchy.objects.filter(
        child_task=child_task
    )
    
    if not remaining_parents.exists():
        # No remaining parents, delete the orphaned subtask
        child_task.delete()

