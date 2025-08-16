"""
Generic utility functions for retrospective engine
Handles time conversion, data transformation, and file handling
"""
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone as dt_timezone
import pytz
from decimal import Decimal
import json
import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile


class RetrospectiveUtils:
    """
    Utility class for retrospective operations
    """
    
    @staticmethod
    def convert_timezone(datetime_obj: datetime, target_tz: str = 'UTC') -> datetime:
        """
        Convert datetime object to target timezone
        
        Args:
            datetime_obj: Datetime object to convert
            target_tz: Target timezone string (e.g., 'UTC', 'America/New_York')
            
        Returns:
            Converted datetime object
        """
        if datetime_obj.tzinfo is None:
            # Assume UTC if no timezone info
            datetime_obj = datetime_obj.replace(tzinfo=dt_timezone.utc)
        
        target_timezone = pytz.timezone(target_tz)
        return datetime_obj.astimezone(target_timezone)
    
    @staticmethod
    def format_duration(seconds: float) -> str:
        """
        Format duration in seconds to human-readable string
        
        Args:
            seconds: Duration in seconds
            
        Returns:
            Formatted duration string (e.g., "2h 30m 15s")
        """
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            remaining_seconds = int(seconds % 60)
            return f"{minutes}m {remaining_seconds}s"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            remaining_seconds = int(seconds % 60)
            return f"{hours}h {minutes}m {remaining_seconds}s"
    
    @staticmethod
    def transform_kpi_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform raw KPI data into standardized format
        
        Args:
            raw_data: Raw KPI data from source systems
            
        Returns:
            Transformed KPI data
        """
        transformed_data = {
            'metric_name': raw_data.get('metric_name', '').upper(),
            'value': float(raw_data.get('value', 0)),
            'unit': raw_data.get('unit', '%'),
            'source': raw_data.get('source', 'manual'),
            'recorded_at': raw_data.get('recorded_at'),
            'target_value': float(raw_data.get('target_value', 0)) if raw_data.get('target_value') else None,
            'raw_data': raw_data
        }
        
        # Validate and clean data
        if transformed_data['value'] < 0:
            transformed_data['value'] = 0
        
        if transformed_data['target_value'] is not None and transformed_data['target_value'] < 0:
            transformed_data['target_value'] = 0
        
        return transformed_data
    
    @staticmethod
    def normalize_metric_name(metric_name: str) -> str:
        """
        Normalize metric name to standard format
        
        Args:
            metric_name: Raw metric name
            
        Returns:
            Normalized metric name
        """
        # Common metric name mappings
        metric_mappings = {
            'roi': 'ROI',
            'return_on_investment': 'ROI',
            'ctr': 'CTR',
            'click_through_rate': 'CTR',
            'cpc': 'CPC',
            'cost_per_click': 'CPC',
            'cpa': 'CPA',
            'cost_per_acquisition': 'CPA',
            'conversion_rate': 'CONVERSION_RATE',
            'impression_share': 'IMPRESSION_SHARE',
            'budget_utilization': 'BUDGET_UTILIZATION',
            'spend': 'SPEND',
            'impressions': 'IMPRESSIONS',
            'clicks': 'CLICKS',
            'conversions': 'CONVERSIONS'
        }
        
        normalized = metric_name.lower().strip()
        return metric_mappings.get(normalized, metric_name.upper())
    
    @staticmethod
    def handle_file_upload(file_obj, storage_path: str, filename: Optional[str] = None) -> str:
        """
        Handle file upload and return file URL
        
        Args:
            file_obj: File object to upload
            storage_path: Storage path for the file
            filename: Optional custom filename
            
        Returns:
            File URL
        """
        if filename is None:
            # Generate unique filename
            file_extension = os.path.splitext(file_obj.name)[1] if hasattr(file_obj, 'name') else '.pdf'
            filename = f"{uuid.uuid4()}{file_extension}"
        
        # Ensure storage path exists
        full_path = os.path.join(storage_path, filename)
        
        # Save file using Django's storage system
        if hasattr(file_obj, 'read'):
            # File-like object
            saved_path = default_storage.save(full_path, ContentFile(file_obj.read()))
        else:
            # String or bytes
            saved_path = default_storage.save(full_path, ContentFile(file_obj))
        
        # Return URL
        return default_storage.url(saved_path)
    
    @staticmethod
    def generate_report_filename(retrospective_id: str, file_type: str = 'pdf') -> str:
        """
        Generate standardized filename for reports
        
        Args:
            retrospective_id: ID of the retrospective
            file_type: File type extension
            
        Returns:
            Generated filename
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"retrospective_{retrospective_id}_{timestamp}.{file_type}"
    
    @staticmethod
    def validate_json_data(data: str) -> bool:
        """
        Validate JSON data string
        
        Args:
            data: JSON string to validate
            
        Returns:
            True if valid JSON, False otherwise
        """
        try:
            json.loads(data)
            return True
        except (json.JSONDecodeError, TypeError):
            return False
    
    @staticmethod
    def safe_decimal_conversion(value: Union[str, float, int, Decimal]) -> Decimal:
        """
        Safely convert value to Decimal
        
        Args:
            value: Value to convert
            
        Returns:
            Decimal value
        """
        try:
            if isinstance(value, Decimal):
                return value
            elif isinstance(value, (int, float)):
                return Decimal(str(value))
            elif isinstance(value, str):
                return Decimal(value)
            else:
                return Decimal('0')
        except (ValueError, TypeError):
            return Decimal('0')
    
    @staticmethod
    def calculate_percentage_change(old_value: float, new_value: float) -> float:
        """
        Calculate percentage change between two values
        
        Args:
            old_value: Old value
            new_value: New value
            
        Returns:
            Percentage change (positive for increase, negative for decrease)
        """
        if old_value == 0:
            return 0.0 if new_value == 0 else 100.0
        
        return ((new_value - old_value) / old_value) * 100
    
    @staticmethod
    def format_currency(amount: float, currency: str = 'USD') -> str:
        """
        Format amount as currency string
        
        Args:
            amount: Amount to format
            currency: Currency code
            
        Returns:
            Formatted currency string
        """
        currency_symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥'
        }
        
        symbol = currency_symbols.get(currency, currency)
        return f"{symbol}{amount:,.2f}"
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 100) -> str:
        """
        Truncate text to specified length
        
        Args:
            text: Text to truncate
            max_length: Maximum length
            
        Returns:
            Truncated text
        """
        if len(text) <= max_length:
            return text
        
        return text[:max_length-3] + "..."
    
    @staticmethod
    def generate_unique_id(prefix: str = 'retro') -> str:
        """
        Generate unique ID with prefix
        
        Args:
            prefix: Prefix for the ID
            
        Returns:
            Unique ID string
        """
        return f"{prefix}_{uuid.uuid4().hex[:8]}"
    
    @staticmethod
    def validate_email_format(email: str) -> bool:
        """
        Basic email format validation
        
        Args:
            email: Email address to validate
            
        Returns:
            True if valid email format
        """
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename for safe storage
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        import re
        # Remove or replace unsafe characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove leading/trailing spaces and dots
        sanitized = sanitized.strip(' .')
        # Limit length
        if len(sanitized) > 255:
            name, ext = os.path.splitext(sanitized)
            sanitized = name[:255-len(ext)] + ext
        
        return sanitized or 'unnamed_file' 