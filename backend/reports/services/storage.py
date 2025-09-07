"""
Storage service for handling file uploads using Django's local filesystem storage.
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
    Storage service that uses Django's local filesystem storage.
    """
    
    def upload_report_file(
        self, 
        file_content: BinaryIO, 
        filename: str, 
        content_type: str = 'application/octet-stream',
        folder: str = 'reports'
    ) -> Dict[str, Any]:
        """
        Upload a file to local filesystem storage.
        
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
            file_url = default_storage.url(saved_path)
            
            logger.info(f"File uploaded successfully: {storage_key}")
            
            return {
                'storage_key': saved_path,
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
        Generate a URL for downloading a file.
        For local storage, this returns the regular URL.
        
        Args:
            storage_key: The storage key/path of the file
            expires_in: URL expiration time in seconds (ignored for local storage)
            response_content_disposition: Optional Content-Disposition header (ignored)
        
        Returns:
            File URL string
        """
        try:
            return default_storage.url(storage_key)
            
        except Exception as e:
            logger.error(f"Failed to generate URL for {storage_key}: {e}")
            return ""
    
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
        # For local URLs: extract path after /media/
        if '/media/' in file_url:
            return file_url.split('/media/', 1)[1]
        else:
            # Already a storage key
            parsed = urlparse(file_url)
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
    """Convenience function for generating URLs."""
    return storage_service.generate_signed_url(storage_key, **kwargs)


def delete_old_files(older_than_days: int = 7) -> int:
    """
    Delete files older than specified days.
    For local storage, this is a simplified implementation.
    
    Args:
        older_than_days: Delete files older than this many days
    
    Returns:
        Number of files deleted
    """
    try:
        logger.info("File cleanup for local storage not implemented yet")
        return 0
        
    except Exception as e:
        logger.error(f"File cleanup failed: {e}")
        return 0