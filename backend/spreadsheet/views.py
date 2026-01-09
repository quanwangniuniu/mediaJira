"""
API views for spreadsheet operations
Handles CRUD operations for spreadsheets, sheets, rows, columns, and cells
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.paginator import Paginator

from .models import Spreadsheet, Sheet, SheetRow, SheetColumn
from .serializers import (
    SpreadsheetSerializer, SpreadsheetCreateSerializer, SpreadsheetUpdateSerializer,
    SheetSerializer, SheetCreateSerializer, SheetUpdateSerializer,
    SheetRowSerializer, SheetColumnSerializer,
    SheetResizeSerializer, SheetResizeResponseSerializer,
    CellRangeReadSerializer, CellRangeResponseSerializer, CellSerializer,
    CellBatchUpdateSerializer, CellBatchUpdateResponseSerializer
)
from .services import SpreadsheetService, SheetService, CellService
from core.models import Project


class SpreadsheetListView(APIView):
    """List and create spreadsheets"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        List spreadsheets for a project
        GET /spreadsheets/?project_id=1&page=1&page_size=20&search=name&order_by=created_at
        """
        project_id = request.query_params.get('project_id')
        if not project_id:
            raise ValidationError({'project_id': 'project_id is required'})
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise NotFound({'error': 'Project not found', 'detail': f'No project with id {project_id} exists'})
        
        # Get queryset
        queryset = Spreadsheet.objects.filter(project=project, is_deleted=False)
        
        # Search by name
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        # Order by
        order_by = request.query_params.get('order_by', 'created_at')
        if order_by in ['name', 'created_at', 'updated_at']:
            queryset = queryset.order_by(f'-{order_by}' if order_by != 'name' else 'name')
        else:
            queryset = queryset.order_by('-created_at')
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)
        
        serializer = SpreadsheetSerializer(page_obj, many=True)
        
        return Response({
            'count': paginator.count,
            'page': page,
            'page_size': page_size,
            'results': serializer.data
        })
    
    def post(self, request):
        """
        Create a new spreadsheet
        POST /spreadsheets/?project_id=1
        """
        project_id = request.query_params.get('project_id')
        if not project_id:
            raise ValidationError({'project_id': 'project_id is required'})
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise NotFound({'error': 'Project not found', 'detail': f'No project with id {project_id} exists'})
        
        serializer = SpreadsheetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            spreadsheet = SpreadsheetService.create_spreadsheet(
                project=project,
                name=serializer.validated_data['name']
            )
        except DjangoValidationError as e:
            raise ValidationError({'error': str(e)})
        
        response_serializer = SpreadsheetSerializer(spreadsheet)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SpreadsheetDetailView(APIView):
    """Retrieve, update, and delete a spreadsheet"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, id):
        """Get spreadsheet details"""
        spreadsheet = get_object_or_404(Spreadsheet, id=id, is_deleted=False)
        serializer = SpreadsheetSerializer(spreadsheet)
        return Response(serializer.data)
    
    def put(self, request, id):
        """Update spreadsheet"""
        spreadsheet = get_object_or_404(Spreadsheet, id=id, is_deleted=False)
        
        serializer = SpreadsheetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            updated_spreadsheet = SpreadsheetService.update_spreadsheet(
                spreadsheet=spreadsheet,
                name=serializer.validated_data['name']
            )
        except DjangoValidationError as e:
            raise ValidationError({'error': str(e)})
        
        response_serializer = SpreadsheetSerializer(updated_spreadsheet)
        return Response(response_serializer.data)
    
    def delete(self, request, id):
        """Delete spreadsheet (soft delete)"""
        spreadsheet = get_object_or_404(Spreadsheet, id=id, is_deleted=False)
        SpreadsheetService.delete_spreadsheet(spreadsheet)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SheetListView(APIView):
    """List and create sheets"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, spreadsheet_id):
        """
        List sheets for a spreadsheet
        GET /spreadsheets/{spreadsheet_id}/sheets/?page=1&page_size=20&order_by=position
        """
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        
        queryset = Sheet.objects.filter(spreadsheet=spreadsheet, is_deleted=False)
        
        # Order by
        order_by = request.query_params.get('order_by', 'position')
        if order_by in ['name', 'position', 'created_at']:
            if order_by == 'name':
                queryset = queryset.order_by('name')
            elif order_by == 'position':
                queryset = queryset.order_by('position', 'created_at')
            else:
                queryset = queryset.order_by('-created_at')
        else:
            queryset = queryset.order_by('position', 'created_at')
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)
        
        serializer = SheetSerializer(page_obj, many=True)
        
        return Response({
            'count': paginator.count,
            'page': page,
            'page_size': page_size,
            'results': serializer.data
        })
    
    def post(self, request, spreadsheet_id):
        """
        Create a new sheet
        POST /spreadsheets/{spreadsheet_id}/sheets/
        """
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        
        serializer = SheetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            sheet = SheetService.create_sheet(
                spreadsheet=spreadsheet,
                name=serializer.validated_data['name']
            )
        except DjangoValidationError as e:
            raise ValidationError({'error': str(e)})
        
        response_serializer = SheetSerializer(sheet)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SheetDetailView(APIView):
    """Retrieve, update, and delete a sheet"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, spreadsheet_id, id):
        """Get sheet details"""
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=id, spreadsheet=spreadsheet, is_deleted=False)
        serializer = SheetSerializer(sheet)
        return Response(serializer.data)
    
    def put(self, request, spreadsheet_id, id):
        """Update sheet"""
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=id, spreadsheet=spreadsheet, is_deleted=False)
        
        serializer = SheetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            updated_sheet = SheetService.update_sheet(
                sheet=sheet,
                name=serializer.validated_data['name']
            )
        except DjangoValidationError as e:
            raise ValidationError({'error': str(e)})
        
        response_serializer = SheetSerializer(updated_sheet)
        return Response(response_serializer.data)
    
    def delete(self, request, spreadsheet_id, id):
        """Delete sheet (soft delete)"""
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=id, spreadsheet=spreadsheet, is_deleted=False)
        SheetService.delete_sheet(sheet)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SheetResizeView(APIView):
    """Resize a sheet (create rows/columns)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, spreadsheet_id, sheet_id):
        """
        Resize sheet to ensure it has at least the specified number of rows/columns
        POST /spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/resize
        """
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=sheet_id, spreadsheet=spreadsheet, is_deleted=False)
        
        serializer = SheetResizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            result = SheetService.resize_sheet(
                sheet=sheet,
                row_count=serializer.validated_data['row_count'],
                column_count=serializer.validated_data['column_count']
            )
        except DjangoValidationError as e:
            raise ValidationError({'error': str(e)})
        
        response_serializer = SheetResizeResponseSerializer(result)
        return Response(response_serializer.data)


class SheetRowListView(APIView):
    """List rows in a sheet (scrollable)"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, spreadsheet_id, sheet_id):
        """
        List rows in a sheet using scrollable pagination
        GET /spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/rows/?offset=0&row_limit=100
        """
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=sheet_id, spreadsheet=spreadsheet, is_deleted=False)
        
        offset = int(request.query_params.get('offset', 0))
        row_limit = int(request.query_params.get('row_limit', 100))
        
        # Clamp row_limit to max 500
        row_limit = min(row_limit, 500)
        
        queryset = SheetRow.objects.filter(sheet=sheet, is_deleted=False).order_by('position')
        
        total = queryset.count()
        items = queryset[offset:offset + row_limit]
        has_more = (offset + row_limit) < total
        
        serializer = SheetRowSerializer(items, many=True)
        
        return Response({
            'items': serializer.data,
            'offset': offset,
            'limit': row_limit,
            'total': total,
            'has_more': has_more
        })


class SheetColumnListView(APIView):
    """List columns in a sheet (scrollable)"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, spreadsheet_id, sheet_id):
        """
        List columns in a sheet using scrollable pagination
        GET /spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/columns/?offset=0&column_limit=50
        """
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=sheet_id, spreadsheet=spreadsheet, is_deleted=False)
        
        offset = int(request.query_params.get('offset', 0))
        column_limit = int(request.query_params.get('column_limit', 50))
        
        # Clamp column_limit to max 200
        column_limit = min(column_limit, 200)
        
        queryset = SheetColumn.objects.filter(sheet=sheet, is_deleted=False).order_by('position')
        
        total = queryset.count()
        items = queryset[offset:offset + column_limit]
        has_more = (offset + column_limit) < total
        
        serializer = SheetColumnSerializer(items, many=True)
        
        return Response({
            'items': serializer.data,
            'offset': offset,
            'limit': column_limit,
            'total': total,
            'has_more': has_more
        })


class CellRangeReadView(APIView):
    """Read cells within a range"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, spreadsheet_id, sheet_id):
        """
        Read cells within a specified range
        POST /spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/cells/range
        """
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=sheet_id, spreadsheet=spreadsheet, is_deleted=False)
        
        serializer = CellRangeReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            result = CellService.read_cell_range(
                sheet=sheet,
                start_row=serializer.validated_data['start_row'],
                end_row=serializer.validated_data['end_row'],
                start_column=serializer.validated_data['start_column'],
                end_column=serializer.validated_data['end_column']
            )
        except DjangoValidationError as e:
            raise ValidationError({'error': str(e)})
        
        # Serialize cells
        cell_serializer = CellSerializer(result['cells'], many=True)
        
        return Response({
            'cells': cell_serializer.data,
            'row_count': result['row_count'],
            'column_count': result['column_count']
        })


class CellBatchUpdateView(APIView):
    """Batch update cells"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, spreadsheet_id, sheet_id):
        """
        Perform batch cell operations (set or clear)
        POST /spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/cells/batch
        """
        spreadsheet = get_object_or_404(Spreadsheet, id=spreadsheet_id, is_deleted=False)
        sheet = get_object_or_404(Sheet, id=sheet_id, spreadsheet=spreadsheet, is_deleted=False)
        
        serializer = CellBatchUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            result = CellService.batch_update_cells(
                sheet=sheet,
                operations=serializer.validated_data['operations'],
                auto_expand=serializer.validated_data.get('auto_expand', True)
            )
        except DjangoValidationError as e:
            # Handle ValidationError with INVALID_ARGUMENT format
            # The service already returns the correct format, so just re-raise as DRF ValidationError
            if isinstance(e.detail, dict) and 'code' in e.detail:
                # Already in the correct format from service
                raise ValidationError(e.detail)
            else:
                # Fallback: convert to expected format
                raise ValidationError({
                    'code': 'INVALID_ARGUMENT',
                    'details': [{'index': 0, 'row': None, 'column': None, 'field': 'general', 'message': str(e)}]
                })
        
        response_serializer = CellBatchUpdateResponseSerializer(result)
        return Response(response_serializer.data)

