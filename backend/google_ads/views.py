from rest_framework import status, permissions, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.core.exceptions import ValidationError
from .models import Ad, CustomerAccount, AdPreview
from .serializers import AdSerializer, AdListSerializer
from .services import AdPreviewService

# ========== Views for operations by account ==========
class AdsByAccountView(generics.ListCreateAPIView):
    """
    Get ad list by Google Ads account
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'type']
    search_fields = ['name', 'display_url']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        """Get ads for the account based on customer_id"""
        customer_id = self.kwargs['customer_id']
        return Ad.objects.filter(
            customer_account__customer_id=customer_id,
            customer_account__created_by=self.request.user
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdSerializer
        return AdListSerializer

    def perform_create(self, serializer):
        """Automatically associate with current account when creating ad"""
        customer_id = self.kwargs['customer_id']
        customer_account = get_object_or_404(
            CustomerAccount,
            customer_id=customer_id,
            created_by=self.request.user
        )
        serializer.save(
            customer_account=customer_account,
            created_by=self.request.user
        )

class AdByAccountView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get single ad by Google Ads account
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get specific ad based on customer_id and ad_id"""
        customer_id = self.kwargs['customer_id']
        ad_id = self.kwargs['ad_id']
        return get_object_or_404(
            Ad,
            customer_account__customer_id=customer_id,
            id=ad_id,
            customer_account__created_by=self.request.user
        )

    def get_serializer_class(self):
        return AdSerializer

# ========== Global operation view functions ==========

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_ad(request, ad_id):
    """
    Get single ad
    GET /google_ads/{ad_id}
    """
    try:
        ad = get_object_or_404(
            Ad.objects.select_related('customer_account', 'created_by'),
            id=ad_id,
            customer_account__created_by=request.user
        )
        serializer = AdSerializer(ad)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )

class AdUpdateView(generics.UpdateAPIView):
    """
    Update ad
    POST /google_ads/{ad_id}/update/
    """
    queryset = Ad.objects.all()
    serializer_class = AdSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only return ads for current user"""
        return self.queryset.filter(
            customer_account__created_by=self.request.user
        )

    def get_object(self):
        """Get ad object to update"""
        ad_id = self.kwargs['ad_id']
        return get_object_or_404(
            self.get_queryset(),
            id=ad_id
        )

class AdDeleteView(generics.DestroyAPIView):
    """
    Delete ad
    DELETE /google_ads/{ad_id}/delete/
    """
    queryset = Ad.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only return ads for current user"""
        return self.queryset.filter(
            customer_account__created_by=self.request.user
        )

    def get_object(self):
        """Get ad object to delete"""
        ad_id = self.kwargs['ad_id']
        return get_object_or_404(
            self.get_queryset(),
            id=ad_id
        )

# ========== Preview related views ==========

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_preview_from_ad(request, ad_id):
    """
    Create preview from current ad
    POST /google_ads/{ad_id}/create_preview/
    """
    try:
        # Get ad
        ad = get_object_or_404(
            Ad.objects.filter(customer_account__created_by=request.user),
            id=ad_id
        )
        
        # Get request parameters
        device_type = request.data.get('device_type', 'DESKTOP')
        
        # Create preview
        preview = AdPreviewService.generate_preview_from_ad(
            ad=ad,
            device_type=device_type
        )
        
        return Response({
            'token': preview.token,
            'ad_id': preview.ad.id,
            'device_type': preview.device_type,
            'preview_url': f'/google_ads/preview/{preview.token}/',
            'expiration_date_time': preview.expiration_date_time.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except ValidationError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Http404:
        return Response(
            {'error': 'Ad draft not found', 'code': 'NOT_FOUND'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': 'Unauthorized access', 'code': 'UNAUTHORIZED'},
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['GET'])
def get_preview_data(request, token):
    """
    Get preview data by token
    GET /google_ads/preview/{token}/
    """
    try:
        # Get preview instance
        preview = AdPreview.objects.get(token=token)
        
        # Check if expired
        from django.utils import timezone
        if preview.expiration_date_time < timezone.now():
            return Response(
                {'error': 'Preview token has expired', 'code': 'TOKEN_EXPIRED'},
                status=status.HTTP_410_GONE
            )
        
        # Get preview data
        preview_data = AdPreviewService.get_preview_by_token(token)
        
        return Response({
            'ad': {
                'id': preview.ad.id,
                'name': preview.ad.name,
                'type': preview.ad.type,
                'status': preview.ad.status
            },
            'device_type': preview.device_type,
            'preview_data': preview_data,
            'created_at': preview.created_at.isoformat(),
            'expiration_date_time': preview.expiration_date_time.isoformat()
        }, status=status.HTTP_200_OK)
        
    except AdPreview.DoesNotExist:
        return Response(
            {'error': 'Preview token not found', 'code': 'TOKEN_NOT_FOUND'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': 'Unauthorized access', 'code': 'UNAUTHORIZED'},
            status=status.HTTP_401_UNAUTHORIZED
        )


