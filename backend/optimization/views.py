from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from .services import ExperimentService, RollbackHistoryService

from .models import OptimizationExperiment, ExperimentMetric, ScalingAction, RollbackHistory

User = get_user_model()
from .serializers import (
    OptimizationExperimentSerializer,
    ExperimentMetricSerializer,
    MetricIngestSerializer,
    ScalingActionSerializer,
    ScalingActionRollbackSerializer,
    RollbackHistorySerializer
    )


# ==================== EXPERIMENT VIEWS ====================

class ExperimentListCreateView(generics.ListCreateAPIView):
    """
    GET /optimization/experiments/
    POST /optimization/experiments/
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'experiment_type']
    
    def get_queryset(self):
        """Return experiments with custom date filtering"""
        queryset = OptimizationExperiment.objects.all().order_by('-id')
        
        # Filter experiments by start and end date
        start_before = self.request.query_params.get('start_before')
        end_after = self.request.query_params.get('end_after')
        
        if start_before:
            queryset = queryset.filter(start_date__lt=start_before)
        if end_after:
            queryset = queryset.filter(end_date__gt=end_after)
        
        return queryset
    
    def get_serializer_class(self):
        """Use unified serializer for all methods"""
        return OptimizationExperimentSerializer
    
    def create(self, request, *args, **kwargs):
        """Override create to set created_by field"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Create experiment with validated data
            experiment = serializer.save(created_by=request.user)
            
            return Response(
                OptimizationExperimentSerializer(experiment).data,
                status=status.HTTP_201_CREATED
            )
        
        # Serializer validation errors
        return Response(
            {'detail': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    

class ExperimentUpdateView(generics.RetrieveUpdateAPIView):
    """
    PATCH /optimization/experiments/{id}/
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Return experiments"""
        return OptimizationExperiment.objects.all()
    
    def get_serializer_class(self):
        """Use unified serializer for all requests"""
        return OptimizationExperimentSerializer
    
    def update(self, request, *args, **kwargs):
        """Override update for partial updates"""
        instance = self.get_object()
        
        # Check status transition business rules if status is being updated
        if 'status' in request.data:
            new_status = request.data['status']
            current_status = instance.status
            
            is_valid, error_message = ExperimentService.validate_experiment_status_transition(
                current_status, new_status
            )
            
            if not is_valid:
                return Response(
                    {'detail': {'status': error_message}},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Update experiment with validated data
            updated_experiment = serializer.save()
            
            return Response(
                OptimizationExperimentSerializer(updated_experiment).data,
                status=status.HTTP_200_OK
            )
        
        # Serializer validation errors
        return Response(
            {'detail': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    

# ==================== METRIC VIEWS ====================

class ExperimentMetricsView(generics.ListAPIView):
    """
    GET /optimization/experiments/{id}/metrics/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ExperimentMetricSerializer
    
    def get_queryset(self):
        """Return metrics for the experiment"""
        experiment_id = self.kwargs['id']
        experiment = ExperimentService.check_experiment_exists(experiment_id)
        if experiment is None:
            return Response(
                {'detail': 'Experiment not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return ExperimentMetric.objects.filter(
            experiment_id=experiment
        ).order_by('-recorded_at')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ingest_experiment_metrics(request, id):
    """
    POST /optimization/experiments/{id}/metrics/ingest/
    """
    # Verify experiment exists using service layer
    experiment = ExperimentService.check_experiment_exists(id)
    if experiment is None:
        return Response(
            {'detail': 'Experiment not found'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate and create metric
    serializer = MetricIngestSerializer(data=request.data)
    if serializer.is_valid():
        metric = ExperimentMetric.objects.create(
            experiment_id=experiment,
            metric_name=serializer.validated_data['metric_name'],
            metric_value=serializer.validated_data['metric_value']
        )
        
        return Response(
            ExperimentMetricSerializer(metric).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        {'detail': serializer.errors},
        status=status.HTTP_400_BAD_REQUEST
    )


# ==================== SCALING ACTION VIEWS ====================

class ScalingActionListCreateView(generics.ListCreateAPIView):
    """
    GET /optimization/scaling/
    POST /optimization/scaling/
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['action_type', 'campaign_id']
    
    def get_queryset(self):
        """Return scaling actions with custom date filtering"""
        queryset = ScalingAction.objects.all().order_by('-performed_at')
        
        # Custom date filtering as specified in OpenAPI spec
        performed_before = self.request.query_params.get('performed_before')
        
        if performed_before:
            queryset = queryset.filter(performed_at__lt=performed_before)
        
        return queryset
    
    def get_serializer_class(self):
        """Default serializer"""
        return ScalingActionSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a scaling action"""
        # Verify experiment exists
        experiment_id = request.data.get('experiment_id')
        if experiment_id:
            experiment = ExperimentService.check_experiment_exists(experiment_id)
            if experiment is None:
                return Response(
                    {'detail': 'Experiment not found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate and create scaling action
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(performed_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({'detail': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rollback_scaling_action(request, id):
    """
    POST /optimization/scaling/{id}/rollback/
    """
    # Verify scaling action exists
    try:
        scaling_action = ScalingAction.objects.get(id=id)
    except ScalingAction.DoesNotExist:
        return Response(
            {'detail': 'Scaling action not found'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify scaling action has not been rolled back
    if RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(id):
        return Response(
            {'detail': 'Scaling action has already been rolled back'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate rollback data
    serializer = ScalingActionRollbackSerializer(data=request.data)
    if serializer.is_valid():
        # Create rollback history record
        rollback_history = RollbackHistory.objects.create(
            scaling_action_id=scaling_action,
            reason=serializer.validated_data['reason'],
            performed_by=request.user
        )
        
        return Response(
            RollbackHistorySerializer(rollback_history).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )