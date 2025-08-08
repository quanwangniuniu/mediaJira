import hashlib
from typing import Optional
from django.core.files.uploadedfile import UploadedFile
from django.db import models
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition
from django.core.exceptions import ValidationError

User = get_user_model()


# Mock Task model - this should be moved to a proper task app later
class Task(models.Model):
    """Mock Task model for asset references"""
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks'
    
    def __str__(self):
        return f"Task {self.id}: {self.title}"


class Asset(models.Model):
    """Asset model representing digital assets that go through review workflow"""
    
    # FSM States
    NOT_SUBMITTED = 'NotSubmitted'
    PENDING_REVIEW = 'PendingReview'
    UNDER_REVIEW = 'UnderReview'
    APPROVED = 'Approved'
    REVISION_REQUIRED = 'RevisionRequired'
    ARCHIVED = 'Archived'
    
    STATUS_CHOICES = [
        (NOT_SUBMITTED, 'Not Submitted'),
        (PENDING_REVIEW, 'Pending Review'),
        (UNDER_REVIEW, 'Under Review'),
        (APPROVED, 'Approved'),
        (REVISION_REQUIRED, 'Revision Required'),
        (ARCHIVED, 'Archived'),
    ]
    
    id = models.AutoField(primary_key=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assets', null=True, blank=True, help_text="Reference to Task")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_assets', help_text="Reference to User")
    team = models.ForeignKey('core.Team', on_delete=models.CASCADE, related_name='assets', null=True, blank=True, help_text="Reference to Team")
    status = FSMField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default=NOT_SUBMITTED,  # default is NotSubmitted
        protected=False,  # Prevents direct field updates
        help_text="Current state of the asset in the review workflow"
    )
    tags = models.JSONField(default=list, blank=True, help_text="List of tags for the asset")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'assets'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Asset {self.id} - {self.get_status_display()}"
    
    # FSM Transitions
    
    @transition(field=status, source=NOT_SUBMITTED, target=PENDING_REVIEW)
    def submit(self, submitted_by=None):
        """Submit asset for review - can only be called from NotSubmitted state when version is finalized"""
        
        # Validate that asset can be submitted before allowing transition
        if not self.can_submit():
            raise ValidationError("Cannot submit asset: must be in NotSubmitted state and have a finalized version")
        
        from_state = self.status
        self.updated_at = models.functions.Now()
        
        # Log the transition
        AssetStateTransition.objects.create(
            asset=self,
            from_state=from_state,
            to_state=self.PENDING_REVIEW,
            transition_method='submit',
            triggered_by=submitted_by,
            metadata={'action': 'submitted_for_review'}
        )
    
    @transition(field=status, source=PENDING_REVIEW, target=UNDER_REVIEW)
    def start_review(self, reviewer=None):
        """Start the review process - can only be called from PendingReview state"""
        from_state = self.status
        self.updated_at = models.functions.Now()
        
        # Log the transition
        AssetStateTransition.objects.create(
            asset=self,
            from_state=from_state,
            to_state=self.UNDER_REVIEW,
            transition_method='start_review',
            triggered_by=reviewer,
            metadata={'action': 'review_started'}
        )
    
    @transition(field=status, source=UNDER_REVIEW, target=APPROVED)
    def approve(self, approver=None):
        """Approve the asset - can only be called from UnderReview state"""
        from_state = self.status
        self.updated_at = models.functions.Now()
        
        # Log the transition
        AssetStateTransition.objects.create(
            asset=self,
            from_state=from_state,
            to_state=self.APPROVED,
            transition_method='approve',
            triggered_by=approver,
            metadata={'action': 'approved'}
        )
    
    @transition(field=status, source=UNDER_REVIEW, target=REVISION_REQUIRED)
    def reject(self, rejector=None, reason=None):
        """Reject the asset - can only be called from UnderReview state"""
        from_state = self.status
        self.updated_at = models.functions.Now()
        
        # Log the transition
        AssetStateTransition.objects.create(
            asset=self,
            from_state=from_state,
            to_state=self.REVISION_REQUIRED,
            transition_method='reject',
            triggered_by=rejector,
            metadata={'action': 'rejected', 'reason': reason}
        )
    
    @transition(field=status, source=REVISION_REQUIRED, target=NOT_SUBMITTED)
    def acknowledge_rejection(self, returned_by=None, reason=None):
        """Acknowledge rejection and return to editing state - can only be called from RevisionRequired state"""
        from_state = self.status
        self.updated_at = models.functions.Now()
        
        # Log the transition
        AssetStateTransition.objects.create(
            asset=self,
            from_state=from_state,
            to_state=self.NOT_SUBMITTED,
            transition_method='acknowledge_rejection',
            triggered_by=returned_by,
            metadata={'action': 'acknowledged_rejection', 'reason': reason}
        )
    
    @transition(field=status, source=APPROVED, target=ARCHIVED)
    def archive(self, archived_by=None):
        """Archive the asset - can only be called from Approved state"""
        from_state = self.status
        self.updated_at = models.functions.Now()
        
        # Log the transition
        AssetStateTransition.objects.create(
            asset=self,
            from_state=from_state,
            to_state=self.ARCHIVED,
            transition_method='archive',
            triggered_by=archived_by,
            metadata={'action': 'archived'}
        )
    
    # Helper methods
    
    def can_submit(self):
        """Check if asset can be submitted for review (must be in NotSubmitted state and have a finalized version)"""
        return self.status == self.NOT_SUBMITTED and self.latest_version_is_finalized()
    
    def can_start_review(self):
        """Check if review can be started"""
        return self.status == self.PENDING_REVIEW and self.latest_version_is_finalized()
    
    def can_approve(self):
        """Check if asset can be approved"""
        return self.status == self.UNDER_REVIEW and self.latest_version_is_finalized()
    
    def can_reject(self):
        """Check if asset can be rejected"""
        return self.status == self.UNDER_REVIEW and self.latest_version_is_finalized()
    
    def can_acknowledge_rejection(self):
        """Check if asset can acknowledge rejection"""
        return self.status == self.REVISION_REQUIRED and self.latest_version_is_finalized() 
    
    def can_archive(self):
        """Check if asset can be archived"""
        return self.status == self.APPROVED and self.latest_version_is_finalized()
    
    
    def has_draft_version(self):
        """Check if asset has a draft version"""
        return self.versions.filter(version_status=AssetVersion.DRAFT).exists()
    
    def latest_version_is_finalized(self):
        latest = (
            AssetVersion.objects
            .filter(asset=self)
            .order_by('-version_number')
            .first()
        )
        return bool(latest and latest.version_status == AssetVersion.FINALIZED)
    
    def can_create_version(self):
        """Check if a new version can be created"""
        # Can create new version if:
        # 1. Asset is in NotSubmitted state
        # 2. No draft version exists
        # 3. Either no versions exist (first version) or latest version is finalized
        if (self.status == self.NOT_SUBMITTED and 
            not self.has_draft_version() and 
            (not self.versions.exists() or self.latest_version_is_finalized())):
            return True
        return False

    def validate_can_create_version(self):
        """Validate if a new version can be created, raises ValidationError if not"""
        if not self.can_create_version():
            raise ValidationError("Cannot create new version: asset must be in NotSubmitted state, have no draft version, and either have no versions or have latest version finalized")
    
    def update_status_based_on_versions(self):
        """Update asset status based on version states"""
        # Asset status should be driven by user actions, not version states
        # This method is kept for potential future use but currently does nothing
        pass


class AssetStateTransition(models.Model):
    """Model to track asset state transitions for audit purposes"""
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='state_transitions')
    from_state = models.CharField(max_length=20, choices=Asset.STATUS_CHOICES)
    to_state = models.CharField(max_length=20, choices=Asset.STATUS_CHOICES)
    transition_method = models.CharField(max_length=50, help_text="Name of the transition method called")
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional data about the transition")
    
    class Meta:
        db_table = 'asset_state_transitions'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Asset {self.asset.id}: {self.get_from_state_display()} → {self.get_to_state_display()}"


class AssetVersion(models.Model):
    """AssetVersion model representing different versions of an asset"""
    
    # Version Status Constants
    DRAFT = 'Draft'
    FINALIZED = 'Finalized'
    
    VERSION_STATUS_CHOICES = [
        (DRAFT, 'Draft'),
        (FINALIZED, 'Finalized'),
    ]
    
    # Scan Status Constants
    PENDING = 'pending'
    SCANNING = 'scanning'
    CLEAN = 'clean'
    INFECTED = 'infected'
    ERROR = 'error'
    
    SCAN_STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (SCANNING, 'Scanning'),
        (CLEAN, 'Clean'),
        (INFECTED, 'Infected'),
        (ERROR, 'Error'),
    ]
    
    id = models.AutoField(primary_key=True)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    file = models.FileField(upload_to='assets/%Y/%m/%d/', max_length=500, blank=True, null=True, help_text="Uploaded file")
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_versions')
    checksum = models.CharField(max_length=64, blank=True, help_text="SHA-256 checksum of the file")
    
    # Version status FSM (Draft/Finalized)
    version_status = FSMField(
        max_length=20, 
        choices=VERSION_STATUS_CHOICES, 
        default=DRAFT,
        protected=False,  # Allow direct setting for testing
        help_text="Version status in the workflow"
    )
    
    # Scan status FSM for virus scanning
    scan_status = FSMField(
        max_length=20, 
        choices=SCAN_STATUS_CHOICES, 
        default=PENDING,
        protected=False,  # Allow direct setting for testing
        help_text="Virus scan status"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'asset_versions'
        ordering = ['-version_number']
        unique_together = ['asset', 'version_number']
    
    def __str__(self):
        return f"Asset {self.asset.id} v{self.version_number} ({self.version_status})"
    
    def save(self, *args, **kwargs):
        """Basic save method - only handles persistence"""
        super().save(*args, **kwargs)
    
    def update_with_file(self, file_obj, **kwargs):
        """Update version with a new file - handles validation and checksum calculation"""
        # Validate that version can be updated
        self.validate_can_be_updated()
        
        # Get original for checksum comparison
        original = AssetVersion.objects.get(pk=self.pk) if self.pk else None
        
        # Update fields
        for field, value in kwargs.items():
            setattr(self, field, value)
        
        # Handle file update
        if file_obj:
            self.file = file_obj
            # Check if file content is unchanged
            if original and self.is_file_unchanged(file_obj):
                # File content unchanged - raise validation error
                raise ValidationError("File content unchanged; no update performed.")
            
            # File content changed, recalculate checksum
            self.checksum = self.compute_checksum(file_obj)
            self._file_content_changed = True
        
        # Save the changes
        self.save()
        return self
    
    def create_new_version(self, file_obj=None, **kwargs):
        """Create a new version - handles validation"""
        # Set fields first
        for field, value in kwargs.items():
            setattr(self, field, value)
        
        # Ensure asset is set before validation
        if not hasattr(self, 'asset') or self.asset is None:
            raise ValidationError("Asset must be set before creating a new version")
        
        # Validate that asset can create a new version (after setting asset)
        self.asset.validate_can_create_version()
        
        # Handle file if provided
        if file_obj:
            self.file = file_obj
            self.checksum = self.compute_checksum(file_obj)
            self._file_content_changed = True
        
        # Save the new version
        self.save()
        return self
        
    
    def delete(self, using=None, keep_parents=False):
        self.validate_can_be_deleted()
        super().delete(using, keep_parents)

    # Version Status Transitions
    
    @transition(field=version_status, source=DRAFT, target=FINALIZED)
    def finalize(self, finalized_by=None):
        """Finalize this version - can only be called from Draft state with clean scan status"""
        
        # Validate that scan status is clean before allowing finalization
        if self.scan_status != self.CLEAN:
            raise ValidationError(f"Cannot finalize version: scan status must be 'clean', but is '{self.scan_status}'")
        
        from_state = self.version_status
        
        # Log the transition
        AssetVersionStateTransition.objects.create(
            asset_version=self,
            from_version_status=from_state,
            to_version_status=self.FINALIZED,
            from_scan_status=self.scan_status,
            to_scan_status=self.scan_status,  # Scan status unchanged
            transition_method='finalize',
            triggered_by=finalized_by,
            metadata={'action': 'version_finalized'}
        )
        
        # Save the state change - only update the FSM field
        super(AssetVersion, self).save(update_fields=['version_status'])
    
    # Scan Status Transitions
    
    @transition(field=scan_status, source=PENDING, target=SCANNING)
    def start_scan(self):
        """Start virus scanning - can only be called from Pending state"""
        from_state = self.scan_status
        
        # Log the transition
        AssetVersionStateTransition.objects.create(
            asset_version=self,
            from_version_status=self.version_status,
            to_version_status=self.version_status,  # Version status unchanged
            from_scan_status=from_state,
            to_scan_status=self.SCANNING,
            transition_method='start_scan',
            triggered_by=None,  # Usually triggered by system/task
            metadata={'action': 'scan_started'}
        )
        
        # Save the state change - only update the FSM field
        super(AssetVersion, self).save(update_fields=['scan_status'])
    
    @transition(field=scan_status, source=SCANNING, target=CLEAN)
    def mark_clean(self):
        """Mark version as clean - can only be called from Scanning state"""
        from_state = self.scan_status
        
        # Log the transition
        AssetVersionStateTransition.objects.create(
            asset_version=self,
            from_version_status=self.version_status,
            to_version_status=self.version_status,  # Version status unchanged
            from_scan_status=from_state,
            to_scan_status=self.CLEAN,
            transition_method='mark_clean',
            triggered_by=None,  # Usually triggered by system/task
            metadata={'action': 'scan_clean'}
        )
        
        # Save the state change - only update the FSM field
        super(AssetVersion, self).save(update_fields=['scan_status'])
    
    @transition(field=scan_status, source=SCANNING, target=INFECTED)
    def mark_infected(self, virus_name=None):
        """Mark version as infected - can only be called from Scanning state"""
        from_state = self.scan_status
        
        # Log the transition
        AssetVersionStateTransition.objects.create(
            asset_version=self,
            from_version_status=self.version_status,
            to_version_status=self.version_status,  # Version status unchanged
            from_scan_status=from_state,
            to_scan_status=self.INFECTED,
            transition_method='mark_infected',
            triggered_by=None,  # Usually triggered by system/task
            metadata={'action': 'scan_infected', 'virus_name': virus_name}
        )
        
        # Save the state change - only update the FSM field
        super(AssetVersion, self).save(update_fields=['scan_status'])
    
    @transition(field=scan_status, source=SCANNING, target=ERROR)
    def mark_error(self, error_message=None):
        """Mark scan as error - can only be called from Scanning state"""
        from_state = self.scan_status
        
        # Log the transition
        AssetVersionStateTransition.objects.create(
            asset_version=self,
            from_version_status=self.version_status,
            to_version_status=self.version_status,  # Version status unchanged
            from_scan_status=from_state,
            to_scan_status=self.ERROR,
            transition_method='mark_error',
            triggered_by=None,  # Usually triggered by system/task
            metadata={'action': 'scan_error', 'error_message': error_message}
        )
        
        # Save the state change - only update the FSM field
        super(AssetVersion, self).save(update_fields=['scan_status'])

    def get_file_url(self):
        """Get the file URL"""
        return self.file.url if self.file else None
    
    def get_file_name(self):
        """Get the file name"""
        return self.file.name if self.file else None
    
    def get_original_file_name(self):
        """Get the original file name (without path and suffixes)"""
        if not self.file:
            return None
        import os
        filename = os.path.basename(self.file.name)
        # Remove Django's unique suffix (e.g., "_unbNA68")
        # The suffix is typically added before the extension
        name_parts = filename.rsplit('_', 1)
        if len(name_parts) > 1 and len(name_parts[1].split('.')[0]) <= 8:
            # Check if the last part looks like a Django suffix (short alphanumeric)
            import re
            if re.match(r'^[a-zA-Z0-9]{1,8}\.', name_parts[1]):
                return name_parts[0] + '.' + name_parts[1].split('.', 1)[1]
        return filename
    
    def can_be_scanned(self):
        """Check if this version can be scanned for viruses"""
        return bool(self.file)
    
    def requires_scan(self):
        """Check if this version requires virus scanning"""
        return bool(self.file) and self.scan_status in [self.PENDING, self.ERROR]
    
    def compute_checksum(self, file_obj: UploadedFile) -> str:
        """
        Internal helper: calculate SHA-256 hex digest of a Django File/UploadedFile.
        """
        if file_obj is None:
            return None
        file_obj.seek(0)
        sha256 = hashlib.sha256()
        for chunk in file_obj.chunks():
            sha256.update(chunk)
        file_obj.seek(0)
        return sha256.hexdigest()

    def is_file_unchanged(self, uploaded_file: UploadedFile) -> bool:
        """
        Return True if `uploaded_file` has the same checksum as self.file.
        """
        if not self.checksum or not self.file:
            return False  # no existing checksum → must be new
        new_checksum = self.compute_checksum(uploaded_file)
        return new_checksum == self.checksum

    # Version status helper methods
    
    def can_be_finalized(self):
        """Check if this version can be finalized (must be draft and scan status must be clean)"""
        return self.version_status == self.DRAFT and self.scan_status == self.CLEAN
    
    def is_draft(self):
        """Check if this version is a draft"""
        return self.version_status == self.DRAFT
    
    def is_finalized(self):
        """Check if this version is finalized"""
        return self.version_status == self.FINALIZED
    
    # Helper methods for scan status
    
    def can_start_scan(self):
        """Check if scan can be started"""
        return self.scan_status == self.PENDING
    
    def can_mark_clean(self):
        """Check if version can be marked as clean"""
        return self.scan_status == self.SCANNING
    
    def can_mark_infected(self):
        """Check if version can be marked as infected"""
        return self.scan_status == self.SCANNING
    
    def can_mark_error(self):
        """Check if scan can be marked as error"""
        return self.scan_status == self.SCANNING
    
    def can_be_updated(self):
        """Check if this version can be updated"""
        return self.version_status == self.DRAFT
    
    def can_be_deleted(self):
        """Check if this version can be deleted"""
        return self.version_status == self.DRAFT
    
    def validate_can_be_updated(self):
        """Validate if this version can be updated, raises ValidationError if not"""
        if not self.can_be_updated():
            raise ValidationError("Cannot update a finalized version. Only draft versions can be updated.")
    
    def validate_can_be_deleted(self):
        """Validate if this version can be deleted, raises ValidationError if not"""
        if not self.can_be_deleted():
            raise ValidationError("Cannot delete a finalized version. Only draft versions can be deleted.")


class AssetVersionStateTransition(models.Model):
    """Model to track asset version state transitions for audit purposes"""
    
    asset_version = models.ForeignKey('AssetVersion', on_delete=models.CASCADE, related_name='state_transitions')
    
    # Version status transitions - using string references to avoid circular imports
    from_version_status = models.CharField(max_length=20, choices=[('Draft', 'Draft'), ('Finalized', 'Finalized')], null=True, blank=True)
    to_version_status = models.CharField(max_length=20, choices=[('Draft', 'Draft'), ('Finalized', 'Finalized')], null=True, blank=True)
    
    # Scan status transitions - using string references to avoid circular imports
    from_scan_status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('scanning', 'Scanning'), ('clean', 'Clean'), ('infected', 'Infected'), ('error', 'Error')], null=True, blank=True)
    to_scan_status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('scanning', 'Scanning'), ('clean', 'Clean'), ('infected', 'Infected'), ('error', 'Error')], null=True, blank=True)
    
    transition_method = models.CharField(max_length=50, help_text="Name of the transition method called")
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional data about the transition")
    
    class Meta:
        db_table = 'asset_version_state_transitions'
        ordering = ['-timestamp']
    
    def __str__(self):
        version_change = f"{self.from_version_status} → {self.to_version_status}" if self.from_version_status and self.to_version_status else ""
        scan_change = f"{self.from_scan_status} → {self.to_scan_status}" if self.from_scan_status and self.to_scan_status else ""
        
        if version_change and scan_change:
            return f"AssetVersion {self.asset_version.id}: {version_change}, {scan_change}"
        elif version_change:
            return f"AssetVersion {self.asset_version.id}: {version_change}"
        elif scan_change:
            return f"AssetVersion {self.asset_version.id}: {scan_change}"
        else:
            return f"AssetVersion {self.asset_version.id}: {self.transition_method}"


class AssetComment(models.Model):
    """AssetComment model for comments on assets"""
    
    id = models.AutoField(primary_key=True)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='asset_comments')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'asset_comments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on Asset {self.asset.id}"


class ReviewAssignment(models.Model):
    """ReviewAssignment model for assigning reviewers and approvers to assets"""
    
    # TODO: This may be changed later; not finalized yet.
    ROLE_CHOICES = [
        ('reviewer', 'Reviewer'),
        ('approver', 'Approver'),
    ]
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='review_assignments')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_reviews')
    assigned_at = models.DateTimeField(auto_now_add=True)
    valid_until = models.DateTimeField(null=True, blank=True, help_text="Assignment expiry date")
    
    class Meta:
        db_table = 'review_assignments'
        ordering = ['-assigned_at']
        unique_together = ['asset_id', 'user_id', 'role']
    
    def __str__(self):
        return f"{self.role.title()} assignment for Asset {self.asset.id} - {self.user.username}" 