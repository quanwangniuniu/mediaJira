from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Campaign
from .serializers import CampaignSerializer

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().select_related(
        'settings__template__default_content'
    )
    serializer_class = CampaignSerializer
    lookup_field = 'id'

    # 预览接口: 根据 campaign 返回 HTML 预览
    @action(detail=True, methods=['get'])
    def preview(self, request, id=None):
        campaign = self.get_object()
        settings = campaign.settings
        template = settings.template
        default_content = getattr(template, 'default_content', None)

        html = "<html><body>"
        html += f"<h1>{settings.subject_line}</h1>"
        if default_content:
            for section in default_content.sections:
                html += f"<div>{section.get('content','')}</div>"
        html += "</body></html>"

        return Response(html, content_type="text/html")
