from contextlib import nullcontext
from django.db import models
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from core.models import Project

User = get_user_model()


class Task(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        LOCKED = 'LOCKED', 'Locked'
        CANCELLED = 'CANCELLED', 'Cancelled'

    # --- Core Fields ---
    summary = models.CharField(max_length=255, null=False, blank=False, help_text="The title of the task")
    description = models.TextField(null=True, blank=True)
    status = FSMField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        protected=True
    )
    owner = models.ForeignKey(
      User, 
      related_name='owned_tasks', 
      on_delete=models.SET_NULL, 
      null=True, 
      help_text="The user who owns the task"
    )
    current_approver = models.ForeignKey(
      User, 
      related_name='tasks_to_approve', 
      on_delete=models.SET_NULL, 
      null=True, 
      help_text="The user who is currently reviewing the task"
    )
    project = models.ForeignKey(
      Project, 
      on_delete=models.CASCADE, 
      null=False, blank=False, 
      help_text="The project that the task belongs to"
    )
    due_date = models.DateField(null=True, blank=True, help_text="The due date of the task") # TODO: Modify according to escalation requirements
    type = models.CharField(
      max_length=50, 
      choices=[('budget', 'Budget'), ('asset', 'Asset'), ('retrospective', 'Retrospective'), ('report', 'Report')], 
      null=False, 
      blank=False, 
      help_text="Chosen type of the task") # For the convenience of frontend display/filtering/...

    # --- Start Date ---
    start_date = models.DateField(
        null=True,
        blank=True,
        help_text="Task start date",
    )

    # --- Linked Task to the real model of chosen type (BudgetRequest, Asset, Retrospective, etc.) ---
    content_type = models.ForeignKey(
      ContentType, 
      on_delete=models.CASCADE, 
      null=True, 
      blank=True, 
      help_text="Content type of the linked model"
    )
    object_id = models.CharField(
      null=True, 
      blank=True, 
      help_text="Id of the linked model"
    )
    linked_object = GenericForeignKey('content_type', 'object_id') # Virtual field: the instance of the linked model (BudgetRequest, Asset, Retrospective, etc.)

    def __str__(self):
        return f"Task #{self.id} - {self.summary} ({self.status})"

    # --- FSM Transition ---

    @transition(field=status, source=Status.DRAFT, target=Status.SUBMITTED)
    def submit(self):
        """User submits Task"""
        pass

    @transition(field=status, source=Status.SUBMITTED, target=Status.UNDER_REVIEW)
    def start_review(self):
        """Approver starts reviewing the task"""
        pass

    @transition(field=status, source=Status.UNDER_REVIEW, target=Status.APPROVED)
    def approve(self):
        """Approver approves the task"""
        pass

    @transition(field=status, source=Status.UNDER_REVIEW, target=Status.REJECTED)
    def reject(self):
        """Approver rejects the task"""
        pass

    @transition(field=status, source=Status.APPROVED, target=Status.LOCKED)
    def lock(self):
        """Approver locks the task"""
        pass

    @transition(field=status, source=[Status.SUBMITTED, Status.UNDER_REVIEW, Status.APPROVED, Status.REJECTED], target=Status.CANCELLED)
    def cancel(self):
        """User cancels the task"""
        pass

    @transition(field=status, source=[Status.REJECTED, Status.CANCELLED], target=Status.DRAFT)
    def revise(self):
        """Owner revises the task"""
        pass


    @transition(field=status, source=Status.APPROVED, target=Status.UNDER_REVIEW)
    def forward_to_next(self):
        """Owner forwards the task to the next approver"""
        pass

    # --- Helpful Properties ---
    @property
    def is_linked(self):
        """Return True if the task is linked to a task type instance"""
        return bool(self.content_type_id and self.object_id and self.object_id.strip())

    @property
    def task_type(self):
        """Return the model name of the linked object (e.g. 'budgetRequest')"""
        if self.content_type:
            return self.content_type.model
        return None

    @property
    def linked_status(self):
        """Return the status of the linked object"""
        if self.linked_object and hasattr(self.linked_object, "status"):
            return self.linked_object.status
        return None    

    # --- Helper Methods ---

    # Link a task type instance to the task
    # by giving value to the content_type, object_id fields
    def link_to_object(self, instance):
        self.content_type = ContentType.objects.get_for_model(instance.__class__) # Bind the task type to the task
        self.object_id = str(instance.id) # The id of the task type instance (convert to string for CharField)
        self.save()



class ApprovalRecord(models.Model):
    """
    Approval Record Model - Supports multi-step task approval process
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='approval_records',
        help_text="Associated Task"
    )
    approved_by = models.ForeignKey(
        User,
        null=False,
        blank=False,
        on_delete=models.PROTECT, # The approver can be deleted, but the approval record should still exist
        related_name='task_approval_records',
        help_text="Approver user"
    )
    is_approved = models.BooleanField(null=False, blank=False, help_text="Whether approved")
    comment = models.TextField(null=True, blank=True, help_text="Reason for approval or rejection")
    decided_time = models.DateTimeField(auto_now_add=True, help_text="Decision timestamp")
    step_number = models.PositiveIntegerField(null=False, blank=False, help_text="Approval step number")

    class Meta:
        unique_together = ['task', 'step_number']
        ordering = ['step_number']


