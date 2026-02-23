from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.db.models import Q
from django.utils import timezone
from .models import PatientProfile
from doctors.models import DoctorProfile, Appointment, Prescription
import json
from datetime import timedelta

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io



def auto_mark_missed_appointments():
    """
    Automatically mark appointments as missed if they are 3+ hours past the scheduled time
    """
    from datetime import datetime
    
    now = timezone.now()
    three_hours_ago = now - timedelta(hours=3)
    
    pending_appointments = Appointment.objects.filter(
        status__in=['pending', 'confirmed']
    )
    
    for apt in pending_appointments:
        try:
            apt_datetime_naive = datetime.combine(apt.appointment_date, apt.appointment_time)
            apt_datetime = timezone.make_aware(apt_datetime_naive, timezone.get_current_timezone())
            
            if apt_datetime <= three_hours_ago:
                apt.status = 'missed'
                apt.save()
                
        except Exception as e:
            print(f"Error processing appointment {apt.id}: {e}")
            continue


@login_required
def patient_overview(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse(
            {"error": "Patient profile not found"},
            status=404
        )

    full_name = request.user.get_full_name()
    if not full_name:
        full_name = request.user.username

    now = timezone.now()
    today = now.date()
    current_time = now.time()

    total_appointments = Appointment.objects.filter(patient=profile).count()
    active_prescriptions = Prescription.objects.filter(
        patient=profile,
        status='active'
    ).count()

    from staff.models import LabReport
    lab_reports_count = LabReport.objects.filter(patient=profile).count()

    today_medicines = 0
    try:
        from pharmacy.models import MedicineSchedule
        today_medicines = MedicineSchedule.objects.filter(
            prescription__patient=profile,
            status='active'
        ).count()
    except:
        today_medicines = 0

    # Get ALL upcoming appointments (future appointments only)
    upcoming_appointments = Appointment.objects.filter(
        patient=profile,
        status__in=['pending', 'confirmed']
    ).exclude(
        appointment_date__lt=today
    ).exclude(
        appointment_date=today,
        appointment_time__lt=current_time
    ).select_related('doctor__user').order_by('appointment_date', 'appointment_time')

    upcoming_appointments_list = []
    for apt in upcoming_appointments:
        doctor_photo = None
        if hasattr(apt.doctor, 'profile_photo') and apt.doctor.profile_photo:
            doctor_photo = request.build_absolute_uri(apt.doctor.profile_photo.url)

        upcoming_appointments_list.append({
            'id': apt.id,
            'doctor': f"Dr. {apt.doctor.user.get_full_name() or apt.doctor.user.username}",
            'specialty': apt.doctor.get_specialty_display(),
            'avatar': apt.doctor.get_initials(),
            'doctorPhoto': doctor_photo,
            'date': apt.appointment_date.strftime('%b %d, %Y'),
            'time': apt.appointment_time.strftime('%I:%M %p'),
            'status': apt.status,
        })

    # Get 3 most recent active prescriptions
    recent_prescriptions = Prescription.objects.filter(
        patient=profile,
        status='active'
    ).select_related('doctor__user').prefetch_related('medicines').order_by('-prescribed_date')[:3]

    active_prescriptions_list = []
    for prescription in recent_prescriptions:
        first_medicine = prescription.medicines.first()
        if first_medicine:
            active_prescriptions_list.append({
                'id': prescription.id,
                'name': first_medicine.medicine_name,
                'dosage': first_medicine.dosage,
                'frequency': first_medicine.frequency,
                'duration': first_medicine.duration,
                'doctor': f"Dr. {prescription.doctor.user.get_full_name() or prescription.doctor.user.username}",
            })

    # Get 3 most recent lab reports
    recent_lab_reports = LabReport.objects.filter(
        patient=profile
    ).order_by('-test_date')[:3]

    recent_lab_reports_list = []
    for report in recent_lab_reports:
        recent_lab_reports_list.append({
            'id': report.id,
            'test_name': report.test_name,
            'date': report.test_date.strftime('%b %d, %Y'),
            'status': report.status,
            'category': report.category or 'General',
        })

    def get_time_ago(past_datetime):
        """Convert a past datetime to human readable 'X ago' string"""
        diff = now - past_datetime
        total_seconds = int(diff.total_seconds())

        if total_seconds < 60:
            return "Just now"
        elif total_seconds < 3600:
            minutes = total_seconds // 60
            return f"{minutes} min ago"
        elif total_seconds < 86400:
            hours = total_seconds // 3600
            return f"{hours} hr ago"
        else:
            days = total_seconds // 86400
            return f"{days} day ago" if days == 1 else f"{days} days ago"

    def get_time_until(future_datetime):
        """Convert a future datetime to human readable 'in X' string"""
        diff = future_datetime - now
        total_seconds = int(diff.total_seconds())

        if total_seconds < 60:
            return "Starting now"
        elif total_seconds < 3600:
            minutes = total_seconds // 60
            return f"in {minutes} min"
        elif total_seconds < 86400:
            hours = total_seconds // 3600
            return f"in {hours} hr"
        else:
            days = total_seconds // 86400
            return f"in {days} day" if days == 1 else f"in {days} days"

    # NOTIFICATIONS - Last 24 hours
    yesterday = now - timezone.timedelta(hours=24)
    notifications_list = []
    notif_id = 1

    # ─────────────────────────────────────────────
    # Notification 1: Upcoming appointment (next 48 hours)
    # ─────────────────────────────────────────────
    next_appointment = upcoming_appointments.first()
    if next_appointment:
        from datetime import datetime as dt
        apt_datetime_naive = dt.combine(
            next_appointment.appointment_date,
            next_appointment.appointment_time
        )
        apt_datetime = timezone.make_aware(apt_datetime_naive, timezone.get_current_timezone())
        time_until = apt_datetime - now

        # Only show if within next 48 hours
        if 0 < time_until.total_seconds() < 48 * 3600:
            hours_until = int(time_until.total_seconds() / 3600)
            priority = 'high' if hours_until < 3 else 'medium'

            notifications_list.append({
                'id': notif_id,
                'title': 'Upcoming Appointment',
                'message': f"Appointment with {next_appointment.doctor.user.get_full_name()} on {next_appointment.appointment_date.strftime('%b %d')} at {next_appointment.appointment_time.strftime('%I:%M %p')}",
                'priority': priority,
                'time': get_time_until(apt_datetime)
            })
            notif_id += 1

    # ─────────────────────────────────────────────
    # Notification 2: New lab results (last 24 hours)
    # ─────────────────────────────────────────────
    recent_labs = LabReport.objects.filter(
        patient=profile,
        created_at__gte=yesterday
    ).order_by('-created_at')[:3]  # Show up to 3 recent lab reports

    for lab in recent_labs:
        notifications_list.append({
            'id': notif_id,
            'title': '🧪 Lab Results Ready',
            'message': f"Your {lab.test_name} results are now available",
            'priority': 'high' if lab.status == 'critical' else 'medium',
            'time': get_time_ago(lab.created_at)
        })
        notif_id += 1

    # ─────────────────────────────────────────────
    # Notification 3: New prescription (last 24 hours)
    # ─────────────────────────────────────────────
    recent_prescriptions_notif = Prescription.objects.filter(
        patient=profile,
        created_at__gte=yesterday
    ).order_by('-created_at')[:2]  # Show up to 2 recent prescriptions

    for presc in recent_prescriptions_notif:
        notifications_list.append({
            'id': notif_id,
            'title': '💊 New Prescription',
            'message': f"Dr. {presc.doctor.user.get_full_name()} has issued a new prescription",
            'priority': 'medium',
            'time': get_time_ago(presc.created_at)
        })
        notif_id += 1

    # ─────────────────────────────────────────────
    # Notification 4: Missed appointment (last 24 hours only)
    # ─────────────────────────────────────────────
    cutoff_24h = now - timezone.timedelta(hours=24)
    recent_missed = Appointment.objects.filter(
        patient=profile,
        status='missed',
        appointment_date__gte=cutoff_24h.date(),
        appointment_date__lte=today,
    ).order_by('-appointment_date', '-appointment_time')[:2]

    for apt in recent_missed:
        from datetime import datetime as dt
        apt_datetime_naive = dt.combine(apt.appointment_date, apt.appointment_time)
        apt_datetime = timezone.make_aware(apt_datetime_naive, timezone.get_current_timezone())

        # Skip if more than 24 hours have passed since the appointment
        if (now - apt_datetime).total_seconds() > 86400:
            continue

        notifications_list.append({
            'id': notif_id,
            'title': '❌ Missed Appointment',
            'message': f"You missed your appointment with Dr. {apt.doctor.user.get_full_name()} at {apt.appointment_time.strftime('%I:%M %p')}",
            'priority': 'high',
            'time': get_time_ago(apt_datetime)
        })
        notif_id += 1

    # ─────────────────────────────────────────────
    # Notification 5: Low medicine stock
    # ─────────────────────────────────────────────
    try:
        from pharmacy.models import MedicineSchedule
        low_stock_medicines = MedicineSchedule.objects.filter(
            prescription__patient=profile,
            status='active'
        ).select_related('prescribed_medicine')

        for med in low_stock_medicines:
            stock_pct = med.stock_percentage
            if stock_pct <= 15 and stock_pct > 0:
                notifications_list.append({
                    'id': notif_id,
                    'title': '⚠️ Low Medicine Stock',
                    'message': f"{med.prescribed_medicine.medicine_name} is running low ({med.remaining_quantity} left)",
                    'priority': 'medium',
                    'time': 'Now'
                })
                notif_id += 1
            elif stock_pct == 0:
                notifications_list.append({
                    'id': notif_id,
                    'title': '🚨 Medicine Out of Stock',
                    'message': f"{med.prescribed_medicine.medicine_name} is out of stock. Please refill.",
                    'priority': 'high',
                    'time': 'Now'
                })
                notif_id += 1
    except:
        pass

    # ─────────────────────────────────────────────
    # Notification 6: New consultation history (last 24 hours)
    # ─────────────────────────────────────────────
    try:
        from doctors.models import ConsultationHistory
        recent_consultations = ConsultationHistory.objects.filter(
            patient=profile,
            created_at__gte=yesterday
        ).order_by('-created_at')[:2]

        for consult in recent_consultations:
            notifications_list.append({
                'id': notif_id,
                'title': '🩺 Consultation Complete',
                'message': f"Dr. {consult.doctor.user.get_full_name()} has recorded your consultation",
                'priority': 'medium',
                'time': get_time_ago(consult.created_at)
            })
            notif_id += 1
    except:
        pass

    # ─────────────────────────────────────────────
    # Sort: high priority first, then by most recent
    # ─────────────────────────────────────────────
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    notifications_list.sort(key=lambda x: priority_order.get(x['priority'], 2))

    # Limit to 8 notifications max
    notifications_list = notifications_list[:8]

    data = {
        "name": full_name,
        "patient_id": profile.patient_id,
        "age": profile.age,
        "gender": profile.get_gender_display_short(),
        "blood_group": profile.blood_group,
        "status": "Active" if profile.is_active else "Inactive",

        "total_appointments": total_appointments,
        "active_prescriptions": active_prescriptions,
        "today_medicines": today_medicines,
        "lab_reports": lab_reports_count,

        "upcoming_appointments_list": upcoming_appointments_list,
        "active_prescriptions_list": active_prescriptions_list,
        "recent_lab_reports": recent_lab_reports_list,
        "notifications": notifications_list,

        "medicine_schedule": {
            "morning": {"count": 0, "status": "Upcoming"},
            "afternoon": {"count": 0, "status": "Upcoming"},
            "night": {"count": 0, "status": "Upcoming"},
        },
    }

    return JsonResponse(data)


@login_required
def get_patient_sidebar_data(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    first_name = request.user.first_name or ""
    last_name = request.user.last_name or ""
    
    if first_name and last_name:
        initials = f"{first_name[0]}{last_name[0]}".upper()
    elif first_name:
        initials = first_name[0].upper()
    elif request.user.username:
        initials = request.user.username[0].upper()
    else:
        initials = "P"
    
    full_name = request.user.get_full_name()
    if not full_name:
        full_name = request.user.username
    
    profile_photo = None
    if profile.profile_photo:
        profile_photo = request.build_absolute_uri(profile.profile_photo.url)
    
    return JsonResponse({
        "name": full_name,
        "patient_id": profile.patient_id,
        "initials": initials,
        "profile_photo": profile_photo,
    })


@login_required
def get_appointments(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    auto_mark_missed_appointments()
    
    status_filter = request.GET.get('status', 'all')
    search_query = request.GET.get('search', '').strip()
    
    appointments = Appointment.objects.filter(patient=profile).select_related('doctor__user')
    
    if status_filter != 'all':
        appointments = appointments.filter(status=status_filter)
    
    if search_query:
        appointments = appointments.filter(
            Q(doctor__user__first_name__icontains=search_query) |
            Q(doctor__user__last_name__icontains=search_query) |
            Q(doctor__specialization__icontains=search_query)
        )
    
    appointments_list = []
    for apt in appointments:
        doctor_photo = None
        if hasattr(apt.doctor, 'profile_photo') and apt.doctor.profile_photo:
            doctor_photo = request.build_absolute_uri(apt.doctor.profile_photo.url)

        appointments_list.append({
            'id': apt.id,
            'doctor': f"Dr. {apt.doctor.user.get_full_name() or apt.doctor.user.username}",
            'specialty': apt.doctor.get_specialty_display(),
            'date': apt.appointment_date.isoformat(),
            'time': apt.appointment_time.strftime('%I:%M %p'),
            'status': apt.status,
            'type': apt.get_appointment_type_display(),
            'location': apt.doctor.room_location or 'Visit Reception at Ground Floor',
            'notes': apt.notes or '',
            'reason': apt.reason,
            'doctorPhoto': doctor_photo,
        })
    
    today = timezone.now().date()
    stats = {
        'total': Appointment.objects.filter(patient=profile).count(),
        'upcoming': Appointment.objects.filter(
            patient=profile, appointment_date__gte=today, status__in=['pending', 'confirmed']
        ).count(),
        'completed': Appointment.objects.filter(patient=profile, status='completed').count(),
        'cancelled': Appointment.objects.filter(patient=profile, status='cancelled').count(),
        'missed': Appointment.objects.filter(patient=profile, status='missed').count(),
        'needs_rescheduling': Appointment.objects.filter(patient=profile, status='needs_rescheduling').count(),
    }
    
    return JsonResponse({'appointments': appointments_list, 'stats': stats})


@login_required
def get_available_doctors(request):
    doctors = DoctorProfile.objects.filter(is_available=True, is_active=True).select_related('user')
    
    doctors_list = []
    for doctor in doctors:
        doctors_list.append({
            'id': doctor.id,
            'name': f"Dr. {doctor.user.get_full_name()}",
            'specialty': doctor.get_specialty_display(),
            'specialty_code': doctor.specialization,
            'experience': doctor.experience_years,
        })
    
    return JsonResponse({'doctors': doctors_list})


@login_required
@csrf_protect
@require_http_methods(["POST"])
def book_appointment(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        data = json.loads(request.body)
        
        doctor_id = data.get('doctor_id')
        appointment_date = data.get('appointment_date')
        appointment_time = data.get('appointment_time')
        appointment_type = data.get('appointment_type')
        reason = data.get('reason')
        
        if not all([doctor_id, appointment_date, appointment_time, appointment_type, reason]):
            return JsonResponse({"error": "All fields are required"}, status=400)
        
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id, is_available=True)
        except DoctorProfile.DoesNotExist:
            return JsonResponse({"error": "Doctor not found or not available"}, status=404)
        
        appointment = Appointment.objects.create(
            patient=profile,
            doctor=doctor,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            appointment_type=appointment_type,
            reason=reason,
            status='pending'
        )
        
        doctor_location = doctor.room_location or 'Room 203, 2nd Floor'
        
        return JsonResponse({
            "success": True,
            "message": "Appointment booked successfully",
            "appointment_id": appointment.id,
            "patient_name": profile.user.get_full_name() or profile.user.username,
            "patient_id": profile.patient_id,
            "doctor_location": doctor_location
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def get_doctor_available_slots(request, doctor_id):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        doctor = DoctorProfile.objects.get(id=doctor_id, is_available=True, is_active=True)
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor not found or not available"}, status=404)
    
    from doctors.models import DoctorSchedule
    from datetime import datetime, date
    
    now = timezone.now()
    today = now.date()

    selected_date_str = request.GET.get('date')

    # ─────────────────────────────────────────────
    # If date is selected → return times for that date
    # ─────────────────────────────────────────────
    if selected_date_str:
        try:
            selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
        except:
            return JsonResponse({"error": "Invalid date format"}, status=400)

        # ✅ Check if doctor has schedule for this day
        day_map = {
            0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday',
            4: 'friday', 5: 'saturday', 6: 'sunday'
        }
        day_name = day_map[selected_date.weekday()]

        has_schedule = DoctorSchedule.objects.filter(
            doctor=doctor,
            day_of_week=day_name,
            is_active=True,
            slot_type='consultation'
        ).exists()

        # ✅ If no schedule → return off_day = True
        if not has_schedule:
            return JsonResponse({
                'date': selected_date.isoformat(),
                'off_day': True,
                'available_times': []
            })

        # ✅ Has schedule → return available time slots in 12hr format
        available_times = get_available_time_slots(doctor, selected_date)

        return JsonResponse({
            'date': selected_date.isoformat(),
            'off_day': False,
            'available_times': available_times
        })

    # ─────────────────────────────────────────────
    # No date selected → return next 3 days from TOMORROW
    # ─────────────────────────────────────────────
    day_map = {
        0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday',
        4: 'friday', 5: 'saturday', 6: 'sunday'
    }

    # Get all working days for this doctor
    doctor_schedules = DoctorSchedule.objects.filter(doctor=doctor, is_active=True)
    working_days = set()
    for schedule in doctor_schedules:
        working_days.add(schedule.day_of_week)

    available_dates = []

    # ✅ Start from TOMORROW (i=1), show 3 days
    for i in range(1, 4):
        check_date = today + timezone.timedelta(days=i)
        day_name = day_map[check_date.weekday()]

        if day_name in working_days:
            # Doctor has schedule → available
            available_dates.append({
                'date': check_date.isoformat(),
                'day': check_date.strftime('%A'),
                'formatted': check_date.strftime('%b %d, %Y'),
                'is_off': False
            })
        else:
            # Doctor has no schedule → off day (still show but marked)
            available_dates.append({
                'date': check_date.isoformat(),
                'day': check_date.strftime('%A'),
                'formatted': check_date.strftime('%b %d, %Y'),
                'is_off': True
            })

    return JsonResponse({
        'doctor_id': doctor.id,
        'doctor_name': f"Dr. {doctor.user.get_full_name()}",
        'available_dates': available_dates
    })


def get_available_time_slots(doctor, check_date):
    """
    Helper function to get available 15-minute time slots for a specific date.
    Returns times in 12-hour format (e.g. 1:00 PM, 4:30 AM)
    No today booking allowed - always future dates only.
    """
    from doctors.models import DoctorSchedule
    from datetime import datetime, timedelta as dt_timedelta

    day_map = {
        0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday',
        4: 'friday', 5: 'saturday', 6: 'sunday'
    }

    day_name = day_map[check_date.weekday()]

    schedules = DoctorSchedule.objects.filter(
        doctor=doctor,
        day_of_week=day_name,
        is_active=True,
        slot_type='consultation'
    )

    if not schedules.exists():
        return []

    # Get all booked times for this date
    booked_times = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=check_date,
        status__in=['pending', 'confirmed']
    ).values_list('appointment_time', flat=True)

    booked_times_set = set(booked_times)
    available_slots = []

    for schedule in schedules:
        current_slot = datetime.combine(check_date, schedule.start_time)
        end_slot = datetime.combine(check_date, schedule.end_time)

        while current_slot < end_slot:
            slot_time = current_slot.time()

            # Skip already booked slots
            if slot_time not in booked_times_set:
                hour = int(slot_time.strftime('%I'))
                minute = slot_time.strftime('%M')
                ampm = slot_time.strftime('%p')
                available_slots.append(f"{hour}:{minute} {ampm}")

            current_slot += dt_timedelta(minutes=15)

    return available_slots


@login_required
@csrf_protect
@require_http_methods(["POST"])
def cancel_appointment(request, appointment_id):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        appointment = Appointment.objects.get(id=appointment_id, patient=profile)
        
        if appointment.status in ['completed', 'cancelled']:
            return JsonResponse({"error": "Cannot cancel this appointment"}, status=400)
        
        appointment.status = 'cancelled'
        appointment.save()
        
        return JsonResponse({"success": True, "message": "Appointment cancelled successfully"})
        
    except Appointment.DoesNotExist:
        return JsonResponse({"error": "Appointment not found"}, status=404)


def auto_expire_prescriptions(patient_profile):
    """Auto expire prescriptions past valid_until date"""
    today = timezone.now().date()
    Prescription.objects.filter(
        patient=patient_profile,
        status='active',
        valid_until__lt=today
    ).update(status='expired')


@login_required
def get_prescriptions(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)

    from datetime import timedelta
    
    # Auto-expire old prescriptions
    auto_expire_prescriptions(profile)

    status_filter = request.GET.get('status', 'all')
    search_query = request.GET.get('search', '').strip()
    time_period = request.GET.get('time_period', 'all')  # ✅ NEW
    page = int(request.GET.get('page', 1))
    per_page = 10

    prescriptions = Prescription.objects.filter(
        patient=profile
    ).select_related('doctor__user').prefetch_related('medicines')

    # ✅ NEW: Time Period Filter
    if time_period != 'all':
        today = timezone.now().date()
        
        if time_period == 'last_month':
            start_date = today - timedelta(days=30)
            prescriptions = prescriptions.filter(prescribed_date__gte=start_date)
        
        elif time_period == 'last_3_months':
            start_date = today - timedelta(days=90)
            prescriptions = prescriptions.filter(prescribed_date__gte=start_date)
        
        elif time_period == 'last_6_months':
            start_date = today - timedelta(days=180)
            prescriptions = prescriptions.filter(prescribed_date__gte=start_date)
        
        elif time_period == 'last_year':
            start_date = today - timedelta(days=365)
            prescriptions = prescriptions.filter(prescribed_date__gte=start_date)
        
        elif time_period.isdigit():  # Year filter (e.g., "2024", "2025")
            year = int(time_period)
            prescriptions = prescriptions.filter(prescribed_date__year=year)

    # Status filter
    if status_filter != 'all':
        prescriptions = prescriptions.filter(status=status_filter)

    # Search filter
    if search_query:
        prescriptions = prescriptions.filter(
            Q(prescription_number__icontains=search_query) |
            Q(doctor__user__first_name__icontains=search_query) |
            Q(doctor__user__last_name__icontains=search_query) |
            Q(medicines__medicine_name__icontains=search_query)
        ).distinct()

    # Order by date (newest first)
    prescriptions = prescriptions.order_by('-prescribed_date')

    # ✅ Pagination
    total_count = prescriptions.count()
    total_pages = max(1, (total_count + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_prescriptions = prescriptions[start_idx:end_idx]

    # Build prescriptions list
    prescriptions_list = []
    for prescription in paginated_prescriptions:
        medicines_data = []
        for medicine in prescription.medicines.all():
            medicines_data.append({
                'name': medicine.medicine_name,
                'dosage': medicine.dosage,
                'frequency': medicine.frequency,
                'duration': medicine.duration,
                'instructions': medicine.instructions
            })

        prescriptions_list.append({
            'id': prescription.id,
            'prescriptionNumber': prescription.prescription_number,
            'doctor': f"Dr. {prescription.doctor.user.get_full_name()}",
            'specialty': prescription.doctor.get_specialty_display(),
            'date': prescription.prescribed_date.isoformat(),
            'status': prescription.status,
            'validUntil': prescription.valid_until.isoformat(),
            'medicines': medicines_data,
            'diagnosis': prescription.diagnosis,
            'notes': prescription.notes or ''
        })

    # Stats (always from full dataset, not filtered)
    all_prescriptions = Prescription.objects.filter(patient=profile)
    stats = {
        'total':   all_prescriptions.count(),
        'active':  all_prescriptions.filter(status='active').count(),
        'expired': all_prescriptions.filter(status='expired').count(),
    }

    # ✅ Get available years for filter dropdown
    years = all_prescriptions.dates('prescribed_date', 'year', order='DESC')
    available_years = [year.year for year in years]

    return JsonResponse({
        'prescriptions': prescriptions_list,
        'stats': stats,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_count': total_count,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        },
        'available_years': available_years,  # ✅ NEW
    })


@login_required
def download_prescription(request, prescription_id):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)

    try:
        prescription = Prescription.objects.get(
            id=prescription_id,
            patient=profile
        )
    except Prescription.DoesNotExist:
        return JsonResponse({"error": "Prescription not found"}, status=404)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )

    styles = getSampleStyleSheet()
    story = []

    # Styles
    title_style = ParagraphStyle(
        'Title', parent=styles['Normal'],
        fontSize=22, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1D4ED8'),
        alignment=TA_CENTER, spaceAfter=8,
    )
    section_style = ParagraphStyle(
        'Section', parent=styles['Normal'],
        fontSize=11, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1F2937'),
        spaceBefore=8, spaceAfter=4
    )
    normal_style = ParagraphStyle(
        'Normal2', parent=styles['Normal'],
        fontSize=10, textColor=colors.HexColor('#374151'),
        spaceAfter=3
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#6B7280'),
    )

    # Header
    story.append(Paragraph("MediConnect", title_style))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3B82F6')))
    story.append(Spacer(1, 5*mm))

    # Prescription Number & Status
    rx_data = [
        [
            Paragraph(f"<b>Prescription No:</b> {prescription.prescription_number}", normal_style),
            Paragraph(f"<b>Status:</b> {prescription.status.upper()}", normal_style),
            Paragraph(f"<b>Date:</b> {prescription.prescribed_date.strftime('%b %d, %Y')}", normal_style),
        ]
    ]
    rx_table = Table(rx_data, colWidths=[60*mm, 50*mm, 60*mm])
    rx_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
        ('ROUNDEDCORNERS', [5]),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(rx_table)
    story.append(Spacer(1, 5*mm))

    # Patient & Doctor Info
    patient_name = profile.user.get_full_name() or profile.user.username
    doctor_name = f"Dr. {prescription.doctor.user.get_full_name()}"
    specialty = prescription.doctor.get_specialty_display()

    info_data = [
        [
            Paragraph("<b>PATIENT INFORMATION</b>", label_style),
            Paragraph("<b>PRESCRIBED BY</b>", label_style),
        ],
        [
            Paragraph(f"<b>{patient_name}</b>", normal_style),
            Paragraph(f"<b>{doctor_name}</b>", normal_style),
        ],
        [
            Paragraph(f"ID: {profile.patient_id}", normal_style),
            Paragraph(f"{specialty}", normal_style),
        ],
        [
            Paragraph(f"Valid Until: {prescription.valid_until.strftime('%b %d, %Y')}", normal_style),
            Paragraph(f"MediConnect Hospital", normal_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[85*mm, 85*mm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('LINEAFTER', (0,0), (0,-1), 1, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 5*mm))

    # Diagnosis 
    if prescription.diagnosis:
        story.append(Paragraph("DIAGNOSIS", label_style))
        diag_data = [[Paragraph(prescription.diagnosis, normal_style)]]
        diag_table = Table(diag_data, colWidths=[170*mm])
        diag_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(diag_table)
        story.append(Spacer(1, 5*mm))

    # Medicines 
    story.append(Paragraph("PRESCRIBED MEDICINES", label_style))
    story.append(Spacer(1, 2*mm))

    med_header = [
        Paragraph('<b>Medicine</b>', normal_style),
        Paragraph('<b>Dosage</b>', normal_style),
        Paragraph('<b>Frequency</b>', normal_style),
        Paragraph('<b>Duration</b>', normal_style),
    ]
    med_rows = [med_header]

    for i, med in enumerate(prescription.medicines.all()):
        row_bg = colors.HexColor('#F9FAFB') if i % 2 == 0 else colors.white
        med_rows.append([
            Paragraph(med.medicine_name, normal_style),
            Paragraph(med.dosage, normal_style),
            Paragraph(med.frequency, normal_style),
            Paragraph(med.duration, normal_style),
        ])

    med_table = Table(med_rows, colWidths=[55*mm, 35*mm, 45*mm, 35*mm])
    med_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3B82F6')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F9FAFB'), colors.white]),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(med_table)
    story.append(Spacer(1, 5*mm))

    # Instructions 
    has_instructions = any(
        med.instructions for med in prescription.medicines.all()
    )
    if has_instructions:
        story.append(Paragraph("INSTRUCTIONS", label_style))
        for med in prescription.medicines.all():
            if med.instructions:
                story.append(Paragraph(
                    f"<b>{med.medicine_name}:</b> {med.instructions}",
                    normal_style
                ))
        story.append(Spacer(1, 4*mm))

    # Notes
    if prescription.notes:
        story.append(Paragraph("ADDITIONAL NOTES", label_style))
        notes_data = [[Paragraph(prescription.notes, normal_style)]]
        notes_table = Table(notes_data, colWidths=[170*mm])
        notes_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFBEB')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FCD34D')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(notes_table)
        story.append(Spacer(1, 5*mm))

    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E5E7EB')))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        "This prescription was generated by MediConnect. For queries, contact your doctor.",
        ParagraphStyle('Footer', parent=styles['Normal'],
            fontSize=8, textColor=colors.HexColor('#9CA3AF'), alignment=TA_CENTER)
    ))

    # Build PDF 
    doc.build(story)
    buffer.seek(0)

    from django.http import HttpResponse
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="prescription_{prescription.prescription_number}.pdf"'
    )
    return response


@login_required
@csrf_protect
@require_http_methods(["POST"])
def patient_logout(request):
    try:
        logout(request)
        return JsonResponse({"message": "Logged out successfully", "success": True})
    except Exception as e:
        return JsonResponse({"error": str(e), "success": False}, status=500)


@login_required
def get_lab_reports(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    from staff.models import LabReport, LabReportParameter
    from datetime import datetime, timedelta
    
    status_filter = request.GET.get('status', 'all')
    search_query = request.GET.get('search', '').strip()
    time_period = request.GET.get('time_period', 'all')  # ✅ NEW
    page = int(request.GET.get('page', 1))
    per_page = 10
    
    lab_reports = LabReport.objects.filter(patient=profile).select_related(
        'uploaded_by__user', 'doctor__user'
    ).prefetch_related('parameters')
    
    # ✅ NEW: Time Period Filter
    if time_period != 'all':
        today = timezone.now().date()
        
        if time_period == 'last_month':
            start_date = today - timedelta(days=30)
            lab_reports = lab_reports.filter(test_date__gte=start_date)
        
        elif time_period == 'last_3_months':
            start_date = today - timedelta(days=90)
            lab_reports = lab_reports.filter(test_date__gte=start_date)
        
        elif time_period == 'last_6_months':
            start_date = today - timedelta(days=180)
            lab_reports = lab_reports.filter(test_date__gte=start_date)
        
        elif time_period == 'last_year':
            start_date = today - timedelta(days=365)
            lab_reports = lab_reports.filter(test_date__gte=start_date)
        
        elif time_period.isdigit():  # Year filter (e.g., "2024", "2025")
            year = int(time_period)
            lab_reports = lab_reports.filter(test_date__year=year)
    
    # Filter by status OR completion
    if status_filter == 'pending':
        lab_reports = lab_reports.filter(is_completed=False)
    elif status_filter in ['normal', 'abnormal', 'critical']:
        lab_reports = lab_reports.filter(status=status_filter, is_completed=True)
    elif status_filter != 'all':
        lab_reports = lab_reports.filter(status=status_filter)
    
    # Search filter
    if search_query:
        lab_reports = lab_reports.filter(
            Q(report_number__icontains=search_query) |
            Q(test_name__icontains=search_query) |
            Q(category__icontains=search_query)
        )
    
    # Order by test date (newest first)
    lab_reports = lab_reports.order_by('-test_date', '-created_at')
    
    # ✅ Pagination
    total_count = lab_reports.count()
    total_pages = max(1, (total_count + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_reports = lab_reports[start_idx:end_idx]
    
    # Build reports list
    reports_list = []
    for report in paginated_reports:
        uploaded_by = "Lab Staff"
        if report.uploaded_by:
            uploaded_by = f"Lab Tech - {report.uploaded_by.user.get_full_name()}"
        
        # Get parameters
        parameters = []
        for param in report.parameters.all():
            parameters.append({
                'name': param.name,
                'value': param.value,
                'unit': param.unit,
                'normalRange': param.normal_range,
                'status': param.status
            })
        
        # Get uploaded files
        uploaded_files = []
        
        # Add PDF file if exists
        if report.report_file:
            uploaded_files.append({
                'type': 'pdf',
                'name': report.report_file.name.split('/')[-1],
                'url': request.build_absolute_uri(report.report_file.url)
            })
        
        # Add image if exists
        if report.report_image:
            uploaded_files.append({
                'type': 'image',
                'name': report.report_image.name.split('/')[-1],
                'url': request.build_absolute_uri(report.report_image.url)
            })
        
        # Determine actual status to show
        if not report.is_completed:
            display_status = 'pending'
        else:
            display_status = report.status
        
        reports_list.append({
            'id': report.id,
            'reportNumber': report.report_number,
            'testName': report.test_name,
            'category': report.category or 'General',
            'date': report.test_date.isoformat(),
            'uploadedBy': uploaded_by,
            'uploadedDate': report.created_at.date().isoformat(),
            'status': display_status,
            'isCompleted': report.is_completed,
            'findings': report.findings or '',
            'notes': report.notes or '',
            'hasFile': bool(report.report_file) or bool(report.report_image),
            'parameters': parameters,
            'uploadedFiles': uploaded_files,
        })
    
    # Stats (always from full dataset, not filtered)
    all_reports = LabReport.objects.filter(patient=profile)
    stats = {
        'total': all_reports.count(),
        'normal': all_reports.filter(status='normal', is_completed=True).count(),
        'abnormal': all_reports.filter(status='abnormal', is_completed=True).count(),
        'critical': all_reports.filter(status='critical', is_completed=True).count(),
        'pending': all_reports.filter(is_completed=False).count(),
    }
    
    # ✅ Get available years for filter dropdown
    years = all_reports.dates('test_date', 'year', order='DESC')
    available_years = [year.year for year in years]
    
    return JsonResponse({
        'reports': reports_list,
        'stats': stats,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_count': total_count,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        },
        'available_years': available_years,  # ✅ NEW
    })



@login_required
def download_lab_report(request, report_id):
    """
    Download complete lab report as PDF with:
    - Report details
    - Parameters table
    - Images (one per page with caption)
    - Merged uploaded PDF (if exists)
    """
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        from staff.models import LabReport
        report = LabReport.objects.get(id=report_id, patient=profile)
    except LabReport.DoesNotExist:
        return JsonResponse({"error": "Lab report not found"}, status=404)
    
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
        HRFlowable, Image, PageBreak
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from PyPDF2 import PdfMerger
    import io
    import os
    from django.conf import settings
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    styles = getSampleStyleSheet()
    story = []
    
    # ═══════════════════════════════════════════
    # Custom Styles
    # ═══════════════════════════════════════════
    title_style = ParagraphStyle(
        'Title', parent=styles['Normal'],
        fontSize=24, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#8B5CF6'),
        alignment=TA_CENTER, spaceAfter=8,
    )
    section_style = ParagraphStyle(
        'Section', parent=styles['Normal'],
        fontSize=12, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1F2937'),
        spaceBefore=10, spaceAfter=6
    )
    normal_style = ParagraphStyle(
        'Normal2', parent=styles['Normal'],
        fontSize=10, textColor=colors.HexColor('#374151'),
        spaceAfter=3
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#6B7280'),
        fontName='Helvetica-Bold'
    )
    
    # ═══════════════════════════════════════════
    # Page 1: Header & Report Details
    # ═══════════════════════════════════════════
    story.append(Paragraph("LAB REPORT", title_style))
    story.append(Paragraph("MediConnect Hospital", 
        ParagraphStyle('Subtitle', parent=styles['Normal'],
            fontSize=11, textColor=colors.HexColor('#6B7280'),
            alignment=TA_CENTER, spaceAfter=10)
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#8B5CF6')))
    story.append(Spacer(1, 5*mm))
    
    # Report Number & Status
    status_color = {
        'normal': '#10B981',
        'abnormal': '#F59E0B',
        'critical': '#EF4444',
        'pending': '#6366F1'
    }.get(report.status if report.is_completed else 'pending', '#6B7280')
    
    status_text = report.status.upper() if report.is_completed else 'PENDING'
    
    info_data = [
        [
            Paragraph(f"<b>Report No:</b> {report.report_number}", normal_style),
            Paragraph(f"<b>Status:</b> <font color='{status_color}'>{status_text}</font>", normal_style),
        ]
    ]
    info_table = Table(info_data, colWidths=[85*mm, 85*mm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 5*mm))
    
    # Patient & Test Info
    patient_name = profile.user.get_full_name() or profile.user.username
    
    details_data = [
        [Paragraph("<b>PATIENT INFORMATION</b>", label_style),
         Paragraph("<b>TEST INFORMATION</b>", label_style)],
        [Paragraph(f"<b>{patient_name}</b>", normal_style),
         Paragraph(f"<b>{report.test_name}</b>", normal_style)],
        [Paragraph(f"ID: {profile.patient_id}", normal_style),
         Paragraph(f"Category: {report.get_category_display_name()}", normal_style)],
        [Paragraph(f"Age: {profile.age or 'N/A'} | Gender: {profile.get_gender_display_short() or 'N/A'}", normal_style),
         Paragraph(f"Test Date: {report.test_date.strftime('%b %d, %Y')}", normal_style)],
    ]
    
    if report.uploaded_by:
        details_data.append([
            Paragraph("", normal_style),
            Paragraph(f"Uploaded by: {report.uploaded_by.user.get_full_name()}", normal_style)
        ])
    
    details_table = Table(details_data, colWidths=[85*mm, 85*mm])
    details_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('LINEAFTER', (0,0), (0,-1), 1, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 5*mm))
    
    # ═══════════════════════════════════════════
    # Parameters Table (if exists)
    # ═══════════════════════════════════════════
    if report.parameters.exists():
        story.append(Paragraph("TEST PARAMETERS", section_style))
        story.append(Spacer(1, 2*mm))
        
        param_header = [
            Paragraph('<b>Parameter</b>', normal_style),
            Paragraph('<b>Value</b>', normal_style),
            Paragraph('<b>Normal Range</b>', normal_style),
            Paragraph('<b>Status</b>', normal_style),
        ]
        param_rows = [param_header]
        
        for param in report.parameters.all():
            status_badge_color = {
                'Normal': '#10B981',
                'High': '#EF4444',
                'Low': '#3B82F6'
            }.get(param.status, '#6B7280')
            
            param_rows.append([
                Paragraph(param.name, normal_style),
                Paragraph(f"{param.value} {param.unit}", normal_style),
                Paragraph(param.normal_range, normal_style),
                Paragraph(f"<font color='{status_badge_color}'><b>{param.status}</b></font>", normal_style),
            ])
        
        param_table = Table(param_rows, colWidths=[50*mm, 35*mm, 50*mm, 35*mm])
        param_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#8B5CF6')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F9FAFB'), colors.white]),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(param_table)
        story.append(Spacer(1, 5*mm))
    
    # Findings
    if report.findings:
        story.append(Paragraph("FINDINGS", section_style))
        findings_data = [[Paragraph(report.findings, normal_style)]]
        findings_table = Table(findings_data, colWidths=[170*mm])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0F9FF')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#3B82F6')),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(findings_table)
        story.append(Spacer(1, 5*mm))
    
    # Notes
    if report.notes:
        story.append(Paragraph("NOTES & RECOMMENDATIONS", section_style))
        note_color = '#FEF2F2' if report.status == 'critical' else '#FFFBEB'
        border_color = '#DC2626' if report.status == 'critical' else '#F59E0B'
        
        notes_data = [[Paragraph(report.notes, normal_style)]]
        notes_table = Table(notes_data, colWidths=[170*mm])
        notes_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(note_color)),
            ('BOX', (0,0), (-1,-1), 2, colors.HexColor(border_color)),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(notes_table)
        story.append(Spacer(1, 5*mm))
    
    # ═══════════════════════════════════════════
    # Images (One per page with caption)
    # ═══════════════════════════════════════════
    if report.report_image:
        story.append(PageBreak())  # New page for image
        story.append(Paragraph("ATTACHED IMAGE", section_style))
        story.append(Spacer(1, 3*mm))
        
        try:
            img_path = report.report_image.path
            img = Image(img_path, width=160*mm, height=200*mm, kind='proportional')
            story.append(img)
            story.append(Spacer(1, 3*mm))
            
            caption = Paragraph(
                f"<i>Image: {os.path.basename(report.report_image.name)}<br/>"
                f"Uploaded: {report.created_at.strftime('%b %d, %Y')}</i>",
                ParagraphStyle('Caption', parent=styles['Normal'],
                    fontSize=9, textColor=colors.HexColor('#6B7280'),
                    alignment=TA_CENTER)
            )
            story.append(caption)
        except Exception as e:
            story.append(Paragraph(f"<i>Error loading image: {str(e)}</i>", normal_style))
    
    # Build the main PDF
    doc.build(story)
    
    # ═══════════════════════════════════════════
    # Merge uploaded PDF if exists
    # ═══════════════════════════════════════════
    if report.report_file and report.report_file.name.lower().endswith('.pdf'):
        try:
            merger = PdfMerger()
            
            # Add our generated PDF
            buffer.seek(0)
            merger.append(buffer)
            
            # Add uploaded PDF
            merger.append(report.report_file.path)
            
            # Write merged PDF to new buffer
            final_buffer = io.BytesIO()
            merger.write(final_buffer)
            merger.close()
            final_buffer.seek(0)
            
            buffer = final_buffer
        except Exception as e:
            # If merge fails, just use the generated PDF
            buffer.seek(0)
    else:
        buffer.seek(0)
    
    # ═══════════════════════════════════════════
    # Return PDF
    # ═══════════════════════════════════════════
    from django.http import HttpResponse
    
    patient_name_safe = patient_name.replace(' ', '_')
    filename = f"LabReport_{report.report_number}_{patient_name_safe}_{report.test_date.strftime('%Y%m%d')}.pdf"
    
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@login_required
def get_medicine_schedule(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    from pharmacy.models import MedicineSchedule
    
    schedules = MedicineSchedule.objects.filter(
        prescription__patient=profile, status='active'
    ).select_related('prescribed_medicine', 'prescription__doctor__user', 'medicine')
    
    medicines_list = []
    for schedule in schedules:
        stock_percentage = schedule.stock_percentage
        if stock_percentage == 0:
            stock_status = 'out-of-stock'
        elif stock_percentage < 15:
            stock_status = 'low-stock'
        elif stock_percentage < 50:
            stock_status = 'medium-stock'
        else:
            stock_status = 'good-stock'
        
        medicines_list.append({
            'id': schedule.id,
            'name': schedule.prescribed_medicine.medicine_name,
            'dosage': schedule.prescribed_medicine.dosage,
            'type': schedule.medicine.get_unit_type_display() if schedule.medicine else 'Tablet',
            'frequency': schedule.prescribed_medicine.frequency,
            'timing': {
                'morning': schedule.morning,
                'afternoon': schedule.afternoon,
                'night': schedule.night,
            },
            'duration': schedule.prescribed_medicine.duration,
            'startDate': schedule.start_date.isoformat(),
            'endDate': schedule.end_date.isoformat(),
            'instructions': schedule.prescribed_medicine.instructions,
            'stockRemaining': schedule.remaining_quantity,
            'totalStock': schedule.total_quantity,
            'stockStatus': stock_status,
            'prescribedBy': f"Dr. {schedule.prescription.doctor.user.get_full_name()}",
            'purpose': schedule.purpose or 'As prescribed',
            'sideEffects': schedule.side_effects or 'Consult doctor if any discomfort',
            'status': schedule.status,
        })
    
    total_active = len(medicines_list)
    low_stock_count = sum(1 for m in medicines_list if m['stockStatus'] == 'low-stock')
    
    today_doses = 0
    for medicine in medicines_list:
        if medicine['timing']['morning']:
            today_doses += 1
        if medicine['timing']['afternoon']:
            today_doses += 1
        if medicine['timing']['night']:
            today_doses += 1
    
    completed_count = MedicineSchedule.objects.filter(
        prescription__patient=profile, status='completed'
    ).count()
    
    return JsonResponse({
        'medicines': medicines_list,
        'stats': {
            'active_medicines': total_active,
            'today_doses': today_doses,
            'low_stock': low_stock_count,
            'completed': completed_count,
        }
    })


@login_required
def get_profile(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    full_name = request.user.get_full_name()
    first_name = request.user.first_name or ""
    last_name = request.user.last_name or ""
    
    profile_photo_url = None
    if profile.profile_photo:
        profile_photo_url = request.build_absolute_uri(profile.profile_photo.url)
    
    gender_display = None
    if profile.gender:
        gender_display = profile.get_gender_display_short()
    
    member_since = profile.created_at.strftime('%B %Y')
    
    from doctors.models import Appointment
    total_visits = Appointment.objects.filter(patient=profile, status='completed').count()
    
    return JsonResponse({
        'firstName': first_name,
        'lastName': last_name,
        'email': request.user.email,
        'phone': profile.phone_number or '',
        'age': profile.age or '',
        'gender': gender_display or '',
        'bloodGroup': profile.blood_group or '',
        'address': profile.address or '',
        'city': profile.city or '',
        'state': profile.state or '',
        'zipCode': profile.zip_code or '',
        'emergencyContact': profile.emergency_contact_phone or '',
        'emergencyName': profile.emergency_contact_name or '',
        'emergencyRelation': profile.emergency_contact_relation or '',
        'patientId': profile.patient_id,
        'profilePhoto': profile_photo_url,
        'memberSince': member_since,
        'totalVisits': total_visits,
        'lastUpdated': profile.updated_at.strftime('%B %d, %Y'),
    })


@login_required
@csrf_protect
@require_http_methods(["POST"])
def update_profile(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        data = json.loads(request.body)
        
        request.user.first_name = data.get('firstName', '')
        request.user.last_name = data.get('lastName', '')
        request.user.email = data.get('email', '')
        request.user.save()
        
        profile.phone_number = data.get('phone', '')
        profile.age = int(data.get('age')) if data.get('age') else None
        
        gender_map = {'Male': 'M', 'Female': 'F', 'Other': 'O'}
        profile.gender = gender_map.get(data.get('gender', ''), None)
        profile.blood_group = data.get('bloodGroup', '')
        profile.address = data.get('address', '')
        profile.city = data.get('city', '')
        profile.state = data.get('state', '')
        profile.zip_code = data.get('zipCode', '')
        profile.emergency_contact_name = data.get('emergencyName', '')
        profile.emergency_contact_relation = data.get('emergencyRelation', '')
        profile.emergency_contact_phone = data.get('emergencyContact', '')
        profile.save()
        
        return JsonResponse({"success": True, "message": "Profile updated successfully"})
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_protect
@require_http_methods(["POST"])
def upload_profile_photo(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        if 'photo' not in request.FILES:
            return JsonResponse({"error": "No photo provided"}, status=400)
        
        photo = request.FILES['photo']
        
        if photo.size > 5 * 1024 * 1024:
            return JsonResponse({"error": "File size must be less than 5MB"}, status=400)
        
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
        if photo.content_type not in allowed_types:
            return JsonResponse({"error": "Only JPEG, PNG, and GIF images are allowed"}, status=400)
        
        if profile.profile_photo:
            profile.profile_photo.delete()
        
        profile.profile_photo = photo
        profile.save()
        
        return JsonResponse({
            "success": True,
            "message": "Profile photo uploaded successfully",
            "photoUrl": request.build_absolute_uri(profile.profile_photo.url)
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def get_consultation_history(request):
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    from doctors.models import ConsultationHistory
    
    search_query = request.GET.get('search', '').strip()
    filter_doctor = request.GET.get('doctor', 'all')
    
    consultations = ConsultationHistory.objects.filter(
        patient=profile
    ).select_related('doctor__user', 'appointment')
    
    if filter_doctor != 'all':
        name_parts = filter_doctor.replace('Dr. ', '').strip().split(' ')
        if len(name_parts) >= 2:
            consultations = consultations.filter(
                doctor__user__first_name__icontains=name_parts[0],
                doctor__user__last_name__icontains=name_parts[1]
            )
        else:
            consultations = consultations.filter(
                Q(doctor__user__first_name__icontains=name_parts[0]) |
                Q(doctor__user__last_name__icontains=name_parts[0])
            )
    
    if search_query:
        consultations = consultations.filter(
            Q(doctor__user__first_name__icontains=search_query) |
            Q(doctor__user__last_name__icontains=search_query) |
            Q(diagnosis__icontains=search_query) |
            Q(doctor__specialization__icontains=search_query) |
            Q(consultation_number__icontains=search_query)
        )
    
    consultations_list = []
    for consultation in consultations:
        vital_signs = {}
        if consultation.blood_pressure:
            vital_signs['bloodPressure'] = consultation.blood_pressure
        if consultation.heart_rate:
            vital_signs['heartRate'] = consultation.heart_rate
        if consultation.temperature:
            vital_signs['temperature'] = consultation.temperature
        if consultation.weight:
            vital_signs['weight'] = consultation.weight
        if consultation.height:
            vital_signs['height'] = consultation.height
        
        consultations_list.append({
            'id': consultation.id,
            'consultationNumber': consultation.consultation_number,
            'doctorName': f"Dr. {consultation.doctor.user.get_full_name()}",
            'specialty': consultation.doctor.get_specialty_display(),
            'date': consultation.consultation_date.isoformat(),
            'time': consultation.consultation_time.strftime('%I:%M %p'),
            'type': consultation.get_consultation_type_display(),
            'chiefComplaint': consultation.chief_complaint,
            'diagnosis': consultation.diagnosis,
            'symptoms': consultation.get_symptoms_list(),
            'vitalSigns': vital_signs,
            'examination': consultation.examination_findings or '',
            'treatmentPlan': consultation.treatment_plan,
            'prescriptionIssued': 'Yes' if consultation.prescription_issued else 'No',
            'followUpDate': consultation.follow_up_date.isoformat() if consultation.follow_up_date else None,
            'notes': consultation.notes or ''
        })
    
    current_year = timezone.now().year
    this_year_count = ConsultationHistory.objects.filter(
        patient=profile, consultation_date__year=current_year
    ).count()
    
    unique_doctors = ConsultationHistory.objects.filter(
        patient=profile
    ).values('doctor').distinct().count()
    
    with_prescription = ConsultationHistory.objects.filter(
        patient=profile, prescription_issued=True
    ).count()
    
    unique_doctors_list = []
    doctors = ConsultationHistory.objects.filter(patient=profile).values(
        'doctor__user__first_name', 'doctor__user__last_name'
    ).distinct()
    
    for doctor in doctors:
        doctor_name = f"Dr. {doctor['doctor__user__first_name']} {doctor['doctor__user__last_name']}"
        if doctor_name not in unique_doctors_list:
            unique_doctors_list.append(doctor_name)
    
    return JsonResponse({
        'consultations': consultations_list,
        'stats': {
            'total': consultations.count(),
            'this_year': this_year_count,
            'doctors_consulted': unique_doctors,
            'with_prescription': with_prescription,
        },
        'unique_doctors': unique_doctors_list
    })


@login_required
def get_all_doctors(request):
    try:
        specialty = request.GET.get('specialty', 'all')
        search = request.GET.get('search', '')
        
        doctors = DoctorProfile.objects.filter(is_active=True).select_related('user')
        
        if specialty and specialty != 'all':
            doctors = doctors.filter(specialization=specialty)
        
        if search:
            doctors = doctors.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(specialization__icontains=search)
            )
        
        doctors_list = []
        for doctor in doctors:
            full_name = doctor.user.get_full_name() or doctor.user.username
            
            profile_photo = None
            if hasattr(doctor, 'profile_photo') and doctor.profile_photo:
                profile_photo = request.build_absolute_uri(doctor.profile_photo.url)
            
            first_name = doctor.user.first_name or ""
            last_name = doctor.user.last_name or ""
            if first_name and last_name:
                initials = f"{first_name[0]}{last_name[0]}".upper()
            elif first_name:
                initials = first_name[0].upper()
            else:
                initials = "D"
            
            experience = ''
            if doctor.experience_years:
                experience = f"{doctor.experience_years} years"
            
            doctors_list.append({
                'id': doctor.id,
                'doctorId': doctor.doctor_id,
                'name': full_name,
                'specialty': doctor.get_specialty_display(),
                'specialtyCode': doctor.specialization,
                'image': profile_photo,
                'initials': initials,
                'experience': experience,
                'availability': getattr(doctor, 'available_hours', '') or 'Not specified',
                'department': getattr(doctor, 'department', '') or doctor.get_specialty_display(),
                'location': getattr(doctor, 'room_location', '') or 'Not specified',
                'phone': doctor.phone_number or 'Not available',
                'email': doctor.user.email,
                'education': getattr(doctor, 'education', '') or doctor.qualification or 'Not specified',
                'subSpecialty': getattr(doctor, 'sub_specialty', '') or '',
                'certification': getattr(doctor, 'certification', '') or 'Not specified',
                'languages': getattr(doctor, 'languages', '') or 'Not specified',
                'hospitalName': doctor.hospital_name or 'MediConnect Hospital',
                'licenseNumber': doctor.license_number or '',
                'isVerified': doctor.is_verified,
            })
        
        all_specialties = DoctorProfile.objects.filter(
            is_active=True
        ).values_list('specialization', flat=True).distinct()
        
        specialties_list = [
            {'code': spec, 'name': dict(DoctorProfile.SPECIALTY_CHOICES).get(spec, spec)}
            for spec in all_specialties
        ]
        
        return JsonResponse({'doctors': doctors_list, 'specialties': specialties_list})
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



# ═══════════════════════════════════════════════════════════════
# FUNCTION 1: Get Reschedule Options (Same Doctor, Different Dates)
# ═══════════════════════════════════════════════════════════════

@login_required
def get_reschedule_options(request, appointment_id):
    """
    Returns available dates/times for the SAME doctor (next 7 days only)
    Excludes the off day that triggered the reschedule and any other off days
    """
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        # Get the appointment
        appointment = Appointment.objects.get(id=appointment_id, patient=profile)
        
        if appointment.status != 'needs_rescheduling':
            return JsonResponse({"error": "This appointment doesn't need rescheduling"}, status=400)
        
        doctor = appointment.doctor
        doctor_name = f"Dr. {doctor.user.get_full_name()}"
        
        from doctors.models import DoctorSchedule
        from datetime import datetime, date, timedelta as dt_timedelta
        
        now = timezone.now()
        today = now.date()
        
        # Get doctor's ACTIVE working days (excludes off days)
        day_map = {
            0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday',
            4: 'friday', 5: 'saturday', 6: 'sunday'
        }
        
        schedules = DoctorSchedule.objects.filter(
            doctor=doctor,
            is_active=True,  # ✅ Only active days (excludes off days)
            slot_type='consultation'
        )
        
        working_days = set()
        for schedule in schedules:
            working_days.add(schedule.day_of_week)
        
        # ✅ NEW: Get next 7 calendar days only (not 10 working days)
        available_dates = []
        check_date = today + dt_timedelta(days=1)  # Start from tomorrow
        end_date = today + dt_timedelta(days=7)    # End after 7 days
        
        while check_date <= end_date:
            day_name = day_map[check_date.weekday()]
            
            # ✅ Check if this day is a working day (excludes off days automatically)
            if day_name in working_days:
                # Get available time slots for this date
                available_times = get_available_time_slots(doctor, check_date)
                
                if available_times:  # Only include if slots available
                    available_dates.append({
                        'date': check_date.isoformat(),
                        'day': check_date.strftime('%A'),
                        'formatted': check_date.strftime('%b %d, %Y'),
                        'times': available_times
                    })
            
            check_date += dt_timedelta(days=1)
        
        return JsonResponse({
            'success': True,
            'appointment_id': appointment.id,
            'doctor_id': doctor.id,
            'doctor_name': doctor_name,
            'original_date': appointment.appointment_date.strftime('%B %d, %Y'),
            'original_time': appointment.appointment_time.strftime('%I:%M %p'),
            'available_dates': available_dates
        })
        
    except Appointment.DoesNotExist:
        return JsonResponse({"error": "Appointment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════
# FUNCTION 2: Reschedule Appointment (Update Date/Time)
# ═══════════════════════════════════════════════════════════════

@login_required
@csrf_protect
@require_http_methods(["POST"])
def reschedule_appointment(request, appointment_id):
    """
    Updates appointment with new date/time (same doctor)
    """
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        import json
        from datetime import datetime, time as dt_time
        
        data = json.loads(request.body)
        new_date = data.get('appointment_date')
        new_time = data.get('appointment_time')
        
        if not new_date or not new_time:
            return JsonResponse({"error": "Date and time are required"}, status=400)
        
        # Get the appointment
        appointment = Appointment.objects.get(id=appointment_id, patient=profile)
        
        if appointment.status != 'needs_rescheduling':
            return JsonResponse({"error": "This appointment doesn't need rescheduling"}, status=400)
        
        # ✅ FIX: Convert time string to time object
        if isinstance(new_time, str):
            # Parse time string (format: "HH:MM" or "HH:MM:SS")
            try:
                time_obj = datetime.strptime(new_time, '%H:%M').time()
            except ValueError:
                try:
                    time_obj = datetime.strptime(new_time, '%H:%M:%S').time()
                except ValueError:
                    return JsonResponse({"error": "Invalid time format"}, status=400)
        else:
            time_obj = new_time
        
        # ✅ Convert date string to date object
        if isinstance(new_date, str):
            date_obj = datetime.strptime(new_date, '%Y-%m-%d').date()
        else:
            date_obj = new_date
        
        # Check for conflicts (same doctor, same date/time)
        from django.db.models import Q
        conflict = Appointment.objects.filter(
            doctor=appointment.doctor,
            appointment_date=date_obj,
            appointment_time=time_obj,
            status__in=['pending', 'confirmed']
        ).exclude(id=appointment.id).exists()
        
        if conflict:
            return JsonResponse({
                "error": "This time slot is already booked. Please choose another time."
            }, status=400)
        
        # Update appointment
        appointment.appointment_date = date_obj
        appointment.appointment_time = time_obj
        appointment.status = 'confirmed'
        appointment.save()
        
        # ✅ FIX: Format time properly
        formatted_time = appointment.appointment_time.strftime('%I:%M %p')
        formatted_date = appointment.appointment_date.strftime('%B %d, %Y')
        
        return JsonResponse({
            'success': True,
            'message': 'Appointment rescheduled successfully',
            'new_date': formatted_date,
            'new_time': formatted_time
        })
        
    except Appointment.DoesNotExist:
        return JsonResponse({"error": "Appointment not found"}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in reschedule_appointment: {e}")
        print(traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════
# FUNCTION 3: Get Transfer Options (Same Specialty, Different Doctor)
# ═══════════════════════════════════════════════════════════════

@login_required
def get_transfer_options(request, appointment_id):
    """
    Returns alternative doctors with same specialty
    Checks their availability on same date/time if possible
    """
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        # Get the appointment
        appointment = Appointment.objects.get(id=appointment_id, patient=profile)
        
        if appointment.status != 'needs_rescheduling':
            return JsonResponse({"error": "This appointment doesn't need rescheduling"}, status=400)
        
        original_doctor = appointment.doctor
        original_date = appointment.appointment_date
        original_time = appointment.appointment_time
        
        # Find other doctors with same specialty
        alternative_doctors = DoctorProfile.objects.filter(
            specialization=original_doctor.specialization,
            is_available=True,
            is_active=True
        ).exclude(id=original_doctor.id).select_related('user')
        
        doctors_list = []
        
        for doctor in alternative_doctors:
            # Check if doctor works on this date
            from doctors.models import DoctorSchedule
            from datetime import datetime
            
            day_map = {
                0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday',
                4: 'friday', 5: 'saturday', 6: 'sunday'
            }
            day_name = day_map[original_date.weekday()]
            
            has_schedule = DoctorSchedule.objects.filter(
                doctor=doctor,
                day_of_week=day_name,
                is_active=True,
                slot_type='consultation'
            ).exists()
            
            if not has_schedule:
                continue  # Skip doctors who don't work on this day
            
            # Get available times for this doctor on original date
            available_times = get_available_time_slots(doctor, original_date)
            
            # Check if original time is available
            original_time_str = original_time.strftime('%I:%M %p').lstrip('0')
            same_time_available = original_time_str in available_times
            
            doctor_photo = None
            if hasattr(doctor, 'profile_photo') and doctor.profile_photo:
                doctor_photo = request.build_absolute_uri(doctor.profile_photo.url)
            
            doctors_list.append({
                'id': doctor.id,
                'name': f"Dr. {doctor.user.get_full_name()}",
                'specialty': doctor.get_specialty_display(),
                'experience': doctor.experience_years,
                'room_location': doctor.room_location or 'Not specified',
                'photo': doctor_photo,
                'same_time_available': same_time_available,
                'available_times': available_times[:10]  # Limit to 10 slots
            })
        
        return JsonResponse({
            'success': True,
            'appointment_id': appointment.id,
            'original_doctor': f"Dr. {original_doctor.user.get_full_name()}",
            'original_date': original_date.strftime('%B %d, %Y'),
            'original_time': original_time.strftime('%I:%M %p'),
            'specialty': original_doctor.get_specialty_display(),
            'alternative_doctors': doctors_list
        })
        
    except Appointment.DoesNotExist:
        return JsonResponse({"error": "Appointment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════
# FUNCTION 4: Transfer Appointment (Change Doctor)
# ═══════════════════════════════════════════════════════════════

# Updated transfer_appointment function for patients/views.py
# Replace the existing transfer_appointment function with this updated version

@login_required
@csrf_protect
@require_http_methods(["POST"])
def transfer_appointment(request, appointment_id):
    """
    Transfers appointment to a different doctor (same specialty)
    Can choose different date and time
    """
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        # Get the appointment
        appointment = Appointment.objects.get(id=appointment_id, patient=profile)
        
        if appointment.status != 'needs_rescheduling':
            return JsonResponse({"error": "This appointment doesn't need rescheduling"}, status=400)
        
        data = json.loads(request.body)
        new_doctor_id = data.get('doctor_id')
        new_date = data.get('appointment_date')  # ← NEW: Accept date parameter
        new_time = data.get('appointment_time')
        
        if not new_doctor_id:
            return JsonResponse({"error": "Doctor ID is required"}, status=400)
        
        if not new_date or not new_time:
            return JsonResponse({"error": "Date and time are required"}, status=400)
        
        # Get new doctor
        try:
            new_doctor = DoctorProfile.objects.get(id=new_doctor_id, is_available=True, is_active=True)
        except DoctorProfile.DoesNotExist:
            return JsonResponse({"error": "Doctor not found or not available"}, status=404)
        
        # Verify same specialty
        if new_doctor.specialization != appointment.doctor.specialization:
            return JsonResponse({"error": "Doctor must have the same specialty"}, status=400)
        
        # Convert 12hr time to 24hr
        from datetime import datetime
        try:
            new_time_obj = datetime.strptime(new_time, '%I:%M %p').time()
        except:
            new_time_obj = datetime.strptime(new_time, '%H:%M').time()
        
        # Check for conflicts
        conflict = Appointment.objects.filter(
            doctor=new_doctor,
            appointment_date=new_date,  # ← UPDATED: Use new_date
            appointment_time=new_time_obj,
            status__in=['pending', 'confirmed']
        ).exists()
        
        if conflict:
            return JsonResponse({"error": "This time slot is no longer available"}, status=400)
        
        # Update appointment
        old_doctor_name = f"Dr. {appointment.doctor.user.get_full_name()}"
        appointment.doctor = new_doctor
        appointment.appointment_date = new_date  # ← NEW: Update date
        appointment.appointment_time = new_time_obj
        appointment.status = 'confirmed'
        appointment.save()
        
        # TODO: Send confirmation email
        
        new_doctor_name = f"Dr. {new_doctor.user.get_full_name()}"
        
        return JsonResponse({
            "success": True,
            "message": f"Appointment transferred from {old_doctor_name} to {new_doctor_name}",
            "new_doctor": new_doctor_name,
            "date": appointment.appointment_date.strftime('%B %d, %Y'),
            "time": appointment.appointment_time.strftime('%I:%M %p')
        })
        
    except Appointment.DoesNotExist:
        return JsonResponse({"error": "Appointment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)




@login_required
def get_transfer_doctor_slots(request, doctor_id):
    """
    Get available dates for a DIFFERENT doctor during transfer
    Uses SAME LOGIC as get_reschedule_options (7 calendar days, skip off days)
    """
    try:
        profile = request.user.patientprofile
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)
    
    try:
        doctor = DoctorProfile.objects.get(id=doctor_id, is_available=True, is_active=True)
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor not found or not available"}, status=404)
    
    from doctors.models import DoctorSchedule
    from datetime import datetime, timedelta as dt_timedelta
    
    now = timezone.now()
    today = now.date()
    
    # Get date parameter (for getting times for specific date)
    selected_date_str = request.GET.get('date')
    
    # ─────────────────────────────────────────────
    # If date is selected → return times for that date
    # ─────────────────────────────────────────────
    if selected_date_str:
        try:
            selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
        except:
            return JsonResponse({"error": "Invalid date format"}, status=400)
        
        # Get available time slots
        available_times = get_available_time_slots(doctor, selected_date)
        
        return JsonResponse({
            'date': selected_date.isoformat(),
            'available_times': available_times
        })
    
    # ─────────────────────────────────────────────
    # Otherwise, return available dates
    # ✅ SAME LOGIC AS get_reschedule_options() ✅
    # ─────────────────────────────────────────────
    
    day_map = {
        0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday',
        4: 'friday', 5: 'saturday', 6: 'sunday'
    }
    
    # Get doctor's ACTIVE working days (excludes off days)
    schedules = DoctorSchedule.objects.filter(
        doctor=doctor,
        is_active=True,  # ✅ Only active days (excludes off days)
        slot_type='consultation'
    )
    
    working_days = set()
    for schedule in schedules:
        working_days.add(schedule.day_of_week)
    
    # ✅ Get next 7 calendar days only (same as reschedule)
    available_dates = []
    check_date = today + dt_timedelta(days=1)  # Start from tomorrow
    end_date = today + dt_timedelta(days=7)    # End after 7 days
    
    while check_date <= end_date:
        day_name = day_map[check_date.weekday()]
        
        # ✅ Check if this day is a working day (excludes off days automatically)
        if day_name in working_days:
            # Get available time slots for this date
            available_times = get_available_time_slots(doctor, check_date)
            
            if available_times:  # Only include if slots available
                available_dates.append({
                    'date': check_date.isoformat(),
                    'day': check_date.strftime('%A'),
                    'formatted': check_date.strftime('%b %d, %Y'),
                    'times': available_times  # Include times in response
                })
        
        check_date += dt_timedelta(days=1)
    
    return JsonResponse({
        'success': True,
        'doctor_id': doctor.id,
        'doctor_name': f"Dr. {doctor.user.get_full_name()}",
        'available_dates': available_dates
    })