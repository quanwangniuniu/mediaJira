from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError
from core.models import TimeStampedModel


class Spreadsheet(TimeStampedModel):
    project = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='spreadsheets',
        help_text="Project this spreadsheet belongs to"
    )
    name = models.CharField(
        max_length=200,
        help_text="Name of the spreadsheet"
    )

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'name'],
                condition=Q(is_deleted=False),
                name='unique_spreadsheet_name_per_project_active'
            ),
        ]
        indexes = [
            models.Index(fields=['project', 'is_deleted']),
        ]

    def __str__(self):
        return f"{self.name} (Project: {self.project.name})"


class Sheet(TimeStampedModel):
    spreadsheet = models.ForeignKey(
        Spreadsheet,
        on_delete=models.CASCADE,
        related_name='sheets',
        help_text="Spreadsheet this sheet belongs to"
    )
    name = models.CharField(
        max_length=200,
        help_text="Name of the sheet (tab name)"
    )
    position = models.IntegerField(
        help_text="Position/order of the sheet within the spreadsheet"
    )

    class Meta:
        ordering = ['position', 'created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['spreadsheet', 'name'],
                condition=Q(is_deleted=False),
                name='unique_sheet_name_per_spreadsheet_active'
            ),
            models.UniqueConstraint(
                fields=['spreadsheet', 'position'],
                condition=Q(is_deleted=False),
                name='unique_sheet_position_per_spreadsheet_active'
            ),
        ]
        indexes = [
            models.Index(fields=['spreadsheet', 'is_deleted']),
            models.Index(fields=['spreadsheet', 'position']),
        ]

    def __str__(self):
        return f"{self.name} (in {self.spreadsheet.name})"


class SheetRow(TimeStampedModel):
    sheet = models.ForeignKey(
        Sheet,
        on_delete=models.CASCADE,
        related_name='rows',
        help_text="Sheet this row belongs to"
    )
    position = models.IntegerField(
        help_text="Position/row number within the sheet"
    )

    class Meta:
        ordering = ['position', 'created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['sheet', 'position'],
                condition=Q(is_deleted=False),
                name='unique_row_position_per_sheet_active'
            ),
        ]
        indexes = [
            models.Index(fields=['sheet', 'is_deleted']),
            models.Index(fields=['sheet', 'position']),
        ]

    def __str__(self):
        return f"Row {self.position} (in {self.sheet.name})"


class SheetColumn(TimeStampedModel): 
    sheet = models.ForeignKey(
        Sheet,
        on_delete=models.CASCADE,
        related_name='columns',
        help_text="Sheet this column belongs to"
    )
    name = models.CharField(
        max_length=200,
        help_text="Name of the column (e.g., 'A', 'B', 'Column1')"
    )
    position = models.IntegerField(
        help_text="Position/column number within the sheet"
    )

    class Meta:
        ordering = ['position', 'created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['sheet', 'position'],
                condition=Q(is_deleted=False),
                name='unique_column_position_per_sheet_active'
            ),
        ]
        indexes = [
            models.Index(fields=['sheet', 'is_deleted']),
            models.Index(fields=['sheet', 'position']),
        ]

    def __str__(self):
        return f"{self.name} (Column {self.position} in {self.sheet.name})"


class CellValueType(models.TextChoices):
    EMPTY = 'empty', 'Empty'
    STRING = 'string', 'String'
    NUMBER = 'number', 'Number'
    BOOLEAN = 'boolean', 'Boolean'
    FORMULA = 'formula', 'Formula'


class Cell(TimeStampedModel):
    sheet = models.ForeignKey(
        Sheet,
        on_delete=models.CASCADE,
        related_name='cells',
        help_text="Sheet this cell belongs to"
    )
    row = models.ForeignKey(
        SheetRow,
        on_delete=models.CASCADE,
        related_name='cells',
        help_text="Row this cell belongs to"
    )
    column = models.ForeignKey(
        SheetColumn,
        on_delete=models.CASCADE,
        related_name='cells',
        help_text="Column this cell belongs to"
    )
    value_type = models.CharField(
        max_length=20,
        choices=CellValueType.choices,
        default=CellValueType.EMPTY,
        help_text="Type of value stored in this cell"
    )
    string_value = models.TextField(
        null=True,
        blank=True,
        help_text="String value. Text starting with '=' stored with ' prefix for round-trip editing."
    )
    number_value = models.DecimalField(
        max_digits=30,
        decimal_places=10,
        null=True,
        blank=True,
        help_text="Numeric value"
    )
    boolean_value = models.BooleanField(
        null=True,
        blank=True,
        help_text="Boolean value"
    )
    formula_value = models.TextField(
        null=True,
        blank=True,
        help_text="Formula value (must start with '=')"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['sheet', 'row', 'column'],
                condition=Q(is_deleted=False),
                name='unique_cell_position_per_sheet_active'
            ),
        ]
        indexes = [
            models.Index(fields=['sheet', 'is_deleted']),
            models.Index(fields=['row', 'column']),
        ]

    def clean(self):
        super().clean()
        if self.row and self.row.sheet_id != self.sheet_id:
            raise ValidationError({
                'row': 'Row must belong to the same sheet as the cell.'
            })
        if self.column and self.column.sheet_id != self.sheet_id:
            raise ValidationError({
                'column': 'Column must belong to the same sheet as the cell.'
            })

    def save(self, *args, **kwargs):
        validate = kwargs.pop('validate', True)
        if validate:
            self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Cell at {self.column.name}{self.row.position} in {self.sheet.name}"

