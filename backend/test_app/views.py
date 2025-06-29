from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
from django.db.utils import OperationalError
import json
from .models import TestData
from django.utils import timezone


@csrf_exempt
@require_http_methods(["GET"])
def test_connection(request):
    """Test endpoint to verify all connections are working"""
    try:
        # Test database connection
        connection.ensure_connection()
        db_status = "connected"
        
        # Get some test data
        test_data = TestData.objects.filter(is_active=True).first()
        
        if test_data:
            data_message = test_data.message
        else:
            data_message = "No test data found"
            
        return JsonResponse({
            "status": "success",
            "message": "All connections working!",
            "database": db_status,
            "test_data": data_message,
            "timestamp": timezone.now().isoformat()
        })
        
    except OperationalError as e:
        return JsonResponse({
            "status": "error",
            "message": "Database connection failed",
            "error": str(e)
        }, status=500)
    except Exception as e:
        return JsonResponse({
            "status": "error", 
            "message": "Unexpected error",
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_test_data(request):
    """Get all test data from database"""
    try:
        test_data = TestData.objects.filter(is_active=True).order_by('-timestamp')[:10]
        
        data = []
        for item in test_data:
            data.append({
                "id": item.id,
                "message": item.message,
                "timestamp": item.timestamp.isoformat(),
                "is_active": item.is_active
            })
            
        return JsonResponse({
            "status": "success",
            "count": len(data),
            "data": data
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": "Failed to retrieve test data",
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def create_test_data(request):
    """Create new test data"""
    try:
        body = json.loads(request.body)
        message = body.get('message', 'Test message from API')
        
        test_data = TestData.objects.create(
            message=message,
            timestamp=timezone.now()
        )
        
        return JsonResponse({
            "status": "success",
            "message": "Test data created successfully",
            "data": {
                "id": test_data.id,
                "message": test_data.message,
                "timestamp": test_data.timestamp.isoformat(),
                "is_active": test_data.is_active
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            "status": "error",
            "message": "Invalid JSON data"
        }, status=400)
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": "Failed to create test data",
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def clear_test_data(request):
    """Clear all test data (for cleanup)"""
    try:
        count = TestData.objects.filter(is_active=True).count()
        TestData.objects.filter(is_active=True).delete()
        
        return JsonResponse({
            "status": "success",
            "message": f"Cleared {count} test data records"
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": "Failed to clear test data",
            "error": str(e)
        }, status=500) 