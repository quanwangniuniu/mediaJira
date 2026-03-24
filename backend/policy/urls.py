from django.urls import path
from policy.views import PlatformPolicyUpdateViewSet, get_policy_choices

urlpatterns = [
    # Choices endpoint
    path('policy-choices/', get_policy_choices, name='policy-choices'),

    # CRUD endpoints
    path('platform-policy-updates/', PlatformPolicyUpdateViewSet.as_view({'get': 'list', 'post': 'create'}), name='platform-policy-update-list'),
    path('platform-policy-updates/<int:pk>/', PlatformPolicyUpdateViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='platform-policy-update-detail'),

    # Action endpoints
    path('platform-policy-updates/<int:pk>/mark-mitigation-completed/', PlatformPolicyUpdateViewSet.as_view({'post': 'mark_mitigation_completed'}), name='platform-policy-update-mark-mitigation-completed'),
    path('platform-policy-updates/<int:pk>/mark-reviewed/', PlatformPolicyUpdateViewSet.as_view({'post': 'mark_reviewed'}), name='platform-policy-update-mark-reviewed'),
]
