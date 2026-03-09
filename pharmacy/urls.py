from django.urls import path
from . import views

urlpatterns = [
    path('sidebar/', views.get_pharmacy_sidebar_data, name='get_pharmacy_sidebar_data'),
    path('logout/', views.pharmacy_logout, name='pharmacy_logout'),

    path('overview/', views.get_pharmacy_overview, name='get_pharmacy_overview'),

    path('profile/data/', views.get_pharmacy_profile_data, name='get_pharmacy_profile_data'), 
    path('profile/update/', views.update_pharmacy_profile_data, name='update_pharmacy_profile_data'),

    path('prescriptions/', views.get_pharmacy_prescriptions, name='get_pharmacy_prescriptions'),
    path('prescriptions/<int:prescription_id>/', views.get_prescription_details, name='get_prescription_details'),
    path('prescriptions/<int:prescription_id>/fulfill/', views.fulfill_prescription, name='fulfill_prescription'),

    path('stock/', views.get_medicine_stock, name='get_medicine_stock'),
    path('stock/<int:medicine_id>/', views.get_medicine_details, name='get_medicine_details'),
    path('stock/create/', views.create_medicine, name='create_medicine'),
    path('stock/<int:medicine_id>/update/', views.update_medicine, name='update_medicine'),
    path('stock/<int:medicine_id>/delete/', views.delete_medicine, name='delete_medicine'),
]