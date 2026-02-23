from django.urls import path
from .views import patient_overview
from . import views

urlpatterns = [
    path("overview/", patient_overview, name="patient-overview"),

    path('sidebar-data/', views.get_patient_sidebar_data, name='patient-sidebar-data'),
    path('logout/', views.patient_logout, name='patient-logout'),

    path('appointments/', views.get_appointments, name='get-appointments'),
    path('appointments/doctors/', views.get_available_doctors, name='get-available-doctors'),
    path('appointments/doctor-slots/<int:doctor_id>/', views.get_doctor_available_slots, name='doctor-slots'),
    path('appointments/book/', views.book_appointment, name='book-appointment'),
    path('appointments/<int:appointment_id>/cancel/', views.cancel_appointment, name='cancel-appointment'),
    path('appointments/<int:appointment_id>/reschedule-options/', views.get_reschedule_options, name='get-reschedule-options'),
    path('appointments/<int:appointment_id>/reschedule/', views.reschedule_appointment, name='reschedule-appointment'),
    path('appointments/<int:appointment_id>/transfer-options/', views.get_transfer_options, name='get-transfer-options'),
    path('appointments/<int:appointment_id>/transfer/', views.transfer_appointment, name='transfer-appointment'),
    path('appointments/transfer-doctor-slots/<int:doctor_id>/', views.get_transfer_doctor_slots, name='transfer-doctor-slots'),

    path('prescriptions/', views.get_prescriptions, name='get-prescriptions'),
    path('prescriptions/<int:prescription_id>/download/', views.download_prescription, name='download_prescription'),

    path('lab-reports/', views.get_lab_reports, name='get-lab-reports'),
    path('lab-reports/<int:report_id>/download/', views.download_lab_report, name='download_lab_report'),
    
    path('medicine-schedule/', views.get_medicine_schedule, name='get-medicine-schedule'),
    path('profile/', views.get_profile, name='get-profile'),
    path('profile/update/', views.update_profile, name='update-profile'),
    path('profile/upload-photo/', views.upload_profile_photo, name='upload-profile-photo'),
    path('consultation-history/', views.get_consultation_history, name='get-consultation-history'),
    path('doctors/', views.get_all_doctors, name='get-all-doctors'),
]
