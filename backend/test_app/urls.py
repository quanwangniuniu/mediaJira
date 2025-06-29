from django.urls import path
from . import views

app_name = 'test_app'

urlpatterns = [
    path('connection/', views.test_connection, name='test_connection'),
    path('data/', views.get_test_data, name='get_test_data'),
    path('data/create/', views.create_test_data, name='create_test_data'),
    path('data/clear/', views.clear_test_data, name='clear_test_data'),
] 