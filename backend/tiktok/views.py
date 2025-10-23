import os
import hashlib
import mimetypes
import tempfile
import subprocess
import json
import io
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import TikTokCreative
from PIL import Image, UnidentifiedImageError

# ----------------------
# Centralized constants
# ----------------------
ALLOWED_IMAGE_MIME_TYPES = {
    'image/jpeg', 'image/png', 'image/webp'
}
IMAGE_MAX_BYTES = 10 * 1024 * 1024  # 10MB limit for images
MIN_DIMENSION = 1
ASPECT_RATIO_TOLERANCE = 0.01
# Minimum dimensions per allowed aspect ratio
MIN_SIZE_1_91_1 = (1200, 628)  # width, height
MIN_SIZE_1_1 = (640, 640)
MIN_SIZE_9_16 = (720, 1280)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_video_ad(request):
    """Upload video advertisement content."""
    try:
        # Validate required fields
        if 'file' not in request.FILES:
            return Response({
                'error': 'file is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if 'name' not in request.data:
            return Response({
                'error': 'name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        name = request.data['name']
        original_filename = request.data.get('original_filename', file.name)
        
        # Validate file type
        mime_type, _ = mimetypes.guess_type(file.name)
        if mime_type != 'video/mp4':
            return Response({
                'error': 'Only video/mp4 files are supported'
            }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        
        # Validate file size (100MB limit)
        if file.size > 100 * 1024 * 1024:
            return Response({
                'error': 'File exceeds max size: 100MB'
            }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        
        # Generate MD5 hash
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        md5_hash = hashlib.md5(file_content).hexdigest()
        
        # Check for duplicate files
        existing_creative = TikTokCreative.objects.filter(md5=md5_hash).first()
        if existing_creative:
            return Response({
                'id': existing_creative.id,
                'name': existing_creative.name,
                'type': existing_creative.type,
                'storage_path': existing_creative.storage_path,
                'original_filename': existing_creative.original_filename,
                'mime_type': existing_creative.mime_type,
                'size_bytes': existing_creative.size_bytes,
                'width': existing_creative.width,
                'height': existing_creative.height,
                'duration_sec': existing_creative.duration_sec,
                'md5': existing_creative.md5,
                'preview_url': existing_creative.preview_url,
                'scan_status': existing_creative.scan_status,
                'uploaded_by': existing_creative.uploaded_by_id,
                'created_at': existing_creative.created_at,
                'updated_at': existing_creative.updated_at
            }, status=status.HTTP_201_CREATED)
        
        # Generate storage path
        file_extension = os.path.splitext(file.name)[1]
        storage_filename = f"tiktok/videos/{md5_hash}{file_extension}"
        
        # Save file to storage
        storage_path = default_storage.save(storage_filename, ContentFile(file_content))
        
        # Extract video metadata using mediainfo
        try:
            temp_path = None
            # Save file temporarily for metadata extraction
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                temp_file.write(file_content)
                temp_file.flush()
                temp_path = temp_file.name

            def probe_duration_ms(path: str) -> float:
                try:
                    res = subprocess.run(
                        ['mediainfo', '--Inform=General;%Duration%', path],
                        capture_output=True, text=True, check=True
                    )
                    s = (res.stdout or '').strip()
                    # Expect a number in milliseconds, e.g. "10023"
                    return float(s) if s and s.replace('.', '', 1).isdigit() else 0.0
                except Exception:
                    return 0.0
            
            # Extract video metadata using mediainfo
            result = subprocess.run([
                'mediainfo',
                '--Output=JSON',
                temp_path
            ], capture_output=True, text=True, check=True)
            
            metadata = json.loads(result.stdout)
            media_info = metadata.get('media', {})
            tracks = media_info.get('track', [])
            
            # Find tracks
            video_track = next((t for t in tracks if t.get('@type') == 'Video'), None)
            general_track = next((t for t in tracks if t.get('@type') == 'General'), None)
            
            if not video_track:
                return Response({
                    'error': 'No video stream found in file'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            def _to_int(val):
                if isinstance(val, (int, float)):
                    return int(val)
                if isinstance(val, str):
                    digits = ''.join(ch for ch in val if ch.isdigit())
                    return int(digits) if digits else 0
                return 0
            
            def _to_float(val):
                try:
                    return float(val)
                except Exception:
                    return 0.0
            
            width = _to_int(video_track.get('Width', 0))
            height = _to_int(video_track.get('Height', 0))
            
            # Prefer numeric milliseconds from --Inform (most reliable), fallback to JSON parsing
            dur_ms_primary = probe_duration_ms(temp_path)
            if dur_ms_primary and dur_ms_primary > 0:
                duration_sec = dur_ms_primary / 1000.0
            else:
                dur_ms = _to_float((general_track or {}).get('Duration', 0))
                duration_sec = dur_ms / 1000.0  # Convert from milliseconds
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass
        
        # Validate duration (5-600 seconds)
        violations = []
        if duration_sec < 5 or duration_sec > 600:
            violations.append({
                'field': 'duration_sec',
                'rule': 'min/max',
                'message': 'Duration must be between 5 and 600 seconds',
                'actual': str(duration_sec),
                'expected': '5–600'
            })
        
        # Validate aspect ratio and resolution with 1% tolerance
        aspect_ratio = (width / height) if height > 0 else 0.0
        tolerance = 0.01
        valid_1_1 = abs(aspect_ratio - 1.0) <= tolerance and width >= 640 and height >= 640
        valid_9_16 = abs(aspect_ratio - (9/16)) <= tolerance and width >= 540 and height >= 960
        valid_16_9 = abs(aspect_ratio - (16/9)) <= tolerance and width >= 960 and height >= 540
        
        if not (valid_1_1 or valid_9_16 or valid_16_9):
            violations.append({
                'field': 'resolution/aspect_ratio',
                'rule': 'allowed',
                'message': 'Resolution too low or aspect ratio not allowed',
                'actual': f'{width}x{height} (AR={aspect_ratio:.3f})',
                'expected': '1:1≥640x640 OR 9:16≥540x960 OR 16:9≥960x540'
            })
        
        # Return validation errors if any
        if violations:
            return Response({
                'error': 'Spec validation failed',
                'violations': violations
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Generate preview URL
        preview_url = f"{settings.MEDIA_URL}{storage_path}"
        
        # Create TikTokCreative record
        creative = TikTokCreative.objects.create(
            type='video',
            name=name,
            storage_path=storage_path,
            original_filename=original_filename,
            mime_type=mime_type,
            size_bytes=file.size,
            width=width,
            height=height,
            duration_sec=duration_sec,
            md5=md5_hash,
            preview_url=preview_url,
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=request.user
        )
        
        # Virus scanning will be triggered automatically by signal
        
        return Response({
            'id': creative.id,
            'name': creative.name,
            'type': creative.type,
            'storage_path': creative.storage_path,
            'original_filename': creative.original_filename,
            'mime_type': creative.mime_type,
            'size_bytes': creative.size_bytes,
            'width': creative.width,
            'height': creative.height,
            'duration_sec': creative.duration_sec,
            'md5': creative.md5,
            'preview_url': creative.preview_url,
            'scan_status': creative.scan_status,
            'uploaded_by': creative.uploaded_by_id,
            'created_at': creative.created_at,
            'updated_at': creative.updated_at
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Upload failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_image_ad(request):
    """Upload image advertisement content."""
    try:
        # Validate required fields
        if 'file' not in request.FILES:
            return Response({
                'error': 'file is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        name = request.data.get('name', file.name)  # Use filename as default name
        original_filename = request.data.get('original_filename', file.name)
        
        # Validate file type using real uploaded Content-Type
        mime_type = file.content_type or ''
        if mime_type not in ALLOWED_IMAGE_MIME_TYPES:
            return Response({
                'error': f'Only {", ".join(sorted(ALLOWED_IMAGE_MIME_TYPES))} files are supported'
            }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        
        # Validate file size (10MB limit for images)
        if file.size > IMAGE_MAX_BYTES:
            return Response({
                'error': 'File exceeds max size: 10MB'
            }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        
        # Generate MD5 hash
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        md5_hash = hashlib.md5(file_content).hexdigest()
        
        # Check for duplicate files
        existing_creative = TikTokCreative.objects.filter(md5=md5_hash).first()
        if existing_creative:
            return Response({
                'id': existing_creative.id,
                'name': existing_creative.name,
                'type': existing_creative.type,
                'storage_path': existing_creative.storage_path,
                'original_filename': existing_creative.original_filename,
                'mime_type': existing_creative.mime_type,
                'size_bytes': existing_creative.size_bytes,
                'width': existing_creative.width,
                'height': existing_creative.height,
                'duration_sec': existing_creative.duration_sec,
                'md5': existing_creative.md5,
                'preview_url': existing_creative.preview_url,
                'scan_status': existing_creative.scan_status,
                'uploaded_by': existing_creative.uploaded_by_id,
                'created_at': existing_creative.created_at,
                'updated_at': existing_creative.updated_at
            }, status=status.HTTP_201_CREATED)
        
        # Read image dimensions using Pillow (faster/lighter than mediainfo)
        try:
            with Image.open(io.BytesIO(file_content)) as img:
                width, height = img.size
        except UnidentifiedImageError:
            return Response({
                'error': 'Invalid image file'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Reject zero or invalid dimensions explicitly
        if (width or 0) < MIN_DIMENSION or (height or 0) < MIN_DIMENSION or width == 0 or height == 0:
            return Response({
                'error': 'Image dimensions must be greater than 0'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        duration_sec = None  # Images don't have duration
        
        # Generate storage path and save file
        file_extension = os.path.splitext(file.name)[1]
        storage_filename = f"tiktok/images/{md5_hash}{file_extension}"
        storage_path = default_storage.save(storage_filename, ContentFile(file_content))
        
        # Validate image dimensions and aspect ratios
        violations = []
        if width > 0 and height > 0:
            aspect_ratio = width / height
            
            # Check valid aspect ratios and dimensions with tolerance
            valid_1_91_1 = (abs(aspect_ratio - (MIN_SIZE_1_91_1[0]/MIN_SIZE_1_91_1[1])) <= ASPECT_RATIO_TOLERANCE 
                            and width >= MIN_SIZE_1_91_1[0] and height >= MIN_SIZE_1_91_1[1])
            valid_1_1 = (abs(aspect_ratio - 1.0) <= ASPECT_RATIO_TOLERANCE 
                         and width >= MIN_SIZE_1_1[0] and height >= MIN_SIZE_1_1[1])
            valid_9_16 = (abs(aspect_ratio - (MIN_SIZE_9_16[0]/MIN_SIZE_9_16[1])) <= ASPECT_RATIO_TOLERANCE 
                          and width >= MIN_SIZE_9_16[0] and height >= MIN_SIZE_9_16[1])
            
            if not (valid_1_91_1 or valid_1_1 or valid_9_16):
                violations.append({
                    'field': 'resolution/aspect_ratio',
                    'rule': 'allowed',
                    'message': 'Resolution or aspect ratio not allowed',
                    'actual': f'{width}x{height} (AR={aspect_ratio:.3f})',
                    'expected': '1200x628 (1.91:1) OR 640x640 (1:1) OR 720x1280 (9:16)'
                })
        
        # Return validation errors if any
        if violations:
            return Response({
                'error': 'Spec validation failed',
                'violations': violations
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Generate preview URL
        preview_url = f"{settings.MEDIA_URL}{storage_path}"
        
        # Create TikTokCreative record
        creative = TikTokCreative.objects.create(
            type='image',
            name=name,
            storage_path=storage_path,
            original_filename=original_filename,
            mime_type=mime_type,
            size_bytes=file.size,
            width=width,
            height=height,
            duration_sec=duration_sec,
            md5=md5_hash,
            preview_url=preview_url,
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=request.user
        )
        
        # Virus scanning will be triggered automatically by signal
        
        return Response({
            'id': creative.id,
            'name': creative.name,
            'type': creative.type,
            'storage_path': creative.storage_path,
            'original_filename': creative.original_filename,
            'mime_type': creative.mime_type,
            'size_bytes': creative.size_bytes,
            'width': creative.width,
            'height': creative.height,
            'duration_sec': creative.duration_sec,
            'md5': creative.md5,
            'preview_url': creative.preview_url,
            'scan_status': creative.scan_status,
            'uploaded_by': creative.uploaded_by_id,
            'created_at': creative.created_at,
            'updated_at': creative.updated_at
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Upload failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def material_list(request):
    """Get list of uploaded creative materials with pagination and filtering."""
    try:
        # Get query parameters
        creative_type = request.query_params.get('type')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # Validate parameters
        if page < 1:
            return Response({
                'error': 'page must be >= 1'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if page_size < 1 or page_size > 100:
            return Response({
                'error': 'page_size must be between 1 and 100'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate type filter
        if creative_type and creative_type not in ['image', 'video']:
            return Response({
                'error': 'type must be image or video'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Build queryset
        queryset = TikTokCreative.objects.filter(uploaded_by=request.user)
        
        # Apply type filter
        if creative_type:
            queryset = queryset.filter(type=creative_type)
        
        # Order by creation date (newest first)
        queryset = queryset.order_by('-created_at')
        
        # Calculate pagination
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        # Get items for current page
        items_queryset = queryset[start:end]
        
        # Build response items
        items = []
        for creative in items_queryset:
            item = {
                'id': creative.id,
                'type': creative.type,
                'name': creative.name,
                'preview_url': creative.preview_url,
                'width': creative.width,
                'height': creative.height,
                'created_at': creative.created_at.isoformat() if creative.created_at else None
            }
            
            # Add duration for videos
            if creative.type == 'video' and creative.duration_sec is not None:
                item['duration_sec'] = creative.duration_sec
            
            items.append(item)
        
        # Build response
        response_data = {
            'items': items,
            'page': page,
            'page_size': page_size,
            'total': total
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response({
            'error': f'Invalid parameter: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': f'Failed to retrieve materials: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def material_info(request, id):
    """Get detailed information about a specific material."""
    try:
        # Get the creative by ID and ensure it belongs to the current user
        try:
            creative = TikTokCreative.objects.get(id=id, uploaded_by=request.user)
        except TikTokCreative.DoesNotExist:
            return Response({
                'error': 'Material not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Build response data
        response_data = {
            'id': creative.id,
            'name': creative.name,
            'type': creative.type,
            'storage_path': creative.storage_path,
            'original_filename': creative.original_filename,
            'mime_type': creative.mime_type,
            'size_bytes': creative.size_bytes,
            'width': creative.width,
            'height': creative.height,
            'duration_sec': creative.duration_sec,
            'md5': creative.md5,
            'preview_url': creative.preview_url,
            'scan_status': creative.scan_status,
            'uploaded_by': creative.uploaded_by_id,
            'created_at': creative.created_at.isoformat() if creative.created_at else None,
            'updated_at': creative.updated_at.isoformat() if creative.updated_at else None
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to retrieve material info: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


