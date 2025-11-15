from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'stripe_meta'

urlpatterns = [
    # Plan endpoints
    # GET /plans
    path('plans/', views.list_plans, name='list_plans'),
    path('plans/switch/', views.switch_plan, name='switch_plan'),


    # Subscription endpoints
    # GET & POST /subscription
    path('subscription/', views.get_subscription, name='get_subscription'),
    path('subscription/cancel/', views.cancel_subscription, name='cancel_subscription'),

    # Checkout endpoints
    # POST /checkout
    path('checkout/', views.create_checkout_session, name='create_checkout_session'),

    # Usage endpoints
    # GET /usage
    path('usage/', views.get_usage, name='get_usage'),
    
    # Organization endpoints
    # POST /organization
    path('organization/', views.create_organization, name='create_organization'),
    # POST /organization/invite
    path('organization/invite/', views.invite_users_to_organization, name='invite_users_to_organization'),
    # POST /organization/leave
    path('organization/leave/', views.leave_organization, name='leave_organization'),
    # GET /organization/users
    path('organization/users/', views.list_organization_users, name='list_organization_users'),
    # DELETE /organization/users/<int:user_id>
    path('organization/users/<int:user_id>/', views.remove_organization_user, name='remove_organization_user'),
    
    # Webhook endpoint (no authentication required)
    path('webhook/', views.stripe_webhook, name='stripe_webhook'),
]
