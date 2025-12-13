"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from user_preferences import views as user_pref_views


def health_check(request):
    return HttpResponse("OK", content_type="text/plain")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/access_control/', include('access_control.urls')),
    path('api/teams/', include('teams.urls')),
    path('auth/', include('authentication.urls')),
    path('users/', include('user_preferences.urls')),
    path('api/assets/', include('asset.urls')),
    path('api/metric_upload/', include('metric_upload.urls')),
    path('notifications/mock-task-alert/', user_pref_views.mock_task_alert, name='mock-task-alert'),
    path('budgets/', include('budget_approval.urls')),
    path('api/budgets/', include('budget_approval.urls')),  # Add API prefix for frontend compatibility
    path('api/retrospective/', include('retrospective.urls')),
    path('api/core/', include('core.urls')),
    path('api/', include('task.urls')),
    path('api/campaigns/', include('campaign.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/optimization/', include('optimization.urls')),
    path('api/notion/', include('notion_editor.urls')),
    path('api/tiktok/', include('tiktok.urls')),
    path('api/facebook_meta/', include('facebook_meta.urls')),
    path('api/google_ads/', include('google_ads.urls')),
    path('api/mailchimp/', include('mailchimp.urls')),
    path('api/stripe/', include('stripe_meta.urls')),
    path('api/klaviyo/', include('klaviyo.urls')),
    path("", include("django_prometheus.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
