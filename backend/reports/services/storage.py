"""
Storage service for handling file uploads, signed URLs, and cleanup.
Supports both local filesystem and S3/MinIO storage backends.
"""

import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, BinaryIO
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)


class StorageService:
    """
    Unified storage service that abstracts away the underlying storage backend.
    Supports both local filesystem and S3/MinIO storage.
    """
    
    def __init__(self):
        self.is_s3_enabled = getattr(settings, 'USE_S3_STORAGE', False)
        self.bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'mediajira-reports')
        
        if self.is_s3_enabled:
            try:
                import boto3
                from botocore.exceptions import ClientError
                self.boto3 = boto3
                self.ClientError = ClientError
                
                # Initialize S3 client
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
                    endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
                    use_ssl=getattr(settings, 'AWS_S3_USE_SSL', True)
                )
                logger.info("S3 storage initialized successfully")
            except ImportError:
                logger.error("boto3 not installed. Install with: pip install boto3")
                raise
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                raise
        else:
            logger.info("Using local filesystem storage")
    
    def upload_report_file(
        self, 
        file_content: BinaryIO, 
        filename: str, 
        content_type: str = 'application/octet-stream',
        folder: str = 'reports'
    ) -> Dict[str, Any]:
        """
        Upload a file to the configured storage backend.
        
        Args:
            file_content: File-like object with the content
            filename: Name of the file
            content_type: MIME type of the file
            folder: Folder/prefix to store the file under
        
        Returns:
            Dict with 'storage_key' and 'file_url'
        """
        try:
            # Generate unique storage key
            file_extension = os.path.splitext(filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            storage_key = f"{folder}/{unique_filename}"
            
            # Reset file pointer to beginning
            if hasattr(file_content, 'seek'):
                file_content.seek(0)
            
            # Read content
            if hasattr(file_content, 'read'):
                content_bytes = file_content.read()
            else:
                content_bytes = file_content
            
            # Create Django ContentFile
            django_file = ContentFile(content_bytes, name=unique_filename)
            
            # Save using Django's default storage
            saved_path = default_storage.save(storage_key, django_file)
            
            # Generate URL
            if self.is_s3_enabled:
                file_url = default_storage.url(saved_path)
            else:
                file_url = default_storage.url(saved_path)
            
            logger.info(f"File uploaded successfully: {storage_key}")
            
            return {
                'storage_key': saved_path,  # Use the actual saved path
                'file_url': file_url,
                'filename': filename,
                'content_type': content_type,
                'size': len(content_bytes),
                'uploaded_at': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to upload file {filename}: {e}")
            raise
    
    def generate_signed_url(
        self, 
        storage_key: str, 
        expires_in: int = 3600,
        response_content_disposition: Optional[str] = None
    ) -> str:
        """
        Generate a signed URL for downloading a file.
        
        Args:
            storage_key: The storage key/path of the file
            expires_in: URL expiration time in seconds (default: 1 hour)
            response_content_disposition: Optional Content-Disposition header
        
        Returns:
            Signed URL string
        """
        try:
            if not self.is_s3_enabled:
                # For local storage, return the regular URL
                # In production, you might want to implement a Django view
                # that serves files with authentication
                return default_storage.url(storage_key)
            
            # Generate S3 signed URL
            params = {
                'Bucket': self.bucket_name,
                'Key': storage_key,
            }
            
            if response_content_disposition:
                params['ResponseContentDisposition'] = response_content_disposition
            
            signed_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated signed URL for {storage_key}, expires in {expires_in}s")
            return signed_url
            
        except Exception as e:
            logger.error(f"Failed to generate signed URL for {storage_key}: {e}")
            # Fallback to regular URL
            return default_storage.url(storage_key)
    
    def delete_file(self, storage_key: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            storage_key: The storage key/path of the file to delete
        
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            if default_storage.exists(storage_key):
                default_storage.delete(storage_key)
                logger.info(f"File deleted successfully: {storage_key}")
                return True
            else:
                logger.warning(f"File not found for deletion: {storage_key}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete file {storage_key}: {e}")
            return False
    
    def file_exists(self, storage_key: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            storage_key: The storage key/path of the file
        
        Returns:
            True if file exists, False otherwise
        """
        try:
            return default_storage.exists(storage_key)
        except Exception as e:
            logger.error(f"Failed to check file existence {storage_key}: {e}")
            return False
    
    def get_file_info(self, storage_key: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a file in storage.
        
        Args:
            storage_key: The storage key/path of the file
        
        Returns:
            Dict with file information, or None if file doesn't exist
        """
        try:
            if not self.file_exists(storage_key):
                return None
            
            info = {
                'storage_key': storage_key,
                'file_url': default_storage.url(storage_key),
                'exists': True
            }
            
            # Try to get additional info for S3
            if self.is_s3_enabled:
                try:
                    response = self.s3_client.head_object(
                        Bucket=self.bucket_name,
                        Key=storage_key
                    )
                    info.update({
                        'size': response.get('ContentLength'),
                        'content_type': response.get('ContentType'),
                        'last_modified': response.get('LastModified'),
                        'etag': response.get('ETag', '').strip('"')
                    })
                except self.ClientError:
                    pass  # Fall back to basic info
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get file info for {storage_key}: {e}")
            return None


def extract_storage_key_from_url(file_url: str) -> str:
    """
    Extract storage key from a file URL.
    
    Args:
        file_url: The full file URL
    
    Returns:
        Storage key (path relative to storage root)
    """
    if not file_url:
        return ''
    
    try:
        # Handle both local and S3 URLs
        parsed = urlparse(file_url)
        
        if 'amazonaws.com' in parsed.netloc or 'minio' in parsed.netloc:
            # S3/MinIO URL: extract path after bucket name
            path_parts = parsed.path.strip('/').split('/')
            if len(path_parts) > 1:
                # Remove bucket name (first part) if present in path
                return '/'.join(path_parts[1:])
            else:
                return '/'.join(path_parts)
        else:
            # Local URL: extract path after /media/
            if '/media/' in file_url:
                return file_url.split('/media/', 1)[1]
            else:
                # Already a storage key
                return parsed.path.lstrip('/')
                
    except Exception as e:
        logger.error(f"Failed to extract storage key from URL {file_url}: {e}")
        return file_url


# Global instance
storage_service = StorageService()


def upload_report_file(file_content: BinaryIO, filename: str, **kwargs) -> Dict[str, Any]:
    """Convenience function for uploading report files."""
    return storage_service.upload_report_file(file_content, filename, **kwargs)


def generate_signed_url(storage_key: str, **kwargs) -> str:
    """Convenience function for generating signed URLs."""
    return storage_service.generate_signed_url(storage_key, **kwargs)


def delete_old_files(older_than_days: int = 7) -> int:
    """
    Delete files older than specified days.
    This is a simplified implementation - in production you might want
    to track file creation dates in the database.
    
    Args:
        older_than_days: Delete files older than this many days
    
    Returns:
        Number of files deleted
    """
    try:
        if not storage_service.is_s3_enabled:
            logger.info("File cleanup for local storage not implemented yet")
            return 0
        
        # For S3, we can use the list_objects_v2 API with filters
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=older_than_days)
        deleted_count = 0
        
        # List objects in the reports folder
        paginator = storage_service.s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(
            Bucket=storage_service.bucket_name,
            Prefix='reports/'
        )
        
        for page in pages:
            for obj in page.get('Contents', []):
                if obj['LastModified'] < cutoff_date:
                    try:
                        storage_service.s3_client.delete_object(
                            Bucket=storage_service.bucket_name,
                            Key=obj['Key']
                        )
                        deleted_count += 1
                        logger.info(f"Deleted old file: {obj['Key']}")
                    except Exception as e:
                        logger.error(f"Failed to delete {obj['Key']}: {e}")
        
        logger.info(f"Cleanup complete: deleted {deleted_count} files older than {older_than_days} days")
        return deleted_count
        
    except Exception as e:
        logger.error(f"File cleanup failed: {e}")
        return 0