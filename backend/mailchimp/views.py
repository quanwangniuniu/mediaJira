from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Campaign, Template, TemplateDefaultContent
from .serializers import CampaignSerializer, TemplateSerializer

class EmailDraftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing email drafts (Campaigns).
    Provides CRUD operations for email drafts with template management.
    """
    serializer_class = CampaignSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter campaigns by the authenticated user"""
        return Campaign.objects.filter(
            user=self.request.user
        ).select_related(
            'settings', 
            'settings__template', 
            'settings__template__default_content'
        ).prefetch_related(
            'recipients',
            'variate_settings',
            'tracking',
            'rss_opts',
            'ab_split_opts',
            'social_card',
            'report_summary',
            'delivery_status',
            'resend_shortcut_eligibility',
            'resend_shortcut_usage'
        )

    def perform_create(self, serializer):
        """Set the user when creating a new campaign"""
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new email draft"""
        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                headers = self.get_success_headers(serializer.data)
                return Response(
                    serializer.data, 
                    status=status.HTTP_201_CREATED, 
                    headers=headers
                )
        except Exception as e:
            return Response(
                {'error': f'Failed to create email draft: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def retrieve(self, request, *args, **kwargs):
        """Get a specific email draft"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Campaign.DoesNotExist:
            return Response(
                {'error': 'Email draft not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def update(self, request, *args, **kwargs):
        """Update an email draft"""
        try:
            with transaction.atomic():
                partial = kwargs.pop('partial', False)
                instance = self.get_object()
                serializer = self.get_serializer(instance, data=request.data, partial=partial)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                return Response(serializer.data)
        except Exception as e:
            if 'No Campaign matches the given query' in str(e):
                return Response(
                    {'error': 'Email draft not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {'error': f'Failed to update email draft: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def destroy(self, request, *args, **kwargs):
        """Delete an email draft"""
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Campaign.DoesNotExist:
            return Response(
                {'error': 'Email draft not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def list(self, request, *args, **kwargs):
        """List all email drafts for the authenticated user"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Failed to list email drafts: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def preview(self, request, id=None):
        """Preview the email draft content"""
        try:
            campaign = self.get_object()
            settings = getattr(campaign, 'settings', None)
            template = getattr(settings, 'template', None)
            default_content = getattr(template, 'default_content', None)

            if not settings:
                return Response(
                    {'error': 'Campaign settings missing.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            data = {
                "subject_line": settings.subject_line,
                "preview_text": settings.preview_text,
                "from_name": settings.from_name,
                "reply_to": settings.reply_to,
                "sections": [],
            }

            if template and default_content and hasattr(default_content, 'sections'):
                if isinstance(default_content.sections, dict):
                    # Handle dict format
                    for key, content in default_content.sections.items():
                        data["sections"].append({
                            "content": content,
                            "type": "text",
                        })
                elif isinstance(default_content.sections, list):
                    # Handle list format
                    for section in default_content.sections:
                        if isinstance(section, dict):
                            data["sections"].append({
                                "content": section.get("content", ""),
                                "type": section.get("type", "text"),
                            })
                        else:
                            data["sections"].append({
                                "content": str(section),
                                "type": "text",
                            })

            return Response(data, status=status.HTTP_200_OK)
        except Campaign.DoesNotExist:
            return Response(
                {'error': 'Email draft not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """List available templates"""
        try:
            templates = Template.objects.filter(active=True)
            serializer = TemplateSerializer(templates, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Failed to list templates: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
