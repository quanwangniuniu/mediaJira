from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Avg, Count, F
from django.utils import timezone
from django.shortcuts import get_object_or_404, render
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from decimal import Decimal
from datetime import timedelta
import logging

from .models import (
    Campaign, CampaignAssignment, CampaignMetric, CampaignNote,
    CampaignStatus, CampaignType
)
from .serializers import (
    CampaignListSerializer, CampaignDetailSerializer, CampaignCreateSerializer,
    CampaignUpdateSerializer, CampaignStatusUpdateSerializer,
    CampaignAssignmentSerializer, CampaignMetricSerializer, CampaignNoteSerializer,
    CampaignMetricsSummarySerializer
)
from .api_docs import OPENAPI_SPEC

# Set up logging
logger = logging.getLogger(__name__)


class OpenAPIDocumentationView(APIView):
    """
    OpenAPI 3.0 Documentation endpoint
    
    Provides the complete OpenAPI specification for the Campaign Management API
    """
    
    permission_classes = [AllowAny]  # No authentication required for API docs
    
    def get(self, request):
        """Return the OpenAPI specification"""
        try:
            return Response(OPENAPI_SPEC)
        except Exception as e:
            logger.error(f"Error serving OpenAPI docs: {str(e)}")
            return Response(
                {"error": "Failed to load API documentation"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class APIDocumentationPageView(APIView):
    """
    HTML API Documentation page
    
    Serves the professional Swagger UI documentation page
    """
    
    permission_classes = [AllowAny]  # No authentication required for docs page
    
    def get(self, request):
        """Return the HTML documentation page"""
        try:
            return render(request, 'campaigns/api_docs.html')
        except Exception as e:
            logger.error(f"Error serving API docs page: {str(e)}")
            return Response(
                {"error": "Failed to load documentation page"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Campaign management
    
    Provides comprehensive CRUD operations for campaigns with:
    - List and detail views with filtering and search
    - Campaign creation with automatic owner assignment
    - Status transitions with validation
    - Team member management
    - Metrics tracking and analytics
    """
    
    permission_classes = [AllowAny]  # Allow all for development
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'campaign_type', 'owner', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'start_date', 'end_date', 'budget']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Get campaigns based on user permissions
        
        - Superusers see all campaigns
        - Regular users see campaigns they own or are assigned to
        - Anonymous users see all campaigns (for development)
        """
        try:
            user = self.request.user
            
            # For development, allow anonymous users to see all campaigns
            if user.is_anonymous:
                return Campaign.objects.select_related('owner').prefetch_related(
                    'team_members', 'assignments', 'metrics'
                )
            
            if user.is_superuser:
                return Campaign.objects.select_related('owner').prefetch_related(
                    'team_members', 'assignments', 'metrics'
                )
            
            return Campaign.objects.filter(
                Q(owner=user) | Q(team_members=user)
            ).select_related('owner').prefetch_related(
                'team_members', 'assignments', 'metrics'
            ).distinct()
        except Exception as e:
            logger.error(f"Error getting campaigns queryset: {str(e)}")
            return Campaign.objects.none()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        try:
            if self.action == 'create':
                return CampaignCreateSerializer
            elif self.action in ['update', 'partial_update']:
                return CampaignUpdateSerializer
            elif self.action == 'retrieve':
                return CampaignDetailSerializer
            elif self.action == 'update_status':
                return CampaignStatusUpdateSerializer
            return CampaignListSerializer
        except Exception as e:
            logger.error(f"Error getting serializer class: {str(e)}")
            return CampaignListSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new campaign with comprehensive error handling"""
        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    # Validate dates
                    start_date = serializer.validated_data.get('start_date')
                    end_date = serializer.validated_data.get('end_date')
                    
                    if start_date and end_date:
                        # Convert to date objects if they're datetime
                        if hasattr(start_date, 'date'):
                            start_date = start_date.date()
                        if hasattr(end_date, 'date'):
                            end_date = end_date.date()
                        
                        if start_date >= end_date:
                            raise ValidationError("End date must be after start date")
                    
                    if start_date and start_date < timezone.now().date():
                        raise ValidationError("Start date cannot be in the past")
                    
                    campaign = serializer.save()
                    
                    # Get the owner from the serializer context
                    owner = campaign.owner
                    
                    # Log campaign creation
                    CampaignNote.objects.create(
                        campaign=campaign,
                        author=owner,
                        title='Campaign Created',
                        content=f'Campaign "{campaign.name}" was created by {owner.get_full_name()}',
                        is_private=False
                    )
                    
                    logger.info(f"Campaign created successfully: {campaign.id} by user {owner.id}")
                    
                    return Response(
                        serializer.data, 
                        status=status.HTTP_201_CREATED
                    )
                else:
                    logger.warning(f"Campaign creation validation failed: {serializer.errors}")
                    return Response(
                        {"error": "Validation failed", "details": serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except ValidationError as e:
            logger.warning(f"Campaign creation validation error: {str(e)}")
            return Response(
                {"error": "Validation error", "details": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Campaign creation error: {str(e)}")
            return Response(
                {"error": "Failed to create campaign", "details": "Internal server error"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def list(self, request, *args, **kwargs):
        """List campaigns with error handling"""
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error listing campaigns: {str(e)}")
            return Response(
                {"error": "Failed to retrieve campaigns"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single campaign with error handling"""
        try:
            return super().retrieve(request, *args, **kwargs)
        except ObjectDoesNotExist:
            return Response(
                {"error": "Campaign not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrieving campaign: {str(e)}")
            return Response(
                {"error": "Failed to retrieve campaign"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Update campaign with comprehensive validation"""
        try:
            with transaction.atomic():
                instance = self.get_object()
                serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
                
                if serializer.is_valid():
                    # Validate dates if provided
                    start_date = serializer.validated_data.get('start_date')
                    end_date = serializer.validated_data.get('end_date')
                    
                    if start_date and end_date:
                        # Convert to date objects if they're datetime
                        if hasattr(start_date, 'date'):
                            start_date = start_date.date()
                        if hasattr(end_date, 'date'):
                            end_date = end_date.date()
                        
                        if start_date >= end_date:
                            raise ValidationError("End date must be after start date")
                    
                    old_status = instance.status
                    campaign = serializer.save()
                    new_status = campaign.status
                    
                    # Log status changes
                    if old_status != new_status:
                        CampaignNote.objects.create(
                            campaign=campaign,
                            author=request.user if not request.user.is_anonymous else serializer.validated_data.get('owner'),
                            title='Status Updated',
                            content=f'Campaign status changed from {old_status} to {new_status}',
                            is_private=False
                        )
                    
                    logger.info(f"Campaign updated successfully: {campaign.id} by user {request.user.id if not request.user.is_anonymous else 'anonymous'}")
                    return Response(serializer.data)
                else:
                    logger.warning(f"Campaign update validation failed: {serializer.errors}")
                    return Response(
                        {"error": "Validation failed", "details": serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except ValidationError as e:
            logger.warning(f"Campaign update validation error: {str(e)}")
            return Response(
                {"error": "Validation error", "details": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except ObjectDoesNotExist:
            return Response(
                {"error": "Campaign not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Campaign update error: {str(e)}")
            return Response(
                {"error": "Failed to update campaign"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """Delete campaign with validation"""
        try:
            campaign = self.get_object()
            
            # Prevent deletion of active campaigns
            if campaign.status == 'active':
                return Response(
                    {"error": "Cannot delete active campaigns. Please pause or complete them first."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            campaign.delete()
            logger.info(f"Campaign deleted: {campaign.id} by user {request.user.id if not request.user.is_anonymous else 'anonymous'}")
            
            return Response(
                {"message": "Campaign deleted successfully"}, 
                status=status.HTTP_204_NO_CONTENT
            )
        except ObjectDoesNotExist:
            return Response(
                {"error": "Campaign not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Campaign deletion error: {str(e)}")
            return Response(
                {"error": "Failed to delete campaign"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update campaign status with validation
        
        This endpoint allows for controlled status transitions
        with proper validation and logging.
        """
        try:
            campaign = self.get_object()
            serializer = self.get_serializer(data=request.data)
            
            if serializer.is_valid():
                new_status = serializer.validated_data['status']
                reason = serializer.validated_data.get('reason', '')
                
                # Validate status transition
                old_status = campaign.status
                valid_transitions = {
                    'draft': ['active', 'paused'],
                    'active': ['paused', 'completed'],
                    'paused': ['active', 'completed'],
                    'completed': []  # No transitions from completed
                }
                
                if new_status not in valid_transitions.get(old_status, []):
                    return Response(
                        {"error": f"Invalid status transition from {old_status} to {new_status}"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Update status
                campaign.status = new_status
                campaign.save()
                
                # Log the status change
                note_content = f'Status changed to {new_status}'
                if reason:
                    note_content += f'. Reason: {reason}'
                
                CampaignNote.objects.create(
                    campaign=campaign,
                    author=request.user if not request.user.is_anonymous else campaign.owner,
                    title='Status Updated',
                    content=note_content,
                    is_private=False
                )
                
                logger.info(f"Campaign status updated: {campaign.id} from {old_status} to {new_status}")
                
                return Response({
                    'message': f'Campaign status updated to {new_status}',
                    'status': new_status
                })
            else:
                logger.warning(f"Status update validation failed: {serializer.errors}")
                return Response(
                    {"error": "Validation failed", "details": serializer.errors}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ObjectDoesNotExist:
            return Response(
                {"error": "Campaign not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Status update error: {str(e)}")
            return Response(
                {"error": "Failed to update status"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def metrics_summary(self, request, pk=None):
        """
        Get aggregated metrics summary for a campaign
        
        Provides comprehensive performance overview including:
        - Total impressions, clicks, conversions
        - Average rates and costs
        - Budget utilization
        - Days remaining
        """
        try:
            campaign = self.get_object()
            
            # Get metrics for the campaign
            metrics = campaign.metrics.all()
            
            if not metrics.exists():
                return Response({
                    'message': 'No metrics available for this campaign',
                    'data': {
                        'total_impressions': 0,
                        'total_clicks': 0,
                        'total_conversions': 0,
                        'total_spent': 0,
                        'average_ctr': 0,
                        'average_cvr': 0,
                        'average_cpc': 0,
                        'average_cpm': 0,
                        'budget_utilization': 0,
                        'days_remaining': max(0, (campaign.end_date - timezone.now().date()).days)
                    }
                })
            
            # Calculate aggregated metrics
            total_impressions = metrics.aggregate(total=Sum('impressions'))['total'] or 0
            total_clicks = metrics.aggregate(total=Sum('clicks'))['total'] or 0
            total_conversions = metrics.aggregate(total=Sum('conversions'))['total'] or 0
            total_spent = metrics.aggregate(total=Sum('spent_amount'))['total'] or 0
            
            # Calculate averages
            avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
            avg_cvr = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
            avg_cpc = total_spent / total_clicks if total_clicks > 0 else 0
            avg_cpm = (total_spent / total_impressions * 1000) if total_impressions > 0 else 0
            
            # Budget utilization
            budget_utilization = (total_spent / campaign.budget * 100) if campaign.budget > 0 else 0
            
            # Days remaining
            days_remaining = max(0, (campaign.end_date - timezone.now().date()).days)
            
            return Response({
                'data': {
                    'total_impressions': total_impressions,
                    'total_clicks': total_clicks,
                    'total_conversions': total_conversions,
                    'total_spent': float(total_spent),
                    'average_ctr': round(avg_ctr, 2),
                    'average_cvr': round(avg_cvr, 2),
                    'average_cpc': float(avg_cpc),
                    'average_cpm': float(avg_cpm),
                    'budget_utilization': round(budget_utilization, 2),
                    'days_remaining': days_remaining
                }
            })
        except ObjectDoesNotExist:
            return Response(
                {"error": "Campaign not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Metrics summary error: {str(e)}")
            return Response(
                {"error": "Failed to retrieve metrics summary"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Get dashboard statistics for all campaigns
        
        Provides overview metrics for the dashboard including:
        - Total campaigns by status
        - Budget utilization
        - Performance metrics
        """
        try:
            # Get campaigns for the user
            campaigns = self.get_queryset()
            
            # Calculate status counts
            status_counts = campaigns.values('status').annotate(count=Count('id'))
            status_stats = {item['status']: item['count'] for item in status_counts}
            
            # Ensure all statuses are represented
            all_statuses = ['draft', 'active', 'paused', 'completed']
            for status in all_statuses:
                if status not in status_stats:
                    status_stats[status] = 0
            
            # Calculate total campaigns
            total_campaigns = campaigns.count()
            
            # Calculate budget metrics
            total_budget = campaigns.aggregate(total=Sum('budget'))['total'] or 0
            
            # Fix the spent amount calculation - use direct field instead of related lookup
            total_spent = 0
            for campaign in campaigns:
                campaign_spent = campaign.metrics.aggregate(total=Sum('spent_amount'))['total'] or 0
                total_spent += campaign_spent
            
            budget_utilization = (total_spent / total_budget * 100) if total_budget > 0 else 0
            
            # Calculate performance metrics
            total_impressions = 0
            total_clicks = 0
            total_conversions = 0
            
            for campaign in campaigns:
                campaign_metrics = campaign.metrics.aggregate(
                    impressions=Sum('impressions'),
                    clicks=Sum('clicks'),
                    conversions=Sum('conversions')
                )
                total_impressions += campaign_metrics['impressions'] or 0
                total_clicks += campaign_metrics['clicks'] or 0
                total_conversions += campaign_metrics['conversions'] or 0
            
            return Response({
                'total_campaigns': total_campaigns,
                'active': status_stats.get('active', 0),
                'paused': status_stats.get('paused', 0),
                'completed': status_stats.get('completed', 0),
                'draft': status_stats.get('draft', 0),
                'total_budget': float(total_budget),
                'total_spent': float(total_spent),
                'budget_utilization': round(budget_utilization, 2),
                'total_impressions': total_impressions,
                'total_clicks': total_clicks,
                'total_conversions': total_conversions
            })
        except Exception as e:
            logger.error(f"Dashboard stats error: {str(e)}")
            return Response(
                {"error": "Failed to retrieve dashboard statistics"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CampaignAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Campaign Assignment management
    
    Handles team member assignments to campaigns with role management
    """
    
    serializer_class = CampaignAssignmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get assignments based on user permissions"""
        user = self.request.user
        
        if user.is_superuser:
            return CampaignAssignment.objects.select_related('campaign', 'user')
        
        return CampaignAssignment.objects.filter(
            Q(campaign__owner=user) | Q(user=user)
        ).select_related('campaign', 'user')
    
    def get_serializer_context(self):
        """Add campaign context to serializer"""
        context = super().get_serializer_context()
        if 'campaign_pk' in self.kwargs:
            context['campaign'] = get_object_or_404(Campaign, pk=self.kwargs['campaign_pk'])
        return context
    
    def perform_create(self, serializer):
        """Create assignment with logging"""
        assignment = serializer.save()
        
        # Log the assignment
        CampaignNote.objects.create(
            campaign=assignment.campaign,
            author=self.request.user,
            title='Team Member Added',
            content=f'{assignment.user.get_full_name()} was assigned as {assignment.get_role_display()}',
            is_private=False
        )
    
    def perform_update(self, serializer):
        """Update assignment with change tracking"""
        old_role = self.get_object().role
        assignment = serializer.save()
        new_role = assignment.role
        
        # Log role changes
        if old_role != new_role:
            CampaignNote.objects.create(
                campaign=assignment.campaign,
                author=self.request.user,
                title='Role Updated',
                content=f'{assignment.user.get_full_name()} role changed from {old_role} to {new_role}',
                is_private=False
            )


class CampaignMetricViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Campaign Metrics management
    
    Handles performance metrics tracking and analytics
    """
    
    serializer_class = CampaignMetricSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['date']
    ordering_fields = ['date', 'recorded_at', 'impressions', 'clicks']
    ordering = ['-date']
    
    def get_queryset(self):
        """Get metrics based on user permissions"""
        user = self.request.user
        
        if user.is_superuser:
            return CampaignMetric.objects.select_related('campaign')
        
        return CampaignMetric.objects.filter(
            Q(campaign__owner=user) | Q(campaign__team_members=user)
        ).select_related('campaign')
    
    def perform_create(self, serializer):
        """Create metric with validation"""
        metric = serializer.save()
        
        # Update campaign spent amount (simplified calculation)
        campaign = metric.campaign
        if metric.cost_per_click and metric.clicks:
            additional_spent = metric.cost_per_click * metric.clicks
            campaign.spent_amount += additional_spent
            campaign.save()
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        Get metric trends for analysis
        
        Provides time-series data for trend analysis
        """
        # Implementation for trend analysis
        # This would include date range filtering and aggregation
        return Response({'message': 'Trend analysis endpoint - to be implemented'})


class CampaignNoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Campaign Notes management
    
    Handles notes and comments for campaigns with privacy controls
    """
    
    serializer_class = CampaignNoteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_private', 'author']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get notes based on user permissions"""
        user = self.request.user
        
        if user.is_superuser:
            return CampaignNote.objects.select_related('campaign', 'author')
        
        return CampaignNote.objects.filter(
            Q(campaign__owner=user) | Q(campaign__team_members=user)
        ).filter(
            Q(is_private=False) | Q(author=user)
        ).select_related('campaign', 'author')
    
    def perform_create(self, serializer):
        """Create note with author assignment"""
        serializer.save(author=self.request.user) 