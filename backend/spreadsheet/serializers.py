"""
Serializers for spreadsheet models
Handles API serialization and deserialization following OpenAPI specification
"""
from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    Spreadsheet, Sheet, SheetRow, SheetColumn, Cell, CellValueType
)


class SpreadsheetSerializer(serializers.ModelSerializer):
    """Serializer for Spreadsheet model (read operations)"""
    project = serializers.IntegerField(source='project.id', read_only=True)
    
    class Meta:
        model = Spreadsheet
        fields = [
            'id', 'project', 'name', 'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted']


class SpreadsheetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Spreadsheet instances"""
    
    class Meta:
        model = Spreadsheet
        fields = ['name']
    
    def validate_name(self, value):
        """Validate spreadsheet name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        if len(value) > 200:
            raise serializers.ValidationError("Name cannot exceed 200 characters")
        return value.strip()


class SpreadsheetUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Spreadsheet instances"""
    
    class Meta:
        model = Spreadsheet
        fields = ['name']
    
    def validate_name(self, value):
        """Validate spreadsheet name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        if len(value) > 200:
            raise serializers.ValidationError("Name cannot exceed 200 characters")
        return value.strip()


class SheetSerializer(serializers.ModelSerializer):
    """Serializer for Sheet model (read operations)"""
    spreadsheet = serializers.IntegerField(source='spreadsheet.id', read_only=True)
    
    class Meta:
        model = Sheet
        fields = [
            'id', 'spreadsheet', 'name', 'position', 'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'spreadsheet', 'position', 'created_at', 'updated_at', 'is_deleted']

class SheetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Sheet instances - position is auto-assigned by server"""
    
    class Meta:
        model = Sheet
        fields = ['name']
    
    def validate(self, data):
        """Validate that position is not provided (it's server-assigned)"""
        if 'position' in self.initial_data:
            raise serializers.ValidationError({
                'position': 'position is read-only'
            })
        return data
    
    def validate_name(self, value):
        """Validate sheet name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        if len(value) > 200:
            raise serializers.ValidationError("Name cannot exceed 200 characters")
        return value.strip()


class SheetUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Sheet instances - position cannot be updated"""
    
    class Meta:
        model = Sheet
        fields = ['name']
    
    def validate(self, data):
        """Validate that position is not provided (it's read-only)"""
        if 'position' in self.initial_data:
            raise serializers.ValidationError({
                'position': 'position is read-only'
            })
        return data
    
    def validate_name(self, value):
        """Validate sheet name"""
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError("Name cannot be empty")
            if len(value) > 200:
                raise serializers.ValidationError("Name cannot exceed 200 characters")
            return value.strip()
        return value


class SheetRowSerializer(serializers.ModelSerializer):
    """Serializer for SheetRow model (read-only)"""
    sheet = serializers.IntegerField(source='sheet.id', read_only=True)
    
    class Meta:
        model = SheetRow
        fields = [
            'id', 'sheet', 'position', 'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'sheet', 'position', 'created_at', 'updated_at', 'is_deleted']


class SheetColumnSerializer(serializers.ModelSerializer):
    """Serializer for SheetColumn model (read-only)"""
    sheet = serializers.IntegerField(source='sheet.id', read_only=True)
    
    class Meta:
        model = SheetColumn
        fields = [
            'id', 'sheet', 'name', 'position', 'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'sheet', 'name', 'position', 'created_at', 'updated_at', 'is_deleted']


class CellSerializer(serializers.ModelSerializer):
    """Serializer for Cell model"""
    sheet = serializers.IntegerField(source='sheet.id', read_only=True)
    row = serializers.IntegerField(source='row.id', read_only=True)
    column = serializers.IntegerField(source='column.id', read_only=True)
    row_position = serializers.IntegerField(read_only=True)
    column_position = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Cell
        fields = [
            'id', 'sheet', 'row', 'column', 'row_position', 'column_position',
            'value_type', 'string_value', 'number_value', 'boolean_value', 'formula_value',
            'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = [
            'id', 'sheet', 'row', 'column', 'row_position', 'column_position',
            'created_at', 'updated_at', 'is_deleted'
        ]


class SheetResizeSerializer(serializers.Serializer):
    """Serializer for sheet resize operation"""
    row_count = serializers.IntegerField(min_value=0)
    column_count = serializers.IntegerField(min_value=0)
    
    def validate_row_count(self, value):
        """Validate row_count is non-negative"""
        if value < 0:
            raise serializers.ValidationError("row_count must be a non-negative integer")
        return value
    
    def validate_column_count(self, value):
        """Validate column_count is non-negative"""
        if value < 0:
            raise serializers.ValidationError("column_count must be a non-negative integer")
        return value


class SheetResizeResponseSerializer(serializers.Serializer):
    """Serializer for sheet resize response"""
    rows_created = serializers.IntegerField()
    columns_created = serializers.IntegerField()
    total_rows = serializers.IntegerField()
    total_columns = serializers.IntegerField()


class CellRangeReadSerializer(serializers.Serializer):
    """Serializer for reading cell range"""
    start_row = serializers.IntegerField(min_value=0)
    end_row = serializers.IntegerField(min_value=0)
    start_column = serializers.IntegerField(min_value=0)
    end_column = serializers.IntegerField(min_value=0)
    
    def validate(self, data):
        """Validate range parameters"""
        if data['start_row'] > data['end_row']:
            raise serializers.ValidationError({
                'start_row': 'start_row must be less than or equal to end_row'
            })
        if data['start_column'] > data['end_column']:
            raise serializers.ValidationError({
                'start_column': 'start_column must be less than or equal to end_column'
            })
        return data


class CellRangeResponseSerializer(serializers.Serializer):
    """Serializer for cell range response"""
    cells = CellSerializer(many=True)
    row_count = serializers.IntegerField()
    column_count = serializers.IntegerField()


class CellOperationSerializer(serializers.Serializer):
    """Serializer for a single cell operation"""
    operation = serializers.ChoiceField(choices=['set', 'clear'])
    row = serializers.IntegerField(min_value=0)
    column = serializers.IntegerField(min_value=0)
    value_type = serializers.ChoiceField(
        choices=CellValueType.choices,
        required=False
    )
    string_value = serializers.CharField(required=False, allow_null=True)
    number_value = serializers.DecimalField(
        max_digits=30,
        decimal_places=10,
        required=False,
        allow_null=True
    )
    boolean_value = serializers.BooleanField(required=False, allow_null=True)
    formula_value = serializers.CharField(required=False, allow_null=True)
    
    def validate(self, data):
        """Validate operation and required fields"""
        operation = data.get('operation')
        value_type = data.get('value_type')
        
        if operation == 'set':
            if not value_type:
                raise serializers.ValidationError({
                    'value_type': 'value_type is required when operation is "set"'
                })
            
            # Validate value_type-specific fields
            if value_type == 'string':
                if 'string_value' not in data:
                    raise serializers.ValidationError({
                        'string_value': 'string_value is required when value_type is "string"'
                    })
            elif value_type == 'number':
                if 'number_value' not in data or data.get('number_value') is None:
                    raise serializers.ValidationError({
                        'number_value': 'number_value is required when value_type is "number"'
                    })
            elif value_type == 'boolean':
                if 'boolean_value' not in data or data.get('boolean_value') is None:
                    raise serializers.ValidationError({
                        'boolean_value': 'boolean_value is required when value_type is "boolean"'
                    })
            elif value_type == 'formula':
                if not data.get('formula_value'):
                    raise serializers.ValidationError({
                        'formula_value': 'formula_value is required when value_type is "formula"'
                    })
                if not data['formula_value'].startswith('='):
                    raise serializers.ValidationError({
                        'formula_value': 'formula_value must start with "="'
                    })
        
        return data


class CellBatchUpdateSerializer(serializers.Serializer):
    """Serializer for batch cell update"""
    operations = CellOperationSerializer(many=True, min_length=1, max_length=1000)
    auto_expand = serializers.BooleanField(default=True)
    
    def validate_operations(self, value):
        """Validate operations array"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("Operations array must contain at least one operation")
        if len(value) > 1000:
            raise serializers.ValidationError("Operations array cannot exceed 1000 operations")
        return value


class CellBatchUpdateResponseSerializer(serializers.Serializer):
    """Serializer for batch update response"""
    updated = serializers.IntegerField()
    cleared = serializers.IntegerField()
    errors = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    rows_expanded = serializers.IntegerField(default=0)
    columns_expanded = serializers.IntegerField(default=0)

