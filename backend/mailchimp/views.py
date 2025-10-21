from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import Campaign
from .serializers import CampaignSerializer

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().select_related('settings', 'settings__template')
    serializer_class = CampaignSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def preview(self, request, id=None):
        campaign = self.get_object()
        settings = getattr(campaign, 'settings', None)
        template = getattr(settings, 'template', None)
        default_content = getattr(template, 'default_content', None)

        if not settings or not template:
            return Response({'error': 'Campaign settings or template missing.'}, status=400)

        data = {
            "subject_line": settings.subject_line,
            "sections": [],
        }

        if default_content and hasattr(default_content, 'sections'):
            for section in default_content.sections:
                data["sections"].append({
                    "content": section.get("content", ""),
                    "type": section.get("type", "text"),
                })

        return Response(data, status=200)
