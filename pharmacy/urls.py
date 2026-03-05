from django.urls import path
from . import views

urlpatterns = [
    path('sidebar/', views.get_pharmacy_sidebar_data, name='get_pharmacy_sidebar_data'),
    path('logout/', views.pharmacy_logout, name='pharmacy_logout'),
    path('overview/', views.get_pharmacy_overview, name='get_pharmacy_overview'),
]