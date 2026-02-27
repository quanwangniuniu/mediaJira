"""
Serializers for spreadsheet models
Handles API serialization and deserialization following OpenAPI specification
"""
from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    Spreadsheet,
    Sheet,
    SheetRow,
    SheetColumn,
    Cell,
    CellValueType,
    WorkflowPattern,
    WorkflowPatternStep,
    PatternJob,
    SpreadsheetHighlight,
    SpreadsheetHighlightScope,
    SpreadsheetCellFormat,
)
from .services import SheetService


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
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = SheetColumn
        fields = [
            'id', 'sheet', 'name', 'position', 'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'sheet', 'name', 'position', 'created_at', 'updated_at', 'is_deleted']

    def get_name(self, obj: SheetColumn) -> str:
        # Derive name from position to keep labels consistent after inserts
        return SheetService._generate_column_name(obj.position)


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
            'raw_input', 'computed_type', 'computed_number', 'computed_string', 'error_code',
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


class SheetInsertSerializer(serializers.Serializer):
    """Serializer for row/column insert operations"""
    position = serializers.IntegerField(min_value=0)
    count = serializers.IntegerField(min_value=1, required=False, default=1)


class SheetDeleteSerializer(serializers.Serializer):
    """Serializer for row/column delete operations"""
    position = serializers.IntegerField(min_value=0)
    count = serializers.IntegerField(min_value=1, required=False, default=1)


class CellOperationSerializer(serializers.Serializer):
    """Serializer for a single cell operation"""
    operation = serializers.ChoiceField(choices=['set', 'clear'])
    row = serializers.IntegerField(min_value=0)
    column = serializers.IntegerField(min_value=0)
    raw_input = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    value_type = serializers.ChoiceField(
        choices=CellValueType.choices,
        required=False
    )
    string_value = serializers.CharField(required=False, allow_null=True)
    number_value = serializers.DecimalField(
        max_digits=1000,
        decimal_places=500,
        required=False,
        allow_null=True
    )
    boolean_value = serializers.BooleanField(required=False, allow_null=True)
    formula_value = serializers.CharField(required=False, allow_null=True)
    
    def validate(self, data):
        """Validate operation and required fields"""
        operation = data.get('operation')
        value_type = data.get('value_type')
        raw_input_provided = 'raw_input' in data
        
        if operation == 'set':
            if raw_input_provided:
                raw_input = data.get('raw_input')
                if raw_input is not None and not isinstance(raw_input, str):
                    raise serializers.ValidationError({
                        'raw_input': 'raw_input must be a string'
                    })
                return data

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
    import_id = serializers.UUIDField(required=False, allow_null=True)
    chunk_index = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    import_mode = serializers.BooleanField(default=False)

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
    rows_expanded = serializers.IntegerField(default=0)
    columns_expanded = serializers.IntegerField(default=0)
    cells = CellSerializer(many=True, required=False)


class WorkflowPatternStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowPatternStep
        fields = ['id', 'seq', 'type', 'params', 'disabled', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SpreadsheetHighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpreadsheetHighlight
        fields = ['id', 'scope', 'row_index', 'col_index', 'color', 'created_at', 'updated_at']


class SpreadsheetHighlightOpSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=SpreadsheetHighlightScope.choices)
    operation = serializers.ChoiceField(choices=['SET', 'CLEAR'])
    row = serializers.IntegerField(min_value=0, required=False)
    col = serializers.IntegerField(min_value=0, required=False)
    color = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        scope = data.get('scope')
        operation = data.get('operation')
        row = data.get('row')
        col = data.get('col')
        color = data.get('color')

        if scope == SpreadsheetHighlightScope.CELL:
            if row is None or col is None:
                raise serializers.ValidationError("row and col are required for CELL scope")
        elif scope == SpreadsheetHighlightScope.ROW:
            if row is None:
                raise serializers.ValidationError("row is required for ROW scope")
        elif scope == SpreadsheetHighlightScope.COLUMN:
            if col is None:
                raise serializers.ValidationError("col is required for COLUMN scope")

        if operation == 'SET' and (color is None or color == ''):
            raise serializers.ValidationError("color is required for SET operation")

        return data


class SpreadsheetHighlightBatchSerializer(serializers.Serializer):
    ops = SpreadsheetHighlightOpSerializer(many=True, min_length=1, max_length=2000)


class SpreadsheetCellFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpreadsheetCellFormat
        fields = ['id', 'row_index', 'column_index', 'bold', 'italic', 'strikethrough', 'text_color', 'created_at', 'updated_at']


class SpreadsheetCellFormatOpSerializer(serializers.Serializer):
    row = serializers.IntegerField(min_value=0)
    column = serializers.IntegerField(min_value=0)
    bold = serializers.BooleanField(default=False)
    italic = serializers.BooleanField(default=False)
    strikethrough = serializers.BooleanField(default=False)
    text_color = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20)


class SpreadsheetCellFormatBatchSerializer(serializers.Serializer):
    ops = SpreadsheetCellFormatOpSerializer(many=True, min_length=1, max_length=2000)


class WorkflowPatternListSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = WorkflowPattern
        fields = [
            'id',
            'name',
            'description',
            'version',
            'origin_spreadsheet_id',
            'origin_sheet_id',
            'createdAt',
            'is_archived',
        ]


class WorkflowPatternDetailSerializer(serializers.ModelSerializer):
    steps = WorkflowPatternStepSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = WorkflowPattern
        fields = [
            'id',
            'name',
            'description',
            'version',
            'origin_spreadsheet_id',
            'origin_sheet_id',
            'createdAt',
            'updatedAt',
            'is_archived',
            'steps',
        ]


class WorkflowPatternOriginSerializer(serializers.Serializer):
    spreadsheet_id = serializers.IntegerField(required=False, allow_null=True)
    sheet_id = serializers.IntegerField(required=False, allow_null=True)


class WorkflowPatternStepInputSerializer(serializers.Serializer):
    seq = serializers.IntegerField(min_value=1)
    type = serializers.CharField(max_length=50)
    params = serializers.JSONField()
    disabled = serializers.BooleanField(default=False)


class WorkflowPatternCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    origin = WorkflowPatternOriginSerializer(required=False)
    steps = WorkflowPatternStepInputSerializer(many=True)

    def validate_steps(self, value):
        if not value:
            raise serializers.ValidationError("At least one step is required")
        seqs = [step['seq'] for step in value]
        if len(seqs) != len(set(seqs)):
            raise serializers.ValidationError("Step seq values must be unique")
        return value

    def create(self, validated_data):
        owner = self.context['owner']
        origin = validated_data.pop('origin', {}) or {}
        steps = validated_data.pop('steps', [])
        with transaction.atomic():
            pattern = WorkflowPattern.objects.create(
                owner=owner,
                origin_spreadsheet_id=origin.get('spreadsheet_id'),
                origin_sheet_id=origin.get('sheet_id'),
                **validated_data
            )
            WorkflowPatternStep.objects.bulk_create(
                [WorkflowPatternStep(pattern=pattern, **step) for step in steps]
            )
        return pattern


class PatternApplySerializer(serializers.Serializer):
    spreadsheet_id = serializers.IntegerField()
    sheet_id = serializers.IntegerField()


class PatternJobStatusSerializer(serializers.ModelSerializer):
    current_step = serializers.IntegerField(source='step_cursor', allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    startedAt = serializers.DateTimeField(source='started_at', read_only=True)
    finishedAt = serializers.DateTimeField(source='finished_at', read_only=True)

    class Meta:
        model = PatternJob
        fields = [
            'id',
            'status',
            'progress',
            'current_step',
            'error_code',
            'error_message',
            'createdAt',
            'startedAt',
            'finishedAt',
        ]

