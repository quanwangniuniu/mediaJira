from django.urls import path
from . import views

app_name = 'facebook_meta'

urlpatterns = [
    # Specific routes MUST come before the generic '<str:ad_creative_id>/' route
    # GET /facebook_meta/act_{ad_account_id}/adcreativesbylabels
    path('act_<str:ad_account_id>/adcreativesbylabels/', views.AdCreativesByLabelsView.as_view(), name='get_ad_creatives_by_labels'),

    # GET /facebook_meta/act_{ad_account_id}/adcreatives
    path('act_<str:ad_account_id>/adcreatives/', views.AdCreativesByAccountView.as_view(), name='ad_creatives_by_account'),

    # GET /facebook_meta/act_{ad_account_id}/generatepreviews
    path('act_<str:ad_account_id>/generatepreviews/', views.generate_previews_by_account, name='generate_previews_by_account'),

    # GET /facebook_meta/generatepreviews
    path('generatepreviews/', views.generate_previews, name='generate_previews'),

    # GET /facebook_meta/preview/{token}/
    path('preview/<str:token>/', views.get_preview_json_spec, name='get_preview_json_spec'),

    # GET /facebook_meta/{ad_creative_id}/previews
    path('<str:ad_creative_id>/previews/', views.get_ad_creative_previews, name='get_ad_creative_previews'),

    # POST /facebook_meta/{ad_creative_id} (Update)
    path('<str:ad_creative_id>/update/', views.AdCreativeUpdateView.as_view(), name='update_ad_creative'),

    # DELETE /facebook_meta/{ad_creative_id}
    path('<str:ad_creative_id>/delete/', views.AdCreativeDeleteView.as_view(), name='delete_ad_creative'),

    # GET /facebook_meta/{ad_creative_id}
    path('<str:ad_creative_id>/', views.get_ad_creative, name='get_ad_creative'),
]
