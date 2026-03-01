from django.urls import path
from . import views

urlpatterns = [
    path('sidebar-data/', views.get_doctor_sidebar_data, name='doctor-sidebar-data'),
    path('logout/', views.doctor_logout, name='doctor-logout'),
    path('overview/', views.doctor_overview, name='doctor-overview'),
    path('patient/<int:patient_id>/details/', views.get_patient_details, name='patient-details'),

    path('appointments/', views.get_doctor_appointments, name='doctor-appointments'),
    path('appointments/<int:appointment_id>/complete/', views.mark_appointment_complete, name='mark-appointment-complete'),
    path('appointments/<int:appointment_id>/cancel/', views.cancel_doctor_appointment, name='cancel-doctor-appointment'),

    path('prescriptions/', views.get_doctor_prescriptions, name='doctor-prescriptions'),
    path('prescriptions/create/', views.create_prescription, name='create-prescription'),

    path('patients/list/', views.get_doctor_patients_list, name='doctor-patients-list'),

    path('lab-reports/', views.get_doctor_lab_reports, name='doctor-lab-reports'),
    path('lab-reports/<int:report_id>/details/', views.get_doctor_lab_report_details, name='doctor_lab_report_details'),

    path('consultations/', views.get_doctor_consultations, name='doctor-consultations'),
    path('consultations/create/', views.create_consultation, name='create-consultation'),
    path('consultations/<int:consultation_id>/share/', views.share_consultation, name='share-consultation'),
    path('doctors/list/', views.get_doctors_list_for_share, name='doctors-list-for-share'),

    path('schedule/', views.get_doctor_schedule, name='schedule'),
    path('schedule/add-slot/', views.add_time_slot, name='add-slot'),
    path('schedule/delete-slot/<int:slot_id>/', views.delete_time_slot, name='delete-slot'),
    path('schedule/toggle-day/<str:day>/', views.toggle_day_availability, name='toggle-day'),
    
    path('profile/', views.get_doctor_profile, name='doctor-profile'),
    path('profile/update/', views.update_doctor_profile, name='update-doctor-profile'),
    path('profile/upload-photo/', views.upload_doctor_photo, name='upload-doctor-photo'),
]