from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_fsm import FSMField, transition
import os
import uuid


def get_storage_key(instance, filename):
    """Generate storage key like metrics/YYYY/MM/DD/<uuid>.<ext>"""
    ext = os.path.splitext(filename)[1]
    today = timezone.now().date()
    date_path = os.path.join('metrics_files', f"{today.year:04d}", f"{today.month:02d}", f"{today.day:02d}")
    unique_filename = f"{uuid.uuid4()}{ext}"
    return os.path.join(date_path, unique_filename)


class MetricFile(models.Model):
    """Model for storing uploaded metric files"""
    
    # Core file information (as requested)
    mime_type = models.CharField(max_length=255, help_text="MIME type for browser/frontend display")
    size = models.BigIntegerField(help_text="File size in bytes")
    checksum = models.CharField(max_length=64, blank=True, null=True, help_text="File checksum for integrity verification")
    storage_key = models.CharField(max_length=500, unique=True, help_text="Relative storage path for file location")
    
    # File metadata
    original_filename = models.CharField(max_length=255, help_text="Original filename as uploaded by user")
    
    # User and ownership
    uploaded_by = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='uploaded_metrics')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # File status for virus scanning (FSM)
    INCOMING = 'incoming'
    SCANNING = 'scanning'
    READY = 'ready'
    INFECTED = 'infected'
    MISSING = 'missing'
    ERROR_SCANNING = 'error_scanning'
    
    STATUS_CHOICES = [
        (INCOMING, 'Incoming - File just uploaded'),
        (SCANNING, 'Scanning - Virus scan in progress'),
        (READY, 'Ready - File is safe and available'),
        (INFECTED, 'Infected - File contains virus/malware'),
        (MISSING, 'Missing - File missing from storage'),
        (ERROR_SCANNING, 'ErrorScanning - Scanner error occurred'),
    ]
    status = FSMField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default=INCOMING,
        protected=True,  # Prevents direct field updates
        help_text="File status for virus scanning and availability"
    )
    
    # Status and visibility
    is_public = models.BooleanField(default=False, help_text="Whether file is publicly accessible")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    
    
    class Meta:
        db_table = 'metric_files'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['uploaded_by', 'created_at']),
            models.Index(fields=['mime_type']),
            models.Index(fields=['is_public']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['status']),  # For virus scan status queries
            models.Index(fields=['checksum']),  # For deduplication
        ]
    
    def __str__(self):
        return f"{self.original_filename} ({self.uploaded_by.username})"
    
    def get_file_extension(self):
        """Get file extension from original filename"""
        return os.path.splitext(self.original_filename)[1].lower()
    
    def get_file_size_display(self):
        """Get human readable file size"""
        if self.size == 0:
            return "0B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        import math
        i = int(math.floor(math.log(self.size, 1024)))
        p = math.pow(1024, i)
        s = round(self.size / p, 2)
        return f"{s} {size_names[i]}"
    
    def is_image(self):
        """Check if file is an image"""
        image_mime_types = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml']
        return self.mime_type in image_mime_types
    
    def is_document(self):
        """Check if file is a document"""
        doc_mime_types = [
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 'text/rtf', 'application/vnd.oasis.opendocument.text'
        ]
        return self.mime_type in doc_mime_types
    
    def is_spreadsheet(self):
        """Check if file is a spreadsheet"""
        spreadsheet_mime_types = [
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv', 'application/vnd.oasis.opendocument.spreadsheet'
        ]
        return self.mime_type in spreadsheet_mime_types
    
    def can_preview(self):
        """Check if file can be previewed in browser"""
        previewable_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml',
            'application/pdf', 'text/plain', 'text/csv'
        ]
        return self.mime_type in previewable_types
    
    # Status check methods
    def is_ready(self):
        """Check if file is ready for access"""
        return self.status == self.READY
    
    def is_scanning(self):
        """Check if file is being scanned"""
        return self.status in [self.INCOMING, self.SCANNING]
    
    def is_infected(self):
        """Check if file is infected"""
        return self.status == self.INFECTED
    
    def can_be_accessed(self):
        """Check if file can be accessed (ready and not deleted)"""
        return self.is_ready() and not self.is_deleted
    
    def get_status_message(self):
        """Get human readable status message"""
        status_messages = {
            self.INCOMING: 'File uploaded, waiting for virus scan',
            self.SCANNING: 'Virus scan in progress, please wait',
            self.READY: 'File is safe and ready for use',
            self.INFECTED: 'File contains virus/malware and cannot be accessed',
            self.MISSING: 'File missing from storage, please contact support',
            self.ERROR_SCANNING: 'Scanner error occurred, please retry later'
        }
        return status_messages.get(self.status, 'Unknown status')
    
    # FSM Transitions
    
    @transition(field=status, source=INCOMING, target=SCANNING)
    def start_scan(self):
        """Start virus scanning process"""
        self.updated_at = timezone.now()
    
    @transition(field=status, source=SCANNING, target=READY)
    def mark_clean(self):
        """Mark file as clean after successful virus scan"""
        self.updated_at = timezone.now()
    
    @transition(field=status, source=SCANNING, target=INFECTED)
    def mark_infected(self):
        """Mark file as infected after virus scan"""
        self.updated_at = timezone.now()
    
    @transition(field=status, source=SCANNING, target=MISSING)
    def mark_missing(self):
        """Mark file as missing from storage"""
        self.updated_at = timezone.now()

    @transition(field=status, source=SCANNING, target=ERROR_SCANNING)
    def mark_error_scanning(self):
        """Mark file as scanner error"""
        self.updated_at = timezone.now()