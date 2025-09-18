# =============================
# File: /app/reports/tests/test_csv_converter.py
# Purpose: Test cases for CSV to JSON conversion functionality
# =============================

import pytest
import tempfile
import os
import json
from datetime import datetime, date
from decimal import Decimal

from ..services.csv_converter import (
    CSVConverter, 
    CSVConversionError, 
    DataValidationError,
    convert_csv_to_json,
    convert_csv_string_to_json
)


class TestCSVConverter:
    """Test cases for CSVConverter class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.converter = CSVConverter()
        self.sample_csv_data = """Campaign,Cost,Revenue,ROI,Date
Facebook Ads,50000,125000,150,2024-01-01
Google Ads,40000,100000,150,2024-01-02
Twitter Ads,30000,75000,150,2024-01-03"""
        
        self.sample_csv_with_currency = """Campaign,Cost,Revenue,ROI
Facebook Ads,$50,000,$125,000,150%
Google Ads,$40,000,$100,000,150%
Twitter Ads,$30,000,$75,000,150%"""
    
    def test_encoding_detection(self):
        """Test automatic encoding detection"""
        # Create a temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(self.sample_csv_data)
            temp_path = f.name
        
        try:
            encoding = self.converter.detect_encoding(temp_path)
            # Should detect UTF-8 or fallback to UTF-8
            assert encoding in ['utf-8', 'utf-8-sig']
        finally:
            os.unlink(temp_path)
    
    def test_delimiter_detection(self):
        """Test automatic delimiter detection"""
        # Test comma delimiter
        delimiter = self.converter.detect_delimiter_from_string(self.sample_csv_data)
        assert delimiter == ','
        
        # Test semicolon delimiter
        semicolon_data = self.sample_csv_data.replace(',', ';')
        delimiter = self.converter.detect_delimiter_from_string(semicolon_data)
        assert delimiter == ';'
    
    def test_data_type_inference(self):
        """Test data type inference"""
        assert self.converter.infer_data_type('123') == 'integer'
        assert self.converter.infer_data_type('123.45') == 'float'
        assert self.converter.infer_data_type('$1,234.56') == 'currency'
        assert self.converter.infer_data_type('15.5%') == 'percentage'
        assert self.converter.infer_data_type('2024-01-01') == 'date_iso'
        assert self.converter.infer_data_type('01/01/2024') == 'date_us'
        assert self.converter.infer_data_type('true') == 'boolean'
        assert self.converter.infer_data_type('test@example.com') == 'email'
        assert self.converter.infer_data_type('https://example.com') == 'url'
        assert self.converter.infer_data_type('') == 'null'
        assert self.converter.infer_data_type('hello world') == 'string'
    
    def test_value_conversion(self):
        """Test value conversion to appropriate types"""
        # Test integer conversion
        assert self.converter.convert_value('123') == 123
        assert self.converter.convert_value('123', 'integer') == 123
        
        # Test float conversion
        assert self.converter.convert_value('123.45') == 123.45
        assert self.converter.convert_value('123.45', 'float') == 123.45
        
        # Test currency conversion
        assert self.converter.convert_value('$1,234.56', 'currency') == 1234.56
        assert self.converter.convert_value('€1,234.56', 'currency') == 1234.56
        
        # Test percentage conversion
        assert self.converter.convert_value('15.5%', 'percentage') == 0.155
        
        # Test boolean conversion
        assert self.converter.convert_value('true', 'boolean') == True
        assert self.converter.convert_value('false', 'boolean') == False
        assert self.converter.convert_value('yes', 'boolean') == True
        assert self.converter.convert_value('no', 'boolean') == False
        
        # Test date conversion
        assert self.converter.convert_value('2024-01-01', 'date_iso') == date(2024, 1, 1)
        assert self.converter.convert_value('01/01/2024', 'date_us') == date(2024, 1, 1)
        
        # Test null conversion
        assert self.converter.convert_value('') == None
        assert self.converter.convert_value('   ') == None
    
    def test_string_to_json_conversion(self):
        """Test CSV string to JSON conversion"""
        result = self.converter.convert_string_to_json(self.sample_csv_data)
        
        assert 'data' in result
        assert 'headers' in result
        assert 'row_count' in result
        assert 'metadata' in result
        
        assert result['headers'] == ['Campaign', 'Cost', 'Revenue', 'ROI', 'Date']
        assert result['row_count'] == 3
        
        # Check first row data
        first_row = result['data'][0]
        assert first_row['Campaign'] == 'Facebook Ads'
        assert first_row['Cost'] == 50000
        assert first_row['Revenue'] == 125000
        assert first_row['ROI'] == 150
        assert first_row['Date'] == date(2024, 1, 1)
    
    def test_currency_and_percentage_conversion(self):
        """Test conversion with currency and percentage symbols"""
        result = self.converter.convert_string_to_json(self.sample_csv_with_currency)
        
        assert result['row_count'] == 3
        
        # Check first row with currency symbols
        first_row = result['data'][0]
        assert first_row['Campaign'] == 'Facebook Ads'
        assert first_row['Cost'] == 50000.0  # $50,000 converted to float
        assert first_row['Revenue'] == 125000.0  # $125,000 converted to float
        assert first_row['ROI'] == 1.5  # 150% converted to decimal (1.5)
    
    def test_file_to_json_conversion(self):
        """Test CSV file to JSON conversion"""
        # Create temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(self.sample_csv_data)
            temp_csv_path = f.name
        
        try:
            # Test conversion to dictionary
            result = self.converter.convert_file_to_json(temp_csv_path)
            
            assert 'data' in result
            assert 'headers' in result
            assert 'row_count' == 3
            assert len(result['data']) == 3
            
            # Test conversion to file
            with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
                temp_json_path = f.name
            
            try:
                output_path = self.converter.convert_file_to_json(temp_csv_path, temp_json_path)
                assert output_path == temp_json_path
                
                # Verify JSON file was created and contains correct data
                with open(temp_json_path, 'r', encoding='utf-8') as f:
                    file_result = json.load(f)
                
                assert file_result['row_count'] == 3
                assert len(file_result['data']) == 3
                
            finally:
                if os.path.exists(temp_json_path):
                    os.unlink(temp_json_path)
                    
        finally:
            os.unlink(temp_csv_path)
    
    def test_max_rows_limit(self):
        """Test max_rows parameter"""
        result = self.converter.convert_string_to_json(self.sample_csv_data, max_rows=2)
        
        assert result['row_count'] == 2
        assert len(result['data']) == 2
    
    def test_strict_validation(self):
        """Test strict validation mode"""
        # Test with invalid data
        invalid_csv = """Campaign,Cost,Revenue
Facebook Ads,invalid_number,125000
Google Ads,40000,invalid_number"""
        
        # Test strict mode (should raise exception)
        strict_converter = CSVConverter(strict_validation=True)
        with pytest.raises(CSVConversionError):
            strict_converter.convert_string_to_json(invalid_csv)
        
        # Test non-strict mode (should skip invalid rows)
        lenient_converter = CSVConverter(strict_validation=False)
        result = lenient_converter.convert_string_to_json(invalid_csv)
        
        # Should have 0 valid rows
        assert result['row_count'] == 0
        assert len(result['data']) == 0
    
    def test_custom_delimiter(self):
        """Test custom delimiter handling"""
        semicolon_data = self.sample_csv_data.replace(',', ';')
        
        converter = CSVConverter(delimiter=';')
        result = converter.convert_string_to_json(semicolon_data)
        
        assert result['row_count'] == 3
        assert result['headers'] == ['Campaign', 'Cost', 'Revenue', 'ROI', 'Date']
    
    def test_empty_file_handling(self):
        """Test handling of empty CSV files"""
        empty_csv = ""
        
        with pytest.raises(CSVConversionError):
            self.converter.convert_string_to_json(empty_csv)
    
    def test_header_only_file(self):
        """Test handling of CSV files with only headers"""
        header_only = "Campaign,Cost,Revenue,ROI"
        
        result = self.converter.convert_string_to_json(header_only)
        
        assert result['row_count'] == 0
        assert result['headers'] == ['Campaign', 'Cost', 'Revenue', 'ROI']
        assert len(result['data']) == 0


class TestConvenienceFunctions:
    """Test convenience functions"""
    
    def test_convert_csv_to_json_function(self):
        """Test convert_csv_to_json convenience function"""
        sample_data = """Campaign,Cost,Revenue
Facebook Ads,50000,125000
Google Ads,40000,100000"""
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(sample_data)
            temp_path = f.name
        
        try:
            result = convert_csv_to_json(temp_path)
            
            assert 'data' in result
            assert result['row_count'] == 2
            assert len(result['data']) == 2
            
        finally:
            os.unlink(temp_path)
    
    def test_convert_csv_string_to_json_function(self):
        """Test convert_csv_string_to_json convenience function"""
        sample_data = """Campaign,Cost,Revenue
Facebook Ads,50000,125000
Google Ads,40000,100000"""
        
        result = convert_csv_string_to_json(sample_data)
        
        assert 'data' in result
        assert result['row_count'] == 2
        assert len(result['data']) == 2


class TestErrorHandling:
    """Test error handling scenarios"""
    
    def test_file_not_found(self):
        """Test handling of non-existent files"""
        converter = CSVConverter()
        
        with pytest.raises(CSVConversionError):
            converter.convert_file_to_json('/non/existent/file.csv')
    
    def test_invalid_encoding(self):
        """Test handling of invalid encoding"""
        converter = CSVConverter(encoding='invalid_encoding')
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write("Campaign,Cost\nFacebook Ads,50000")
            temp_path = f.name
        
        try:
            with pytest.raises(CSVConversionError):
                converter.convert_file_to_json(temp_path)
        finally:
            os.unlink(temp_path)
    
    def test_malformed_csv(self):
        """Test handling of malformed CSV data"""
        malformed_csv = """Campaign,Cost,Revenue
Facebook Ads,50000,125000
Google Ads,40000"""  # Missing Revenue column
        
        converter = CSVConverter(strict_validation=True)
        
        # Should handle missing columns gracefully
        result = converter.convert_string_to_json(malformed_csv)
        
        assert result['row_count'] == 2
        # Second row should have None for missing Revenue
        assert result['data'][1]['Revenue'] is None
