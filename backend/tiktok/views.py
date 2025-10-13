from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
def upload_video_ad(request):
    """Placeholder endpoint for video ad upload."""
    return Response({"message": "video ad upload placeholder"}, status=status.HTTP_200_OK)


@api_view(['POST'])
def upload_image_ad(request):
    """Placeholder endpoint for image ad upload."""
    return Response({"message": "image ad upload placeholder"}, status=status.HTTP_200_OK)


@api_view(['GET'])
def material_list(request):
    """Placeholder endpoint for material list."""
    return Response({"message": "material list placeholder"}, status=status.HTTP_200_OK)


@api_view(['GET'])
def material_info(request):
    """Placeholder endpoint for material info."""
    return Response({"message": "material info placeholder"}, status=status.HTTP_200_OK)


