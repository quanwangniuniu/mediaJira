from django.db import models
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition
from django.utils import timezone


class TikTokCreative(models.Model):
    """
    Model for TikTok creative content (images, videos, music).
    """
    CREATIVE_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('music', 'Music'),
    ]
    
    # File status for virus scanning (same as metric_upload)
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
    
    id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=10, choices=CREATIVE_TYPE_CHOICES)
    name = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    size_bytes = models.BigIntegerField()
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration_sec = models.FloatField(null=True, blank=True)
    md5 = models.CharField(max_length=32, unique=True)
    preview_url = models.URLField(max_length=1000)
    scan_status = FSMField(max_length=20, choices=STATUS_CHOICES, default=INCOMING, protected=True)
    uploaded_by = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='uploaded_tiktok_creatives')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tiktok_creative'
        verbose_name = 'TikTok Creative'
        verbose_name_plural = 'TikTok Creatives'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.type})"
    
    # FSM Transitions for virus scanning
    @transition(field=scan_status, source=INCOMING, target=SCANNING)
    def start_scan(self):
        """Start virus scanning process"""
        self.updated_at = timezone.now()
    
    @transition(field=scan_status, source=SCANNING, target=READY)
    def mark_clean(self):
        """Mark file as clean after successful virus scan"""
        self.updated_at = timezone.now()
    
    @transition(field=scan_status, source=SCANNING, target=INFECTED)
    def mark_infected(self):
        """Mark file as infected after virus scan"""
        self.updated_at = timezone.now()
    
    @transition(field=scan_status, source=SCANNING, target=MISSING)
    def mark_missing(self):
        """Mark file as missing from storage"""
        self.updated_at = timezone.now()

    @transition(field=scan_status, source=SCANNING, target=ERROR_SCANNING)
    def mark_error_scanning(self):
        """Mark file as scanner error"""
        self.updated_at = timezone.now()
