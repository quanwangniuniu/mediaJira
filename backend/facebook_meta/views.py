from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.exceptions import NotFound,ValidationError
from .serializers import AdCreativeDetailSerializer, UpdateAndDeleteAdCreativeSerializer, CreateAdCreativeSerializer, ErrorResponseSerializer
from .models import AdAccount, AdCreative
import time
import random
import json
from .services import (
    validate_ad_creative_id_numeric_string,
    validate_fields_param,
    validate_thumbnail_dimensions,
    get_ad_creative_by_id,
    create_preview_from_ad_creative,
    create_preview_from_creative_data,
    get_preview_by_token
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ad_creative(request, ad_creative_id):
    """
    Get an ad creative by id
    
    GET /facebook_meta/{ad_creative_id}
    
    Parameters:
    - ad_creative_id: Numeric string ID of the ad creative
    - fields: Optional comma-separated list of fields to retrieve
    - thumbnail_height: Optional height for thumbnails (default: 64)
    - thumbnail_width: Optional width for thumbnails (default: 64)
    
    Returns:
    - 200: AdCreative object matching OpenAPI spec
    - 400: Bad Request with error details
    - 404: AdCreative not found
    """
    try:
        # Validate ad_creative_id format
        if not validate_ad_creative_id_numeric_string(ad_creative_id):
            return Response(
                ErrorResponseSerializer(
                    {"error": "ad_creative_id must be a numeric string", "code": "INVALID_ID_FORMAT"}
                ).data,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get and validate query parameters
        fields_param = request.GET.get('fields', '')
        thumbnail_width = request.GET.get('thumbnail_width')
        thumbnail_height = request.GET.get('thumbnail_height')
        
        # Convert thumbnail dimensions to integers if provided
        if thumbnail_width is not None:
            try:
                thumbnail_width = int(thumbnail_width)
            except ValueError:
                return Response(
                    ErrorResponseSerializer(
                        {"error": "thumbnail_width must be an integer", "code": "INVALID_THUMBNAIL_WIDTH"}
                    ).data,
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if thumbnail_height is not None:
            try:
                thumbnail_height = int(thumbnail_height)
            except ValueError:
                return Response(
                    ErrorResponseSerializer(
                        {"error": "thumbnail_height must be an integer", "code": "INVALID_THUMBNAIL_HEIGHT"}
                    ).data,
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate thumbnail dimensions
        try:
            validate_thumbnail_dimensions(thumbnail_width, thumbnail_height)
        except ValidationError as e:
            return Response(
                ErrorResponseSerializer(
                    {"error": str(e), "code": "INVALID_THUMBNAIL_DIMENSIONS"}
                ).data,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate fields parameter
        try:
            requested_fields = validate_fields_param(fields_param)
        except ValidationError as e:
            return Response(
                ErrorResponseSerializer(
                    {"error": str(e), "code": "INVALID_FIELDS"}
                ).data,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the ad creative
        try:
            ad_creative = get_ad_creative_by_id(ad_creative_id)
        except ValidationError as e:
            if "not found" in str(e).lower():
                return Response(
                    ErrorResponseSerializer(
                        {"error": "AdCreative not found", "code": "NOT_FOUND"}
                    ).data,
                    status=status.HTTP_404_NOT_FOUND
                )
            else:
                return Response(
                    ErrorResponseSerializer(
                        {"error": str(e), "code": "VALIDATION_ERROR"}
                    ).data,
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Serialize the response
        serializer = AdCreativeDetailSerializer(ad_creative)
        response_data = serializer.data
        
        # Apply field filtering if requested
        if requested_fields:
            filtered_data = {}
            for field in requested_fields:
                if field in response_data:
                    filtered_data[field] = response_data[field]
            response_data = filtered_data
        
        # Apply thumbnail dimensions if provided
        if thumbnail_width or thumbnail_height:
            # Note: In a real implementation, you might want to modify thumbnail URLs
            # to include width/height parameters for dynamic resizing
            if 'thumbnail_url' in response_data and response_data['thumbnail_url']:
                # This is a placeholder - in practice you'd modify the URL or regenerate thumbnails
                pass
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        # Handle unexpected errors
        return Response(
            ErrorResponseSerializer(
                {"error": "Internal server error", "code": "INTERNAL_ERROR"}
            ).data ,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class AdCreativesByLabelsView(generics.ListAPIView):
    """
    Get ad creatives by labels
    
    GET /facebook_meta/act_{ad_account_id}/adcreativesbylabels
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AdCreativeDetailSerializer
    
    def get_queryset(self):
        """Return ad creatives filtered by labels"""
        ad_account_id = self.kwargs['ad_account_id']
        
        # Validate ad_account_id format
        if not validate_ad_creative_id_numeric_string(ad_account_id):
            raise ValidationError("ad_account_id must be a numeric string")
        
        # Get labels parameter - handle JSON array of strings
        labels_param_str = self.request.GET.get('labels')
        if not labels_param_str:
            raise ValidationError("labels parameter is required")
        
        # Parse JSON array
        try:
            labels_param = json.loads(labels_param_str)
            if not isinstance(labels_param, list):
                raise ValidationError("labels parameter must be an array of strings")
        except (json.JSONDecodeError, TypeError):
            raise ValidationError("labels parameter must be a valid JSON array")
        # Get the ad account
        try:
            ad_account = AdAccount.objects.get(id=ad_account_id)
        except AdAccount.DoesNotExist:
            raise NotFound("AdAccount not found")
        
        # Get ad creatives filtered by labels
        # For multiple labels, we want ad creatives that have ALL the specified labels
        queryset = AdCreative.objects.filter(account=ad_account)
        
        # Filter by each label individually to ensure ALL labels are present
        for label_name in labels_param:
            queryset = queryset.filter(ad_labels__name=label_name)
        
        return queryset.prefetch_related(
            'ad_labels',
            'object_story_spec_link_data',
            'object_story_spec_photo_data',
            'object_story_spec_video_data',
            'object_story_spec_text_data',
            'object_story_spec_template_data'
        ).distinct()
    
    def list(self, request, *args, **kwargs):
        """Override list to apply field filtering"""
        # Validate fields parameter
        fields_param = request.GET.get('fields', '')
        try:
            requested_fields = validate_fields_param(fields_param)
        except ValidationError as e:
            return Response(
                ErrorResponseSerializer(
                    {"error": str(e), "code": "INVALID_FIELDS"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the standard paginated response
        response = super().list(request, *args, **kwargs)
        
        # Apply field filtering if requested
        if requested_fields and response.data.get('results'):
            filtered_results = []
            for ad_creative_data in response.data['results']:
                filtered_ad_creative = {}
                for field in requested_fields:
                    if field in ad_creative_data:
                        filtered_ad_creative[field] = ad_creative_data[field]
                filtered_results.append(filtered_ad_creative)
            response.data['results'] = filtered_results
        
        return response


class AdCreativesByAccountView(generics.ListCreateAPIView):
    """
    Get and create ad creatives by ad account id
    
    GET /facebook_meta/act_{ad_account_id}/adcreatives
    POST /facebook_meta/act_{ad_account_id}/adcreatives
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Use different serializers for GET and POST"""
        if self.request.method == 'POST':
            return CreateAdCreativeSerializer
        return AdCreativeDetailSerializer
    
    def get_queryset(self):
        """Return ad creatives for the specified account"""
        ad_account_id = self.kwargs['ad_account_id']
        
        # Validate ad_account_id format
        if not validate_ad_creative_id_numeric_string(ad_account_id):
            raise ValidationError("ad_account_id must be a numeric string")
        
        # Get the ad account
        try:
            ad_account = AdAccount.objects.get(id=ad_account_id)
        except AdAccount.DoesNotExist:
            raise NotFound("AdAccount not found")
        
        # Get ad creatives for this account
        return AdCreative.objects.filter(
            account=ad_account
        ).select_related(
            'account', 'actor'
        ).prefetch_related(
            'ad_labels',
            'object_story_spec_link_data',
            'object_story_spec_photo_data',
            'object_story_spec_video_data',
            'object_story_spec_text_data',
            'object_story_spec_template_data'
        ).distinct()
    
    def list(self, request, *args, **kwargs):
        """Override list to apply field filtering"""
        # Validate fields parameter
        fields_param = request.GET.get('fields', '')
        try:
            requested_fields = validate_fields_param(fields_param)
        except ValidationError as e:
            return Response(
                ErrorResponseSerializer(
                    {"error": str(e), "code": "INVALID_FIELDS"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the standard paginated response
        response = super().list(request, *args, **kwargs)
        
        # Apply field filtering if requested
        if requested_fields and response.data.get('results'):
            filtered_results = []
            for ad_creative_data in response.data['results']:
                filtered_ad_creative = {}
                for field in requested_fields:
                    if field in ad_creative_data:
                        filtered_ad_creative[field] = ad_creative_data[field]
                filtered_results.append(filtered_ad_creative)
            response.data['results'] = filtered_results
        
        return response
    
    def create(self, request, *args, **kwargs):
        """Override create to match OpenAPI spec response"""
        try:
            ad_account_id = self.kwargs['ad_account_id']
            
            # Validate ad_account_id format
            if not validate_ad_creative_id_numeric_string(ad_account_id):
                return Response(
                    ErrorResponseSerializer(
                        {"error": "ad_account_id must be a numeric string", "code": "INVALID_ID_FORMAT"}
                    ).data ,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the ad account
            try:
                ad_account = AdAccount.objects.get(id=ad_account_id)
            except AdAccount.DoesNotExist:
                return Response(
                    ErrorResponseSerializer(
                        {"error": "AdAccount not found", "code": "NOT_FOUND"}
                    ).data ,
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate request data
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    ErrorResponseSerializer(
                        {"error": "Invalid data", "code": "INVALID_DATA"}
                    ).data ,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate unique numeric string ID

            unique_id = str(int(time.time() * 1000000) + random.randint(1000, 9999))
            
            # Create the ad creative with account_id, actor_id, and unique ID
            ad_creative = serializer.save(id=unique_id, account=ad_account, actor=request.user)
            
            # Return success response according to OpenAPI spec
            return Response(
                {"data": {"id": str(ad_creative.id)}},
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                ErrorResponseSerializer(
                    {"error": "Internal server error", "code": "INTERNAL_ERROR"}
                ).data ,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdCreativeUpdateView(generics.UpdateAPIView):
    """
    Update an ad creative by id
    
    POST /facebook_meta/{ad_creative_id}
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UpdateAndDeleteAdCreativeSerializer
    lookup_field = 'id'
    
    def get_queryset(self):
        """Return the ad creative to update"""
        return AdCreative.objects.all()
    
    def get_object(self):
        """Override to handle ad_creative_id parameter and validation"""
        ad_creative_id = self.kwargs['ad_creative_id']
        
        # Validate ad_creative_id format
        if not validate_ad_creative_id_numeric_string(ad_creative_id):
            raise ValidationError("ad_creative_id must be a numeric string")
        
        try:
            return AdCreative.objects.get(id=ad_creative_id)
        except AdCreative.DoesNotExist:
            raise NotFound("Ad creative not found")
    
    def update(self, request, *args, **kwargs):
        """Override update to match OpenAPI spec response"""
        # Get the ad creative (get_object handles validation and 404 errors)
        ad_creative = self.get_object()
        
        # Validate request data
        serializer = self.get_serializer(ad_creative, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                ErrorResponseSerializer(
                    {"error": "Invalid data", "code": "INVALID_DATA"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update the ad creative
        serializer.save()
        
        # Return success response according to OpenAPI spec
        return Response(
            {"success": True},
            status=status.HTTP_200_OK
        )
    
    def handle_exception(self, exc):
        """Custom exception handler to return expected error format"""
        
        if isinstance(exc, NotFound):
            return Response(
                ErrorResponseSerializer(
                    {"error": "AdCreative not found", "code": "NOT_FOUND"}
                ).data ,
                status=status.HTTP_404_NOT_FOUND
            )
        elif isinstance(exc, ValidationError):
            return Response(
                ErrorResponseSerializer(
                    {"error": str(exc.detail), "code": "INVALID_ID_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().handle_exception(exc)


class AdCreativeDeleteView(generics.DestroyAPIView):
    """
    Delete an ad creative by id
    
    DELETE /facebook_meta/{ad_creative_id}
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Return the ad creative to delete"""
        return AdCreative.objects.all()
    
    def get_object(self):
        """Override to handle ad_creative_id parameter and validation"""
        ad_creative_id = self.kwargs['ad_creative_id']
        
        # Validate ad_creative_id format
        if not validate_ad_creative_id_numeric_string(ad_creative_id):
            raise ValidationError("ad_creative_id must be a numeric string")
        
        try:
            return AdCreative.objects.get(id=ad_creative_id)
        except AdCreative.DoesNotExist:
            raise NotFound("Ad creative not found")
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to match OpenAPI spec response"""
        # Get the ad creative (get_object handles validation and 404 errors)
        ad_creative = self.get_object()
        
        # Delete the ad creative
        ad_creative.delete()
        
        # Return success response according to OpenAPI spec
        return Response(
            {"success": True},
            status=status.HTTP_200_OK
        )
    
    def handle_exception(self, exc):
        """Custom exception handler to return expected error format"""
        
        if isinstance(exc, NotFound):
            return Response(
                ErrorResponseSerializer(
                    {"error": "AdCreative not found", "code": "NOT_FOUND"}
                ).data,
                status=status.HTTP_404_NOT_FOUND
            )
        elif isinstance(exc, ValidationError):
            return Response(
                ErrorResponseSerializer(
                    {"error": str(exc.detail), "code": "INVALID_ID_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().handle_exception(exc)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ad_creative_previews(request, ad_creative_id):
    """
    Get previews of an ad creative by id
    
    GET /facebook_meta/{ad_creative_id}/previews
    """
    try:
        # Validate ad_creative_id format
        if not validate_ad_creative_id_numeric_string(ad_creative_id):
            return Response(
                ErrorResponseSerializer(
                    {"error": "ad_creative_id must be a numeric string", "code": "INVALID_ID_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get required ad_format parameter
        ad_format = request.GET.get('ad_format')
        if not ad_format:
            return Response(
                ErrorResponseSerializer(
                    {"error": "ad_format parameter is required", "code": "MISSING_AD_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get optional parameters
        creative_feature = request.GET.get('creative_feature')
        dynamic_asset_label = request.GET.get('dynamic_asset_label')
        dynamic_creative_spec = request.GET.get('dynamic_creative_spec')
        dynamic_customization = request.GET.get('dynamic_customization')
        end_date = request.GET.get('end_date')
        start_date = request.GET.get('start_date')
        height = request.GET.get('height')
        width = request.GET.get('width')
        place_page_id = request.GET.get('place_page_id')
        post = request.GET.get('post')
        product_item_ids = request.GET.getlist('product_item_ids')
        
        # Create preview from ad creative
        preview_data = create_preview_from_ad_creative(
            ad_creative_id=ad_creative_id,
            ad_format=ad_format,
            creative_feature=creative_feature,
            dynamic_asset_label=dynamic_asset_label,
            dynamic_creative_spec=dynamic_creative_spec,
            dynamic_customization=dynamic_customization,
            end_date=end_date,
            start_date=start_date,
            height=height,
            width=width,
            place_page_id=place_page_id,
            post=post,
            product_item_ids=product_item_ids
        )
        
        # Return paginated response with single preview
        response_data = {
            "count": 1,
            "next": None,
            "previous": None,
            "results": [    
                {
                    "body": {
                        "token": preview_data['token']
                    }
                }   
            ]
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        if "not found" in str(e).lower():
            return Response(
                ErrorResponseSerializer(
                    {"error": "AdCreative not found", "code": "NOT_FOUND"}
                ).data ,
                status=status.HTTP_404_NOT_FOUND
            )
        else:
            return Response(
                ErrorResponseSerializer(
                    {"error": str(e), "code": "VALIDATION_ERROR"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
    except Exception as e:
        return Response(
            ErrorResponseSerializer(
                {"error": "Internal server error", "code": "INTERNAL_ERROR"}
            ).data ,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_previews_by_account(request, ad_account_id):
    """
    Get previews of an ad creative by ad account id
    
    GET /facebook_meta/act_{ad_account_id}/generatepreviews
    """
    try:
        # Validate ad_account_id format
        if not validate_ad_creative_id_numeric_string(ad_account_id):
            return Response(
                ErrorResponseSerializer(
                    {"error": "ad_account_id must be a numeric string", "code": "INVALID_ID_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get required parameters
        ad_format = request.GET.get('ad_format')
        if not ad_format:
            return Response(
                ErrorResponseSerializer(
                    {"error": "ad_format parameter is required", "code": "MISSING_AD_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        creative = request.GET.get('creative')
        if not creative:
            return Response(
                ErrorResponseSerializer(
                    {"error": "creative parameter is required", "code": "MISSING_CREATIVE"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse creative data
        try:
            creative_data = json.loads(creative) if isinstance(creative, str) else creative
        except (json.JSONDecodeError, TypeError):
            return Response(
                ErrorResponseSerializer(
                    {"error": "creative parameter must be valid JSON", "code": "INVALID_CREATIVE_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get optional parameters
        creative_feature = request.GET.get('creative_feature')
        dynamic_asset_label = request.GET.get('dynamic_asset_label')
        dynamic_creative_spec = request.GET.get('dynamic_creative_spec')
        dynamic_customization = request.GET.get('dynamic_customization')
        end_date = request.GET.get('end_date')
        start_date = request.GET.get('start_date')
        height = request.GET.get('height')
        width = request.GET.get('width')
        place_page_id = request.GET.get('place_page_id')
        post = request.GET.get('post')
        product_item_ids = request.GET.getlist('product_item_ids')
        
        # Create preview from creative data
        preview_data = create_preview_from_creative_data(
            creative_data=creative_data,
            ad_format=ad_format,
            ad_account=ad_account_id,
            creative_feature=creative_feature,
            dynamic_asset_label=dynamic_asset_label,
            dynamic_creative_spec=dynamic_creative_spec,
            dynamic_customization=dynamic_customization,
            end_date=end_date,
            start_date=start_date,
            height=height,
            width=width,
            place_page_id=place_page_id,
            post=post,
            product_item_ids=product_item_ids
        )
        
        # Return paginated response with single preview
        response_data = {
            "count": 1,
            "next": None,
            "previous": None,
            "results": [
                {
                    "body": {
                        "token": preview_data['token']
                    }
                }
            ]
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response(
            ErrorResponseSerializer(
                {"error": str(e), "code": "VALIDATION_ERROR"}
            ).data ,
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            ErrorResponseSerializer(
                {"error": "Internal server error", "code": "INTERNAL_ERROR"}
            ).data ,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_previews(request):
    """
    Generate previews from creative data (not associated with specific ad account)
    
    GET /facebook_meta/generatepreviews
    """
    try:
        # Get required parameters
        ad_format = request.GET.get('ad_format')
        if not ad_format:
            return Response(
                ErrorResponseSerializer(
                    {"error": "ad_format parameter is required", "code": "MISSING_AD_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        creative = request.GET.get('creative')
        if not creative:
            return Response(
                ErrorResponseSerializer(
                    {"error": "creative parameter is required", "code": "MISSING_CREATIVE"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse creative data
        try:
            creative_data = json.loads(creative) if isinstance(creative, str) else creative
        except (json.JSONDecodeError, TypeError):
            return Response(
                ErrorResponseSerializer(
                    {"error": "creative parameter must be valid JSON", "code": "INVALID_CREATIVE_FORMAT"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get optional parameters
        creative_feature = request.GET.get('creative_feature')
        dynamic_asset_label = request.GET.get('dynamic_asset_label')
        dynamic_creative_spec = request.GET.get('dynamic_creative_spec')
        dynamic_customization = request.GET.get('dynamic_customization')
        end_date = request.GET.get('end_date')
        start_date = request.GET.get('start_date')
        height = request.GET.get('height')
        width = request.GET.get('width')
        place_page_id = request.GET.get('place_page_id')
        post = request.GET.get('post')
        product_item_ids = request.GET.getlist('product_item_ids')
        
        # Create preview from creative data
        preview_data = create_preview_from_creative_data(
            creative_data=creative_data,
            ad_format=ad_format,
            creative_feature=creative_feature,
            dynamic_asset_label=dynamic_asset_label,
            dynamic_creative_spec=dynamic_creative_spec,
            dynamic_customization=dynamic_customization,
            end_date=end_date,
            start_date=start_date,
            height=height,
            width=width,
            place_page_id=place_page_id,
            post=post,
            product_item_ids=product_item_ids
        )
        
        # Return paginated response with single preview
        response_data = {
            "count": 1,
            "next": None,
            "previous": None,
            "results": [
                {
                    "body": {
                        "token": preview_data['token']
                    }
                }
            ]
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response(
            ErrorResponseSerializer(
                {"error": str(e), "code": "VALIDATION_ERROR"}
            ).data ,
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            ErrorResponseSerializer(
                {"error": "Internal server error", "code": "INTERNAL_ERROR"}
            ).data ,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preview_json_spec(request, token):
    """
    Get preview JSON spec by token
    
    GET /facebook_meta/preview/{token}/
    """
    try:
        # Get JSON spec by token
        json_spec = get_preview_by_token(token)
        
        return Response(json_spec, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        if "expired" in str(e).lower():
            return Response(
                ErrorResponseSerializer(
                    {"error": "Preview token has expired", "code": "TOKEN_EXPIRED"}
                ).data ,
                status=status.HTTP_410_GONE
            )
        elif "not found" in str(e).lower():
            return Response(
                ErrorResponseSerializer(
                    {"error": "Preview token not found", "code": "TOKEN_NOT_FOUND"}
                ).data ,
                status=status.HTTP_404_NOT_FOUND
            )
        else:
            return Response(
                ErrorResponseSerializer(
                    {"error": str(e), "code": "VALIDATION_ERROR"}
                ).data ,
                status=status.HTTP_400_BAD_REQUEST
            )
    except Exception as e:
        return Response(
            ErrorResponseSerializer(
                {"error": "Internal server error", "code": "INTERNAL_ERROR"}
            ).data ,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
