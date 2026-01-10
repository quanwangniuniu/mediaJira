"""
URL configuration for spreadsheet API
"""
from django.urls import path
from . import views

app_name = 'spreadsheet'

urlpatterns = [
    # Spreadsheet CRUD
    path('spreadsheets/', views.SpreadsheetListView.as_view(), name='spreadsheet-list'),
    path('spreadsheets/<int:id>/', views.SpreadsheetDetailView.as_view(), name='spreadsheet-detail'),
    
    # Sheet CRUD
    path('spreadsheets/<int:spreadsheet_id>/sheets/', views.SheetListView.as_view(), name='sheet-list'),
    path('spreadsheets/<int:spreadsheet_id>/sheets/<int:id>/', views.SheetDetailView.as_view(), name='sheet-detail'),
    path('spreadsheets/<int:spreadsheet_id>/sheets/<int:sheet_id>/resize/', views.SheetResizeView.as_view(), name='sheet-resize'),
    
    # Rows and Columns (read-only)
    path('spreadsheets/<int:spreadsheet_id>/sheets/<int:sheet_id>/rows/', views.SheetRowListView.as_view(), name='sheet-row-list'),
    path('spreadsheets/<int:spreadsheet_id>/sheets/<int:sheet_id>/columns/', views.SheetColumnListView.as_view(), name='sheet-column-list'),
    
    # Cells
    path('spreadsheets/<int:spreadsheet_id>/sheets/<int:sheet_id>/cells/range/', views.CellRangeReadView.as_view(), name='cell-range-read'),
    path('spreadsheets/<int:spreadsheet_id>/sheets/<int:sheet_id>/cells/batch/', views.CellBatchUpdateView.as_view(), name='cell-batch-update'),
]

