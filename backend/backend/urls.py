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
    path('api/', include('campaigns.urls')),
    path('api/test/', include('test_app.urls')),
    path('health/', health_check, name='health_check'),
    path('api/access_control/', include('access_control.urls')),
    path('api/teams/', include('teams.urls')),
    path('auth/', include('authentication.urls')),
    path('users/', include('user_preferences.urls')),
    path('notifications/mock-task-alert/', user_pref_views.mock_task_alert, name='mock-task-alert'),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
