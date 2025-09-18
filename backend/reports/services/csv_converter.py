# =============================
# File: /app/reports/services/csv_converter.py
# Purpose: Global CSV to JSON conversion service with data accuracy validation
# Features:
# - Support multiple CSV formats and encodings
# - Data type inference and validation
# - Error handling and logging
# - Configurable conversion options
# - Memory-efficient processing for large files
# =============================

from __future__ import annotations
from typing import Dict, Any, List, Optional, Union, Iterator
import csv
import json
import logging
import io
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
import re

log = logging.getLogger(__name__)


class CSVConversionError(Exception):
    """Custom exception for CSV conversion errors"""
    pass


class DataValidationError(Exception):
    """Custom exception for data validation errors"""
    pass


class CSVConverter:
    """
    Global CSV to JSON converter with data accuracy validation.
    
    This service provides comprehensive CSV conversion capabilities with:
    - Automatic encoding detection
    - Data type inference
    - Validation and error handling
    - Configurable options
    - Memory-efficient processing
    """
    
    def __init__(self, 
                 encoding: Optional[str] = None,
                 delimiter: Optional[str] = None,
                 quotechar: str = '"',
                 skip_initial_space: bool = True,
                 strict_validation: bool = True):
        """
        Initialize CSV converter with configuration options.
        
        Args:
            encoding: File encoding (auto-detected if None)
            delimiter: CSV delimiter (auto-detected if None)
            quotechar: Quote character for CSV fields
            skip_initial_space: Skip leading whitespace in fields
            strict_validation: Enable strict data validation
        """
        self.encoding = encoding
        self.delimiter = delimiter
        self.quotechar = quotechar
        self.skip_initial_space = skip_initial_space
        self.strict_validation = strict_validation
        
        # Data type patterns for validation
        self.type_patterns = {
            'integer': re.compile(r'^-?\d+$'),
            'float': re.compile(r'^-?\d+\.\d+$'),
            'currency': re.compile(r'^[\$€£¥]?\s*-?\d{1,3}(,\d{3})*(\.\d{2})?$'),
            'percentage': re.compile(r'^-?\d+(\.\d+)?%$'),
            'date_iso': re.compile(r'^\d{4}-\d{2}-\d{2}$'),
            'date_us': re.compile(r'^\d{2}/\d{2}/\d{4}$'),
            'date_eu': re.compile(r'^\d{2}/\d{2}/\d{4}$'),
            'datetime': re.compile(r'^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}'),
            'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
            'url': re.compile(r'^https?://[^\s/$.?#].[^\s]*$'),
            'boolean': re.compile(r'^(true|false|yes|no|1|0|y|n)$', re.IGNORECASE),
            'dash': re.compile(r'^-$')  # Special case for dash values
        }
    
    def detect_encoding(self, file_path: str) -> str:
        """
        Detect file encoding using Python standard library methods.
        
        Args:
            file_path: Path to the CSV file
            
        Returns:
            Detected encoding string
            
        Raises:
            CSVConversionError: If encoding detection fails
        """
        try:
            # Common encodings to try in order of likelihood
            encodings_to_try = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
            
            with open(file_path, 'rb') as f:
                raw_data = f.read(10000)  # Read first 10KB for detection
            
            # Try each encoding
            for encoding in encodings_to_try:
                try:
                    # Try to decode the data
                    decoded = raw_data.decode(encoding)
                    
                    # Check if it contains common CSV characters
                    if any(char in decoded for char in [',', ';', '\t', '"', '\n']):
                        log.info(f"Detected encoding: {encoding}")
                        return encoding
                        
                except (UnicodeDecodeError, UnicodeError):
                    continue
            
            # If all encodings fail, try UTF-8 with error handling
            try:
                raw_data.decode('utf-8', errors='ignore')
                log.warning("Using UTF-8 with error handling")
                return 'utf-8'
            except Exception:
                pass
            
            # Final fallback
            log.warning("Could not detect encoding, using UTF-8")
            return 'utf-8'
            
        except Exception as e:
            log.error(f"Encoding detection failed: {e}")
            return 'utf-8'  # Fallback to UTF-8
    
    def detect_delimiter(self, file_path: str, encoding: str) -> str:
        """
        Detect CSV delimiter by analyzing the first few lines.
        
        Args:
            file_path: Path to the CSV file
            encoding: File encoding
            
        Returns:
            Detected delimiter character
        """
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                sample = f.read(1024)  # Read first 1KB
            
            # Common delimiters to test
            delimiters = [',', ';', '\t', '|', ':']
            delimiter_counts = {}
            
            for delimiter in delimiters:
                count = sample.count(delimiter)
                if count > 0:
                    delimiter_counts[delimiter] = count
            
            if not delimiter_counts:
                return ','  # Default to comma
            
            # Return delimiter with highest count
            detected = max(delimiter_counts, key=delimiter_counts.get)
            log.info(f"Detected delimiter: '{detected}' (count: {delimiter_counts[detected]})")
            return detected
            
        except Exception as e:
            log.error(f"Delimiter detection failed: {e}")
            return ','  # Default to comma
    
    def infer_data_type(self, value: str) -> str:
        """
        Infer data type from string value.
        
        Args:
            value: String value to analyze
            
        Returns:
            Inferred data type
        """
        if not value or value.strip() == '':
            return 'null'
        
        value = value.strip()
        
        # Check patterns in order of specificity
        for data_type, pattern in self.type_patterns.items():
            if pattern.match(value):
                return data_type
        
        # Check for numeric values without specific patterns
        try:
            # Handle negative values and large numbers
            clean_value = value.replace(',', '').replace('$', '').replace('%', '')
            float(clean_value)
            return 'numeric'
        except ValueError:
            pass
        
        return 'string'
    
    def convert_value(self, value: str, target_type: Optional[str] = None) -> Any:
        """
        Convert string value to appropriate Python type.
        
        Args:
            value: String value to convert
            target_type: Target data type (auto-inferred if None)
            
        Returns:
            Converted value
            
        Raises:
            DataValidationError: If conversion fails and strict validation is enabled
        """
        if not value or value.strip() == '':
            return None
        
        value = value.strip()
        
        # Handle special cases first
        if value == '-':
            return None  # Treat dash as null/empty value
        
        if target_type is None:
            target_type = self.infer_data_type(value)
        
        try:
            if target_type == 'null':
                return None
            elif target_type == 'integer':
                # Handle negative integers and large numbers
                clean_value = value.replace(',', '')
                return int(clean_value)
            elif target_type == 'dash':
                return None  # Treat dash as null
            elif target_type in ['float', 'numeric']:
                # Handle negative values, currency and percentage symbols
                clean_value = value.replace(',', '').replace('$', '').replace('%', '')
                return float(clean_value)
            elif target_type == 'currency':
                clean_value = value.replace(',', '').replace('$', '').replace('€', '').replace('£', '').replace('¥', '')
                return float(clean_value)
            elif target_type == 'percentage':
                clean_value = value.replace('%', '')
                return float(clean_value) / 100
            elif target_type == 'boolean':
                return value.lower() in ['true', 'yes', '1', 'y']
            elif target_type == 'date_iso':
                return datetime.strptime(value, '%Y-%m-%d').date()
            elif target_type == 'date_us':
                return datetime.strptime(value, '%m/%d/%Y').date()
            elif target_type == 'date_eu':
                return datetime.strptime(value, '%d/%m/%Y').date()
            elif target_type == 'datetime':
                # Try common datetime formats
                for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%m/%d/%Y %H:%M:%S']:
                    try:
                        return datetime.strptime(value, fmt)
                    except ValueError:
                        continue
                raise ValueError(f"Unsupported datetime format: {value}")
            else:
                return value  # Return as string
                
        except (ValueError, InvalidOperation) as e:
            if self.strict_validation:
                raise DataValidationError(f"Failed to convert '{value}' to {target_type}: {e}")
            else:
                log.warning(f"Conversion failed for '{value}' to {target_type}: {e}")
                return value  # Return original value as fallback
    
    def validate_row(self, row: Dict[str, Any], headers: List[str]) -> Dict[str, Any]:
        """
        Validate and clean a data row.
        
        Args:
            row: Dictionary representing a data row
            headers: List of expected headers
            
        Returns:
            Validated and cleaned row
            
        Raises:
            DataValidationError: If validation fails and strict mode is enabled
        """
        validated_row = {}
        
        for header in headers:
            value = row.get(header, '')
            
            # Convert value based on inferred type
            try:
                converted_value = self.convert_value(value)
                validated_row[header] = converted_value
            except DataValidationError as e:
                if self.strict_validation:
                    raise
                else:
                    log.warning(f"Validation warning for header '{header}': {e}")
                    validated_row[header] = value
        
        return validated_row
    
    def convert_file_to_json(self, 
                           file_path: str,
                           output_path: Optional[str] = None,
                           max_rows: Optional[int] = None,
                           include_metadata: bool = True) -> Union[Dict[str, Any], str]:
        """
        Convert CSV file to JSON format.
        
        Args:
            file_path: Path to input CSV file
            output_path: Path to output JSON file (optional)
            max_rows: Maximum number of rows to process (optional)
            include_metadata: Include conversion metadata in output
            
        Returns:
            JSON data as dictionary or file path if output_path provided
            
        Raises:
            CSVConversionError: If conversion fails
        """
        try:
            # Detect encoding and delimiter
            encoding = self.encoding or self.detect_encoding(file_path)
            delimiter = self.delimiter or self.detect_delimiter(file_path, encoding)
            
            log.info(f"Converting CSV file: {file_path}")
            log.info(f"Using encoding: {encoding}, delimiter: '{delimiter}'")
            
            # Read CSV file
            with open(file_path, 'r', encoding=encoding) as csvfile:
                # Create CSV reader
                reader = csv.DictReader(
                    csvfile,
                    delimiter=delimiter,
                    quotechar=self.quotechar,
                    skipinitialspace=self.skip_initial_space
                )
                
                headers = reader.fieldnames or []
                if not headers:
                    raise CSVConversionError("No headers found in CSV file")
                
                log.info(f"Found headers: {headers}")
                
                # Process rows
                data_rows = []
                row_count = 0
                error_count = 0
                
                for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                    try:
                        # Validate and convert row
                        validated_row = self.validate_row(row, headers)
                        data_rows.append(validated_row)
                        row_count += 1
                        
                        # Check max_rows limit
                        if max_rows and row_count >= max_rows:
                            log.info(f"Reached max_rows limit: {max_rows}")
                            break
                            
                    except DataValidationError as e:
                        error_count += 1
                        log.error(f"Row {row_num} validation failed: {e}")
                        
                        if self.strict_validation:
                            raise CSVConversionError(f"Row {row_num} validation failed: {e}")
                        else:
                            # Skip invalid rows in non-strict mode
                            continue
                
                # Prepare result
                result = {
                    'data': data_rows,
                    'row_count': row_count,
                    'headers': headers
                }
                
                if include_metadata:
                    result['metadata'] = {
                        'source_file': file_path,
                        'encoding': encoding,
                        'delimiter': delimiter,
                        'conversion_timestamp': datetime.now().isoformat(),
                        'error_count': error_count,
                        'strict_validation': self.strict_validation
                    }
                
                # Output result
                if output_path:
                    with open(output_path, 'w', encoding='utf-8') as jsonfile:
                        json.dump(result, jsonfile, indent=2, ensure_ascii=False, default=str)
                    log.info(f"JSON file saved to: {output_path}")
                    return output_path
                else:
                    return result
                    
        except Exception as e:
            log.error(f"CSV conversion failed: {e}")
            raise CSVConversionError(f"CSV conversion failed: {e}")
    
    def convert_string_to_json(self, 
                              csv_string: str,
                              encoding: str = 'utf-8',
                              max_rows: Optional[int] = None) -> Dict[str, Any]:
        """
        Convert CSV string to JSON format.
        
        Args:
            csv_string: CSV content as string
            encoding: String encoding
            max_rows: Maximum number of rows to process
            
        Returns:
            JSON data as dictionary
            
        Raises:
            CSVConversionError: If conversion fails
        """
        try:
            # Create StringIO object
            csv_io = io.StringIO(csv_string)
            
            # Detect delimiter from string
            delimiter = self.delimiter or self.detect_delimiter_from_string(csv_string)
            
            # Create CSV reader
            reader = csv.DictReader(
                csv_io,
                delimiter=delimiter,
                quotechar=self.quotechar,
                skipinitialspace=self.skip_initial_space
            )
            
            headers = reader.fieldnames or []
            if not headers:
                raise CSVConversionError("No headers found in CSV string")
            
            # Process rows
            data_rows = []
            row_count = 0
            
            for row in reader:
                try:
                    validated_row = self.validate_row(row, headers)
                    # Add row number to each data row
                    validated_row['_row_number'] = row_count + 1
                    data_rows.append(validated_row)
                    row_count += 1
                    
                    if max_rows and row_count >= max_rows:
                        break
                        
                except DataValidationError as e:
                    if self.strict_validation:
                        raise CSVConversionError(f"Row validation failed: {e}")
                    else:
                        continue
            
            return {
                'data': data_rows,
                'row_count': row_count,
                'headers': headers,
                'metadata': {
                    'delimiter': delimiter,
                    'conversion_timestamp': datetime.now().isoformat(),
                    'strict_validation': self.strict_validation
                }
            }
            
        except Exception as e:
            log.error(f"CSV string conversion failed: {e}")
            raise CSVConversionError(f"CSV string conversion failed: {e}")
    
    def detect_delimiter_from_string(self, csv_string: str) -> str:
        """Detect delimiter from CSV string content."""
        delimiters = [',', ';', '\t', '|', ':']
        delimiter_counts = {}
        
        # Use first few lines for detection
        lines = csv_string.split('\n')[:5]
        sample = '\n'.join(lines)
        
        for delimiter in delimiters:
            count = sample.count(delimiter)
            if count > 0:
                delimiter_counts[delimiter] = count
        
        if not delimiter_counts:
            return ','
        
        return max(delimiter_counts, key=delimiter_counts.get)


# Global converter instance for easy access
default_converter = CSVConverter()


def convert_csv_to_json(file_path: str, 
                       output_path: Optional[str] = None,
                       **kwargs) -> Union[Dict[str, Any], str]:
    """
    Convenience function for CSV to JSON conversion.
    
    Args:
        file_path: Path to input CSV file
        output_path: Path to output JSON file (optional)
        **kwargs: Additional converter options
        
    Returns:
        JSON data or file path
    """
    converter = CSVConverter(**kwargs)
    return converter.convert_file_to_json(file_path, output_path)


def convert_csv_string_to_json(csv_string: str, **kwargs) -> Dict[str, Any]:
    """
    Convenience function for CSV string to JSON conversion.
    
    Args:
        csv_string: CSV content as string
        **kwargs: Additional converter options
        
    Returns:
        JSON data as dictionary
    """
    converter = CSVConverter(**kwargs)
    return converter.convert_string_to_json(csv_string)
