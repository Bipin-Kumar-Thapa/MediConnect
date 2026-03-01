from django.urls import path
from . import views

urlpatterns = [
    path('sidebar/',views.get_staff_sidebar_data,name='staff_sidebar'),
    path('logout/', views.staff_logout,name='staff_logout'),

    path('overview/',views.get_staff_overview,name='staff_overview'),
    path('patients/',views.get_patients_for_staff,name='staff_patients'),

    path('attachments/<int:attachment_id>/delete/', views.delete_attachment, name='delete_attachment'),

    path('patients/<int:patient_id>/doctors/',views.get_doctors_for_patient, name='staff_patient_doctors'),
    path('lab-reports/upload/',views.upload_lab_report,name='staff_upload_report'),
    path('patients/search/', views.search_patients, name='search_patients'),
    
    path('lab-reports/',views.get_staff_lab_reports,name='staff_lab_reports'),
    path('lab-reports/<int:report_id>/edit/',views.edit_lab_report,name='staff_edit_report'),
]