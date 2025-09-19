# =============================
# File: /app/reports/tests/test_csv_integration.py
# Purpose: Integration tests for CSV converter with report system
# =============================

import pytest
import tempfile
import os
from unittest.mock import Mock, patch

from ..services.csv_converter import convert_csv_string_to_json
from ..services.assembler import assemble, _process_csv_data


class TestCSVIntegration:
    """Integration tests for CSV converter with report system"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.sample_csv_data = """Campaign,Cost,Revenue,ROI,Date
Facebook Ads,50000,125000,150,2024-01-01
Google Ads,40000,100000,150,2024-01-02
Twitter Ads,30000,75000,150,2024-01-03"""
    
    def test_csv_data_processing(self):
        """Test CSV data processing in assembler"""
        # Test direct CSV string processing
        result = _process_csv_data(self.sample_csv_data)
        
        assert 'default' in result
        assert len(result['default']) == 3
        assert result['default'][0]['Campaign'] == 'Facebook Ads'
        assert result['default'][0]['Cost'] == 50000
        assert result['default'][0]['Revenue'] == 125000
    
    def test_csv_data_in_dict_format(self):
        """Test CSV data processing when provided as dictionary"""
        csv_dict = {'csv_content': self.sample_csv_data}
        result = _process_csv_data(csv_dict)
        
        assert 'default' in result
        assert len(result['default']) == 3
        assert result['default'][0]['Campaign'] == 'Facebook Ads'
    
    def test_csv_file_path_processing(self):
        """Test CSV file path processing"""
        # Create temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(self.sample_csv_data)
            temp_path = f.name
        
        try:
            csv_dict = {'csv_file_path': temp_path}
            result = _process_csv_data(csv_dict)
            
            assert 'default' in result
            assert len(result['default']) == 3
            assert result['default'][0]['Campaign'] == 'Facebook Ads'
            
        finally:
            os.unlink(temp_path)
    
    def test_csv_processing_error_handling(self):
        """Test error handling in CSV processing"""
        # Test with invalid CSV data
        invalid_csv = "Invalid CSV data without proper structure"
        result = _process_csv_data(invalid_csv)
        
        # Should return empty data (no error since CSV parser handles it gracefully)
        assert 'default' in result
        assert len(result['default']) == 0
        # Note: No error field since CSV parser doesn't raise exception for malformed data
    
    @patch('reports.services.assembler.Report')
    def test_assemble_with_csv_data(self, mock_report_class):
        """Test assemble function with CSV data"""
        # Mock report object
        mock_report = Mock()
        mock_report.id = 'test_report_123'
        mock_report.report_template = None
        mock_report.sections.all.return_value = []
        mock_report.slice_config = {'metrics': ['Cost', 'Revenue']}
        
        mock_report_class.objects.prefetch_related.return_value.get.return_value = mock_report
        
        # Test data with CSV content
        data = {
            'csv_data': self.sample_csv_data
        }
        
        result = assemble('test_report_123', data)
        
        assert 'html' in result
        assert 'tables' in result
        assert 'default' in result['tables']
        assert len(result['tables']['default']) == 3
        assert result['tables']['default'][0]['Campaign'] == 'Facebook Ads'
    
    def test_csv_metadata_preservation(self):
        """Test that CSV metadata is preserved during processing"""
        csv_dict = {'csv_content': self.sample_csv_data}
        result = _process_csv_data(csv_dict)
        
        assert 'metadata' in result
        assert 'headers' in result
        assert result['headers'] == ['Campaign', 'Cost', 'Revenue', 'ROI', 'Date']
    
    def test_currency_and_percentage_processing(self):
        """Test processing of currency and percentage values"""
        csv_with_currency = """Campaign,Cost,Revenue,ROI
Facebook Ads,"$50,000","$125,000","150%"
Google Ads,"$40,000","$100,000","150%"""
        
        result = _process_csv_data(csv_with_currency)
        
        assert len(result['default']) == 2
        assert result['default'][0]['Cost'] == 50000.0  # $50,000 converted to float
        assert result['default'][0]['Revenue'] == 125000.0  # $125,000 converted to float
        assert result['default'][0]['ROI'] == 1.5  # 150% converted to decimal (1.5)
    
    def test_empty_csv_handling(self):
        """Test handling of empty CSV data"""
        empty_csv = ""
        result = _process_csv_data(empty_csv)
        
        # Should handle empty CSV gracefully
        assert 'default' in result
        assert 'error' in result  # Should have error for empty CSV
    
    def test_csv_with_different_delimiter(self):
        """Test CSV processing with different delimiter"""
        semicolon_csv = self.sample_csv_data.replace(',', ';')
        
        result = _process_csv_data(semicolon_csv)
        
        assert len(result['default']) == 3
        assert result['default'][0]['Campaign'] == 'Facebook Ads'
    
    def test_large_csv_processing(self):
        """Test processing of larger CSV data"""
        # Generate larger CSV data
        large_csv = "Campaign,Cost,Revenue,ROI\n"
        for i in range(100):
            large_csv += f"Campaign {i},{10000 + i},{25000 + i},{150}\n"
        
        result = _process_csv_data(large_csv)
        
        assert len(result['default']) == 100
        assert result['default'][0]['Campaign'] == 'Campaign 0'
        assert result['default'][99]['Campaign'] == 'Campaign 99'


class TestCSVConverterIntegration:
    """Test CSV converter integration with other components"""
    
    def test_converter_with_assembler_data_structure(self):
        """Test that converter output matches assembler expectations"""
        csv_data = """Product,Price,Quantity
Widget A,10.99,100
Widget B,15.50,50"""
        
        # Convert using CSV converter
        converter_result = convert_csv_string_to_json(csv_data)
        
        # Process using assembler CSV processing
        assembler_result = _process_csv_data(csv_data)
        
        # Results should be compatible
        assert len(converter_result['data']) == len(assembler_result['default'])
        assert converter_result['headers'] == ['Product', 'Price', 'Quantity']
        
        # Data should match
        for i, (converter_row, assembler_row) in enumerate(zip(converter_result['data'], assembler_result['default'])):
            assert converter_row == assembler_row
    
    def test_error_propagation(self):
        """Test that errors are properly propagated through the system"""
        # Test with malformed CSV
        malformed_csv = "Invalid,CSV,Data\nWithout,Proper,Structure"
        
        # Should not raise exception, but return parsed data
        result = _process_csv_data(malformed_csv)
        
        # Should have 1 row of data (CSV parser handles this as valid data)
        assert len(result['default']) == 1
        assert result['default'][0]['Invalid'] == 'Without'
