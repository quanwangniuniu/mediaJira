from django.shortcuts import render
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class DimensionsView(APIView):
    """
    GET /reports/dimensions/
    Returns available datasets/dimensions/metrics for report configuration.
    This endpoint is read-only and requires authentication.
    NOTE: We intentionally do NOT set an ETag here. Detail endpoints use ETag via ETagMixin.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # TODO: replace with a real call to your dashboard/metrics service (with caching)
        payload = {
            "datasets": ["marketing_attribution_v2", "product_funnel_v1"],
            "dimensions": ["channel", "campaign", "country"],
            "metrics": ["roi", "spend", "ctr", "cvr"],
            "defaults": {"time_grain": "week"},
        }
        resp = Response(payload)
        # Match OAS: cache for 10 minutes
        resp["Cache-Control"] = "public, max-age=600"
        return resp

