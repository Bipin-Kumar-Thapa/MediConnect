from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.db.models import Q
from .models import DoctorProfile, Appointment, Prescription, ConsultationHistory, PrescribedMedicine, DoctorSchedule, SharedConsultation
from django.utils import timezone
from datetime import timedelta
import json

@login_required
def get_doctor_sidebar_data(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    first_name = request.user.first_name or ""
    last_name = request.user.last_name or ""
    
    if first_name and last_name:
        initials = f"{first_name[0]}{last_name[0]}".upper()
    elif first_name:
        initials = first_name[0].upper()
    elif request.user.username:
        initials = request.user.username[0].upper()
    else:
        initials = "D"
    
    full_name = request.user.get_full_name() or request.user.username
    
    profile_photo = None
    if profile.profile_photo:
        profile_photo = request.build_absolute_uri(profile.profile_photo.url)
    
    return JsonResponse({
        "name": full_name,
        "doctor_id": profile.doctor_id,
        "specialty": profile.get_specialty_display(),
        "initials": initials,
        "profile_photo": profile_photo,
    })


@login_required
@csrf_protect
@require_http_methods(["POST"])
def doctor_logout(request):
    try:
        logout(request)
        return JsonResponse({"message": "Logged out successfully", "success": True})
    except Exception as e:
        return JsonResponse({"error": str(e), "success": False}, status=500)


@login_required
def doctor_overview(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    from patients.models import PatientProfile
    from staff.models import LabReport
    
    full_name = request.user.get_full_name() or request.user.username
    period = request.GET.get('period', 'today')
    now = timezone.now()
    today = now.date()
    
    if period == 'today':
        start_date = today
        end_date = today
        period_label_display = "Today"
    elif period == 'week':
        start_date = today - timezone.timedelta(days=today.weekday())
        end_date = start_date + timezone.timedelta(days=6)
        period_label_display = "This Week"
    else:
        start_date = today.replace(day=1)
        next_month = today.replace(day=28) + timezone.timedelta(days=4)
        end_date = next_month - timezone.timedelta(days=next_month.day)
        period_label_display = "This Month"
    
    total_patients = Appointment.objects.filter(
        doctor=profile, appointment_date__gte=start_date, appointment_date__lte=end_date
    ).values('patient').distinct().count()
    
    total_appointments = Appointment.objects.filter(
        doctor=profile, appointment_date__gte=start_date, appointment_date__lte=end_date
    ).count()
    
    completed_appointments = Appointment.objects.filter(
        doctor=profile, appointment_date__gte=start_date, appointment_date__lte=end_date, status='completed'
    ).count()
    
    pending_consultations = Appointment.objects.filter(
        doctor=profile, status__in=['pending', 'confirmed'], appointment_date__gte=today
    ).count()
    
    urgent_count = Appointment.objects.filter(
        doctor=profile, status__in=['pending', 'confirmed'], appointment_date=today
    ).count()
    
    prescriptions_count = Prescription.objects.filter(
        doctor=profile, prescribed_date__gte=start_date, prescribed_date__lte=end_date
    ).count()
    
    upcoming_appointments = Appointment.objects.filter(
        doctor=profile, appointment_date__gte=today, status__in=['pending', 'confirmed']
    ).select_related('patient__user').order_by('appointment_date', 'appointment_time')[:6]
    
    upcoming_list = []
    for apt in upcoming_appointments:
        profile_photo = None
        if apt.patient.profile_photo:
            profile_photo = request.build_absolute_uri(apt.patient.profile_photo.url)
        upcoming_list.append({
            'id': apt.patient.id,
            'appointmentId': apt.id,
            'patientName': apt.patient.user.get_full_name() or apt.patient.user.username,
            'patientId': apt.patient.patient_id,
            'age': apt.patient.age or 'N/A',
            'gender': apt.patient.get_gender_display_short() or 'N/A',
            'date': apt.appointment_date.strftime('%b %d, %Y'),
            'time': apt.appointment_time.strftime('%I:%M %p'),
            'type': apt.get_appointment_type_display(),
            'status': apt.status,
            'reason': apt.reason,
            'profilePhoto': profile_photo,
        })
    
    one_hour_ago = now - timezone.timedelta(hours=1)
    recent_activity = []
    
    recent_prescriptions = Prescription.objects.filter(
        doctor=profile, created_at__gte=one_hour_ago
    ).select_related('patient__user').order_by('-created_at')[:3]
    
    for presc in recent_prescriptions:
        time_diff = now - presc.created_at
        minutes = int(time_diff.total_seconds() / 60)
        if minutes < 1:
            time_ago = "Just now"
        elif minutes < 60:
            time_ago = f"{minutes} min ago"
        else:
            hours = int(minutes / 60)
            time_ago = f"{hours} hour ago" if hours == 1 else f"{hours} hours ago"
        recent_activity.append({
            'id': f'presc-{presc.id}',
            'type': 'prescription',
            'patient': presc.patient.user.get_full_name() or presc.patient.user.username,
            'action': 'Prescription issued',
            'time': time_ago,
            'icon': 'prescription',
            'color': '#8B5CF6'
        })
    
    recent_completed = Appointment.objects.filter(
        doctor=profile, status='completed', updated_at__gte=one_hour_ago
    ).select_related('patient__user').order_by('-updated_at')[:3]
    
    for apt in recent_completed:
        time_diff = now - apt.updated_at
        minutes = int(time_diff.total_seconds() / 60)
        if minutes < 1:
            time_ago = "Just now"
        elif minutes < 60:
            time_ago = f"{minutes} min ago"
        else:
            hours = int(minutes / 60)
            time_ago = f"{hours} hour ago" if hours == 1 else f"{hours} hours ago"
        recent_activity.append({
            'id': f'apt-{apt.id}',
            'type': 'appointment',
            'patient': apt.patient.user.get_full_name() or apt.patient.user.username,
            'action': 'Appointment completed',
            'time': time_ago,
            'icon': 'completed',
            'color': '#10B981'
        })
    
    recent_activity = sorted(recent_activity, key=lambda x: x['time'])
    
    notifications = []
    one_hour_later = now + timezone.timedelta(hours=1)
    
    # Type 1: Upcoming appointments in next 1 hour
    upcoming_soon = Appointment.objects.filter(
        doctor=profile, appointment_date=today, status__in=['pending', 'confirmed']
    ).select_related('patient__user').order_by('appointment_time')
    
    for apt in upcoming_soon:
        apt_datetime = timezone.datetime.combine(apt.appointment_date, apt.appointment_time)
        apt_datetime = timezone.make_aware(apt_datetime)
        if apt_datetime > now and apt_datetime <= one_hour_later:
            time_diff = apt_datetime - now
            minutes = int(time_diff.total_seconds() / 60)
            if minutes < 1:
                time_text = "Starting now"
            elif minutes < 60:
                time_text = f"in {minutes} min"
            else:
                time_text = f"in {int(minutes / 60)} hour"
            priority = 'high' if minutes < 15 else 'medium' if minutes < 30 else 'low'
            notifications.append({
                'id': f'upcoming-{apt.id}',
                'type': 'appointment',
                'message': f"Upcoming: {apt.patient.user.get_full_name() or apt.patient.user.username}",
                'time': time_text,
                'priority': priority
            })
    
    # Type 2: Newly booked appointments (last 1 hour)
    newly_booked = Appointment.objects.filter(
        doctor=profile, created_at__gte=one_hour_ago, status__in=['pending', 'confirmed']
    ).select_related('patient__user').order_by('-created_at')[:5]
    
    for apt in newly_booked:
        time_since_booking = now - apt.created_at
        total_minutes = int(time_since_booking.total_seconds() / 60)
        hours_ago = int(time_since_booking.total_seconds() / 3600)
        if total_minutes < 1:
            time_text = "Just now"
        elif total_minutes < 60:
            time_text = f"{total_minutes} min ago"
        elif hours_ago < 24:
            time_text = f"{hours_ago} hr ago" if hours_ago > 1 else "1 hr ago"
        else:
            time_text = "Yesterday"
        apt_date = apt.appointment_date.strftime('%b %d')
        apt_time = apt.appointment_time.strftime('%I:%M %p')
        notifications.append({
            'id': f'booked-{apt.id}',
            'type': 'appointment',
            'message': f"New booking: {apt.patient.user.get_full_name() or apt.patient.user.username} on {apt_date} at {apt_time}",
            'time': time_text,
            'priority': 'medium'
        })
    
    # Type 3: Critical lab reports (last 1 hour)
    doctor_patients = Appointment.objects.filter(doctor=profile).values_list('patient_id', flat=True).distinct()
    critical_lab_reports = LabReport.objects.filter(
        patient_id__in=doctor_patients, created_at__gte=one_hour_ago, status='critical'
    ).select_related('patient__user').order_by('-created_at')[:5]
    
    for report in critical_lab_reports:
        time_since = now - report.created_at
        total_minutes = int(time_since.total_seconds() / 60)
        hours_ago = int(time_since.total_seconds() / 3600)
        if total_minutes < 1:
            time_text = "Just now"
        elif total_minutes < 60:
            time_text = f"{total_minutes} min ago"
        elif hours_ago < 24:
            time_text = f"{hours_ago} hr ago" if hours_ago > 1 else "1 hr ago"
        else:
            time_text = "Yesterday"
        notifications.append({
            'id': f'lab-critical-{report.id}',
            'type': 'lab',
            'message': f"⚠️ Critical Lab: {report.patient.user.get_full_name() or report.patient.user.username} - {report.test_name}",
            'time': time_text,
            'priority': 'high'
        })
    
    # Type 4: New lab reports (last 1 hour, non-critical)
    new_lab_reports = LabReport.objects.filter(
        patient_id__in=doctor_patients, created_at__gte=one_hour_ago, status__in=['normal', 'abnormal']
    ).select_related('patient__user').order_by('-created_at')[:3]
    
    for report in new_lab_reports:
        time_since = now - report.created_at
        total_minutes = int(time_since.total_seconds() / 60)
        hours_ago = int(time_since.total_seconds() / 3600)
        if total_minutes < 1:
            time_text = "Just now"
        elif total_minutes < 60:
            time_text = f"{total_minutes} min ago"
        elif hours_ago < 24:
            time_text = f"{hours_ago} hr ago" if hours_ago > 1 else "1 hr ago"
        else:
            time_text = "Yesterday"
        notifications.append({
            'id': f'lab-new-{report.id}',
            'type': 'lab',
            'message': f"New Lab Result: {report.patient.user.get_full_name() or report.patient.user.username} - {report.test_name}",
            'time': time_text,
            'priority': 'medium'
        })
    
    # Type 5: Recently completed appointments (last 1 hour)
    recent_completed_notif = Appointment.objects.filter(
        doctor=profile, status='completed', updated_at__gte=one_hour_ago
    ).select_related('patient__user').order_by('-updated_at')[:3]
    
    for apt in recent_completed_notif:
        time_diff = now - apt.updated_at
        minutes = int(time_diff.total_seconds() / 60)
        if minutes < 1:
            time_text = "Just now"
        elif minutes < 60:
            time_text = f"{minutes} min ago"
        else:
            time_text = f"{int(minutes / 60)} hr ago"
        notifications.append({
            'id': f'completed-{apt.id}',
            'type': 'appointment',
            'message': f"Completed: {apt.patient.user.get_full_name() or apt.patient.user.username}",
            'time': time_text,
            'priority': 'low'
        })
    
    # Type 6: Shared consultations (last 1 hour — auto-disappears like other notifications)
    shared_with_me = SharedConsultation.objects.filter(
        shared_with=profile,
        shared_at__gte=one_hour_ago,
        is_read=False
    ).select_related('shared_by__user', 'consultation__patient__user').order_by('-shared_at')[:5]
    
    for shared in shared_with_me:
        time_since = now - shared.shared_at
        total_minutes = int(time_since.total_seconds() / 60)
        hours_ago = int(time_since.total_seconds() / 3600)
        if total_minutes < 1:
            time_text = "Just now"
        elif total_minutes < 60:
            time_text = f"{total_minutes} min ago"
        elif hours_ago < 24:
            time_text = f"{hours_ago} hr ago" if hours_ago > 1 else "1 hr ago"
        else:
            time_text = "Yesterday"
        
        sharer_name = shared.shared_by.user.get_full_name() or shared.shared_by.user.username
        patient_name = shared.consultation.patient.user.get_full_name() or shared.consultation.patient.user.username
        message_preview = f' — "{shared.message[:40]}..."' if shared.message and len(shared.message) > 40 else (f' — "{shared.message}"' if shared.message else '')
        
        notifications.append({
            'id': f'shared-{shared.id}',
            'type': 'shared',
            'message': f"📋 Dr. {sharer_name} shared a consultation | Patient: {patient_name}{message_preview}",
            'time': time_text,
            'priority': 'medium'
        })
    
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    notifications.sort(key=lambda x: priority_order[x['priority']])
    notifications = notifications[:10]
    
    if period == 'today':
        prev_start = today - timezone.timedelta(days=1)
        prev_end = prev_start
        period_label = "vs yesterday"
    elif period == 'week':
        prev_start = start_date - timezone.timedelta(days=7)
        prev_end = end_date - timezone.timedelta(days=7)
        period_label = "vs last week"
    else:
        prev_start = (start_date - timezone.timedelta(days=1)).replace(day=1)
        prev_end = start_date - timezone.timedelta(days=1)
        period_label = "vs last month"
    
    prev_patients = Appointment.objects.filter(
        doctor=profile, appointment_date__gte=prev_start, appointment_date__lte=prev_end
    ).values('patient').distinct().count()
    
    patients_change = total_patients - prev_patients
    patients_change_text = f"+{patients_change} {period_label}" if patients_change > 0 else (f"{patients_change} {period_label}" if patients_change < 0 else "No change")
    
    prev_appointments = Appointment.objects.filter(
        doctor=profile, appointment_date__gte=prev_start, appointment_date__lte=prev_end
    ).count()
    
    appointments_change = total_appointments - prev_appointments
    appointments_change_text = f"+{appointments_change} {period_label}" if appointments_change > 0 else (f"{appointments_change} {period_label}" if appointments_change < 0 else "No change")
    
    return JsonResponse({
        'doctorName': full_name,
        'stats': {
            'total_patients': total_patients,
            'total_patients_change': patients_change_text,
            'total_appointments': total_appointments,
            'total_appointments_change': appointments_change_text,
            'pending_consultations': pending_consultations,
            'pending_consultations_change': f"{urgent_count} urgent",
            'prescriptions_issued': prescriptions_count,
            'prescriptions_issued_change': period_label_display,
        },
        'upcoming_appointments': upcoming_list,
        'recent_activity': recent_activity,
        'notifications': notifications,
    })


@login_required
def get_patient_details(request, patient_id):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    try:
        from patients.models import PatientProfile
        patient = PatientProfile.objects.select_related('user').get(id=patient_id)
        appointments_count = Appointment.objects.filter(patient=patient, doctor=profile).count()
        last_consultation = ConsultationHistory.objects.filter(
            patient=patient, doctor=profile
        ).order_by('-consultation_date').first()
        last_visit = last_consultation.consultation_date.strftime('%B %d, %Y') if last_consultation else None
        return JsonResponse({
            'patientId': patient.patient_id,
            'name': patient.user.get_full_name() or patient.user.username,
            'email': patient.user.email,
            'phone': patient.phone_number or 'Not provided',
            'age': patient.age or 'N/A',
            'gender': patient.get_gender_display_short() or 'N/A',
            'bloodGroup': patient.blood_group or 'N/A',
            'address': patient.address or 'Not provided',
            'city': patient.city or 'N/A',
            'state': patient.state or 'N/A',
            'emergencyContact': patient.emergency_contact_phone or 'Not provided',
            'emergencyContactName': patient.emergency_contact_name or 'Not provided',
            'totalVisits': appointments_count,
            'lastVisit': last_visit or 'First visit',
            'status': 'Active' if patient.is_active else 'Inactive',
            'profilePhoto': request.build_absolute_uri(patient.profile_photo.url) if patient.profile_photo else None,
        })
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient not found"}, status=404)


@login_required
def get_doctor_appointments(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    status_filter = request.GET.get('status', 'all')
    search_query = request.GET.get('search', '').strip()
    selected_date = request.GET.get('date', timezone.now().date().isoformat())
    
    try:
        filter_date = timezone.datetime.strptime(selected_date, '%Y-%m-%d').date()
    except:
        filter_date = timezone.now().date()
    
    appointments = Appointment.objects.filter(
        doctor=profile, appointment_date=filter_date
    ).select_related('patient__user')
    
    if status_filter != 'all':
        if status_filter == 'scheduled':
            appointments = appointments.filter(status__in=['pending', 'confirmed'])
        else:
            appointments = appointments.filter(status=status_filter)
    
    if search_query:
        appointments = appointments.filter(
            Q(patient__user__first_name__icontains=search_query) |
            Q(patient__user__last_name__icontains=search_query) |
            Q(patient__patient_id__icontains=search_query)
        )
    
    appointments_list = []
    for apt in appointments:
        last_visit = Appointment.objects.filter(
            patient=apt.patient, doctor=profile, status='completed', appointment_date__lt=apt.appointment_date
        ).order_by('-appointment_date').first()
        profile_photo = None
        if apt.patient.profile_photo:
            profile_photo = request.build_absolute_uri(apt.patient.profile_photo.url)
        appointments_list.append({
            'id': apt.id,
            'patientName': apt.patient.user.get_full_name() or apt.patient.user.username,
            'patientId': apt.patient.patient_id,
            'age': apt.patient.age or 'N/A',
            'gender': apt.patient.get_gender_display_short() or 'N/A',
            'phone': apt.patient.phone_number or 'Not provided',
            'email': apt.patient.user.email,
            'date': apt.appointment_date.isoformat(),
            'time': apt.appointment_time.strftime('%I:%M %p'),
            'type': apt.get_appointment_type_display(),
            'status': 'scheduled' if apt.status in ['pending', 'confirmed'] else apt.status,
            'reason': apt.reason,
            'bloodGroup': apt.patient.blood_group or 'N/A',
            'lastVisit': last_visit.appointment_date.isoformat() if last_visit else None,
            'actualStatus': apt.status,
            'profilePhoto': profile_photo,
        })
    
    total_today = Appointment.objects.filter(doctor=profile, appointment_date=filter_date).count()
    scheduled = Appointment.objects.filter(doctor=profile, appointment_date=filter_date, status__in=['pending', 'confirmed']).count()
    completed = Appointment.objects.filter(doctor=profile, appointment_date=filter_date, status='completed').count()
    missed = Appointment.objects.filter(doctor=profile, appointment_date=filter_date, status='missed').count()
    cancelled = Appointment.objects.filter(doctor=profile, appointment_date=filter_date, status='cancelled').count()
    
    return JsonResponse({
        'appointments': appointments_list,
        'stats': {'total': total_today, 'scheduled': scheduled, 'completed': completed, 'missed': missed, 'cancelled': cancelled}
    })


@login_required
@csrf_protect
@require_http_methods(["POST"])
def mark_appointment_complete(request, appointment_id):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    try:
        appointment = Appointment.objects.get(id=appointment_id, doctor=profile)
        if appointment.status == 'completed':
            return JsonResponse({"error": "Appointment already completed"}, status=400)
        if appointment.status == 'cancelled':
            return JsonResponse({"error": "Cannot complete a cancelled appointment"}, status=400)
        appointment.status = 'completed'
        appointment.save()
        return JsonResponse({"success": True, "message": "Appointment marked as completed"})
    except Appointment.DoesNotExist:
        return JsonResponse({"error": "Appointment not found"}, status=404)


@login_required
@csrf_protect
@require_http_methods(["POST"])
def cancel_doctor_appointment(request, appointment_id):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    try:
        appointment = Appointment.objects.get(id=appointment_id, doctor=profile)
        if appointment.status == 'completed':
            return JsonResponse({"error": "Cannot cancel a completed appointment"}, status=400)
        if appointment.status == 'cancelled':
            return JsonResponse({"error": "Appointment already cancelled"}, status=400)
        appointment.status = 'cancelled'
        appointment.save()
        return JsonResponse({"success": True, "message": "Appointment cancelled successfully"})
    except Appointment.DoesNotExist:
        return JsonResponse({"error": "Appointment not found"}, status=404)


@login_required
def get_doctor_prescriptions(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    status_filter = request.GET.get('status', 'all')
    search_query = request.GET.get('search', '').strip()
    
    prescriptions = Prescription.objects.filter(doctor=profile).select_related('patient__user').prefetch_related('medicines')
    
    if status_filter != 'all':
        prescriptions = prescriptions.filter(status=status_filter)
    
    if search_query:
        prescriptions = prescriptions.filter(
            Q(prescription_number__icontains=search_query) |
            Q(patient__user__first_name__icontains=search_query) |
            Q(patient__user__last_name__icontains=search_query) |
            Q(patient__patient_id__icontains=search_query)
        )
    
    prescriptions_list = []
    for prescription in prescriptions:
        medicines_data = [{
            'name': m.medicine_name, 'dosage': m.dosage, 'frequency': m.frequency,
            'duration': m.duration, 'instructions': m.instructions
        } for m in prescription.medicines.all()]
        prescriptions_list.append({
            'id': prescription.id,
            'prescriptionNumber': prescription.prescription_number,
            'patientName': prescription.patient.user.get_full_name() or prescription.patient.user.username,
            'patientId': prescription.patient.patient_id,
            'date': prescription.prescribed_date.isoformat(),
            'status': prescription.status,
            'diagnosis': prescription.diagnosis,
            'medicines': medicines_data,
            'notes': prescription.notes or '',
            'validUntil': prescription.valid_until.isoformat()
        })
    
    stats = {
        'total': Prescription.objects.filter(doctor=profile).count(),
        'active': Prescription.objects.filter(doctor=profile, status='active').count(),
        'completed': Prescription.objects.filter(doctor=profile, status='completed').count(),
        'expired': Prescription.objects.filter(doctor=profile, status='expired').count(),
    }
    
    return JsonResponse({'prescriptions': prescriptions_list, 'stats': stats})


@login_required
def get_doctor_patients_list(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    from patients.models import PatientProfile
    patient_ids = Appointment.objects.filter(doctor=profile).values_list('patient_id', flat=True).distinct()
    patients = PatientProfile.objects.filter(id__in=patient_ids).select_related('user')
    
    return JsonResponse({'patients': [{
        'id': p.id,
        'patient_id': p.patient_id,
        'name': p.user.get_full_name() or p.user.username,
        'display': f"{p.user.get_full_name() or p.user.username} ({p.patient_id})"
    } for p in patients]})


@login_required
@csrf_protect
@require_http_methods(["POST"])
def create_prescription(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    try:
        data = json.loads(request.body)
        patient_id = data.get('patient_id')
        diagnosis = data.get('diagnosis')
        medicines = data.get('medicines', [])
        notes = data.get('notes', '')
        valid_until = data.get('valid_until')
        
        if not all([patient_id, diagnosis, medicines, valid_until]):
            return JsonResponse({"error": "All required fields must be provided"}, status=400)
        
        from patients.models import PatientProfile
        try:
            patient = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return JsonResponse({"error": "Patient not found"}, status=404)
        
        try:
            valid_until_date = timezone.datetime.strptime(valid_until, '%Y-%m-%d').date()
        except:
            return JsonResponse({"error": "Invalid date format for valid_until"}, status=400)
        
        prescription = Prescription.objects.create(
            patient=patient, doctor=profile, diagnosis=diagnosis,
            notes=notes, valid_until=valid_until_date, status='active'
        )
        
        for med in medicines:
            PrescribedMedicine.objects.create(
                prescription=prescription, medicine_name=med.get('name'),
                dosage=med.get('dosage'), frequency=med.get('frequency'),
                duration=med.get('duration'), instructions=med.get('instructions', '')
            )
        
        return JsonResponse({
            "success": True, "message": "Prescription created successfully",
            "prescription_id": prescription.id, "prescription_number": prescription.prescription_number
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def get_doctor_lab_reports(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    from staff.models import LabReport
    category_filter = request.GET.get('category', 'all')
    status_filter = request.GET.get('status', 'all')
    search_query = request.GET.get('search', '').strip()
    
    patient_ids = Appointment.objects.filter(doctor=profile).values_list('patient_id', flat=True).distinct()
    lab_reports = LabReport.objects.filter(patient_id__in=patient_ids).select_related('patient__user', 'uploaded_by')
    
    if category_filter != 'all':
        lab_reports = lab_reports.filter(category=category_filter)
    if status_filter != 'all':
        lab_reports = lab_reports.filter(status=status_filter)
    if search_query:
        lab_reports = lab_reports.filter(
            Q(report_number__icontains=search_query) |
            Q(patient__user__first_name__icontains=search_query) |
            Q(patient__user__last_name__icontains=search_query) |
            Q(patient__patient_id__icontains=search_query) |
            Q(test_name__icontains=search_query)
        )
    
    reports_list = []
    for report in lab_reports:
        uploader_name = 'Lab Staff'
        if report.uploaded_by:
            uploader_name = f"Lab Staff - {report.uploaded_by.user.get_full_name() or report.uploaded_by.user.username}"
        has_file = bool(report.report_file)
        reports_list.append({
            'id': report.id,
            'reportNumber': report.report_number,
            'patientName': report.patient.user.get_full_name() or report.patient.user.username,
            'patientId': report.patient.patient_id,
            'testName': report.test_name,
            'category': report.get_category_display_name(),
            'date': report.test_date.isoformat(),
            'uploadedBy': uploader_name,
            'uploadedDate': report.created_at.strftime('%B %d, %Y'),
            'status': report.status,
            'findings': report.findings or '',
            'notes': report.notes or '',
            'hasFile': has_file,
            'fileUrl': request.build_absolute_uri(report.report_file.url) if has_file else None,
        })
    
    return JsonResponse({
        'reports': reports_list,
        'stats': {
            'total': LabReport.objects.filter(patient_id__in=patient_ids).count(),
            'normal': LabReport.objects.filter(patient_id__in=patient_ids, status='normal').count(),
            'abnormal': LabReport.objects.filter(patient_id__in=patient_ids, status='abnormal').count(),
            'critical': LabReport.objects.filter(patient_id__in=patient_ids, status='critical').count(),
        }
    })


@login_required
def get_doctor_consultations(request):
    """
    Get consultation history — handles own + shared filter
    """
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)

    type_filter = request.GET.get('type', 'all')
    search_query = request.GET.get('search', '').strip()
    consultations_list = []

    if type_filter == 'Shared':
        # ✅ Return consultations shared WITH this doctor
        shared_records = SharedConsultation.objects.filter(
            shared_with=profile
        ).select_related(
            'consultation__patient__user',
            'consultation__doctor__user',
            'shared_by__user'
        ).order_by('-shared_at')

        if search_query:
            shared_records = shared_records.filter(
                Q(consultation__patient__user__first_name__icontains=search_query) |
                Q(consultation__patient__user__last_name__icontains=search_query) |
                Q(consultation__patient__patient_id__icontains=search_query) |
                Q(consultation__diagnosis__icontains=search_query) |
                Q(consultation__consultation_number__icontains=search_query)
            )

        # Evaluate queryset into list first, then mark as read
        shared_records_list = list(shared_records)
        SharedConsultation.objects.filter(
            shared_with=profile, is_read=False
        ).update(is_read=True)

        for record in shared_records_list:
            c = record.consultation
            vital_signs = {}
            if c.blood_pressure: vital_signs['bloodPressure'] = c.blood_pressure
            if c.heart_rate:     vital_signs['heartRate']     = c.heart_rate
            if c.temperature:    vital_signs['temperature']   = c.temperature
            if c.weight:         vital_signs['weight']        = c.weight
            if c.height:         vital_signs['height']        = c.height

            sharer_name = record.shared_by.user.get_full_name() or record.shared_by.user.username

            consultations_list.append({
                'id': c.id,
                'consultationNumber': c.consultation_number,
                'patientName': c.patient.user.get_full_name() or c.patient.user.username,
                'patientId': c.patient.patient_id,
                'age': c.patient.age or 'N/A',
                'gender': c.patient.get_gender_display_short() or 'N/A',
                'date': c.consultation_date.isoformat(),
                'time': c.consultation_time.strftime('%I:%M %p'),
                'type': c.get_consultation_type_display(),
                'chiefComplaint': c.chief_complaint,
                'diagnosis': c.diagnosis,
                'symptoms': c.get_symptoms_list(),
                'vitalSigns': vital_signs,
                'examination': c.examination_findings or '',
                'treatmentPlan': c.treatment_plan,
                'prescriptionIssued': 'Yes' if c.prescription_issued else 'No',
                'followUpDate': c.follow_up_date.isoformat() if c.follow_up_date else None,
                'notes': c.notes or '',
                # ✅ Shared metadata
                'isShared': True,
                'sharedBy': f"Dr. {sharer_name}",
                'sharedBySpecialty': record.shared_by.get_specialty_display(),
                'sharedAt': record.shared_at.strftime('%b %d, %Y'),
                'sharedMessage': record.message or '',
            })

    else:
        # Own consultations
        consultations = ConsultationHistory.objects.filter(
            doctor=profile
        ).select_related('patient__user', 'appointment')

        if type_filter == 'New Visit':
            consultations = consultations.filter(consultation_type='new_visit')
        elif type_filter == 'Follow-up':
            consultations = consultations.filter(consultation_type='follow_up')

        if search_query:
            consultations = consultations.filter(
                Q(consultation_number__icontains=search_query) |
                Q(patient__user__first_name__icontains=search_query) |
                Q(patient__user__last_name__icontains=search_query) |
                Q(patient__patient_id__icontains=search_query) |
                Q(diagnosis__icontains=search_query)
            )

        for consultation in consultations:
            vital_signs = {}
            if consultation.blood_pressure: vital_signs['bloodPressure'] = consultation.blood_pressure
            if consultation.heart_rate:     vital_signs['heartRate']     = consultation.heart_rate
            if consultation.temperature:    vital_signs['temperature']   = consultation.temperature
            if consultation.weight:         vital_signs['weight']        = consultation.weight
            if consultation.height:         vital_signs['height']        = consultation.height

            consultations_list.append({
                'id': consultation.id,
                'consultationNumber': consultation.consultation_number,
                'patientName': consultation.patient.user.get_full_name() or consultation.patient.user.username,
                'patientId': consultation.patient.patient_id,
                'age': consultation.patient.age or 'N/A',
                'gender': consultation.patient.get_gender_display_short() or 'N/A',
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
                'notes': consultation.notes or '',
                'isShared': False,
                'sharedBy': None,
                'sharedBySpecialty': None,
                'sharedAt': None,
                'sharedMessage': '',
            })

    # Stats always based on own consultations
    total = ConsultationHistory.objects.filter(doctor=profile).count()
    week_ago = timezone.now().date() - timedelta(days=7)
    this_week = ConsultationHistory.objects.filter(doctor=profile, consultation_date__gte=week_ago).count()
    follow_ups = ConsultationHistory.objects.filter(doctor=profile, consultation_type='follow_up').count()
    new_visits = ConsultationHistory.objects.filter(doctor=profile, consultation_type='new_visit').count()
    shared_count = SharedConsultation.objects.filter(shared_with=profile).count()

    return JsonResponse({
        'consultations': consultations_list,
        'stats': {
            'total': total,
            'this_week': this_week,
            'follow_ups': follow_ups,
            'new_visits': new_visits,
            'shared': shared_count,
        }
    })


@login_required
@csrf_protect
@require_http_methods(["POST"])
def create_consultation(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    try:
        data = json.loads(request.body)
        patient_id = data.get('patient_id')
        consultation_type = data.get('consultation_type')
        chief_complaint = data.get('chief_complaint')
        diagnosis = data.get('diagnosis')
        examination = data.get('examination')
        treatment_plan = data.get('treatment_plan')
        
        if not all([patient_id, consultation_type, chief_complaint, diagnosis, examination, treatment_plan]):
            return JsonResponse({"error": "All required fields must be provided"}, status=400)
        
        from patients.models import PatientProfile
        try:
            patient = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return JsonResponse({"error": "Patient not found"}, status=404)
        
        type_map = {'New Visit': 'new_visit', 'Follow-up': 'follow_up', 'Emergency': 'emergency', 'Routine Checkup': 'routine_checkup'}
        
        follow_up_date_obj = None
        follow_up_date = data.get('follow_up_date')
        if follow_up_date:
            try:
                follow_up_date_obj = timezone.datetime.strptime(follow_up_date, '%Y-%m-%d').date()
            except:
                pass
        
        latest_appointment = Appointment.objects.filter(
            patient=patient, doctor=profile
        ).order_by('-appointment_date', '-appointment_time').first()
        
        consultation = ConsultationHistory.objects.create(
            appointment=latest_appointment,
            patient=patient,
            doctor=profile,
            consultation_date=timezone.now().date(),
            consultation_time=timezone.now().time(),
            consultation_type=type_map.get(consultation_type, 'new_visit'),
            chief_complaint=chief_complaint,
            diagnosis=diagnosis,
            symptoms=data.get('symptoms', ''),
            blood_pressure=data.get('blood_pressure', ''),
            heart_rate=data.get('heart_rate', ''),
            temperature=data.get('temperature', ''),
            weight=data.get('weight', ''),
            height=data.get('height', ''),
            examination_findings=examination,
            treatment_plan=treatment_plan,
            prescription_issued=data.get('prescription_issued', False) == 'Yes',
            follow_up_date=follow_up_date_obj,
            notes=data.get('notes', '')
        )
        
        return JsonResponse({
            "success": True, "message": "Consultation note created successfully",
            "consultation_id": consultation.id, "consultation_number": consultation.consultation_number
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ✅ NEW: Get list of all other doctors for share modal
@login_required
def get_doctors_list_for_share(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)

    doctors = DoctorProfile.objects.filter(
        is_active=True
    ).exclude(id=profile.id).select_related('user')

    doctors_list = []
    for doctor in doctors:
        full_name = doctor.user.get_full_name() or doctor.user.username
        photo_url = request.build_absolute_uri(doctor.profile_photo.url) if doctor.profile_photo else None
        doctors_list.append({
            'id': doctor.id,
            'name': f"Dr. {full_name}",
            'specialty': doctor.get_specialty_display(),
            'doctorId': doctor.doctor_id,
            'department': doctor.department or '',
            'photoUrl': photo_url,
        })

    return JsonResponse({'doctors': doctors_list})


# ✅ NEW: Share a consultation with another doctor
@login_required
@csrf_protect
@require_http_methods(["POST"])
def share_consultation(request, consultation_id):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)

    try:
        consultation = ConsultationHistory.objects.get(id=consultation_id, doctor=profile)
    except ConsultationHistory.DoesNotExist:
        return JsonResponse({"error": "Consultation not found"}, status=404)

    try:
        data = json.loads(request.body)
        target_doctor_id = data.get('doctor_id')
        message = data.get('message', '').strip()

        if not target_doctor_id:
            return JsonResponse({"error": "Target doctor is required"}, status=400)

        try:
            target_doctor = DoctorProfile.objects.get(id=target_doctor_id)
        except DoctorProfile.DoesNotExist:
            return JsonResponse({"error": "Target doctor not found"}, status=404)

        if target_doctor.id == profile.id:
            return JsonResponse({"error": "Cannot share with yourself"}, status=400)

        shared, created = SharedConsultation.objects.get_or_create(
            consultation=consultation,
            shared_by=profile,
            shared_with=target_doctor,
            defaults={'message': message}
        )

        if not created:
            return JsonResponse({"error": "Already shared with this doctor"}, status=400)

        target_name = target_doctor.user.get_full_name() or target_doctor.user.username
        return JsonResponse({
            "success": True,
            "message": f"Consultation shared with Dr. {target_name} successfully"
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def get_doctor_schedule(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    selected_date = request.GET.get('date', timezone.now().date().isoformat())
    try:
        selected_date_obj = timezone.datetime.strptime(selected_date, '%Y-%m-%d').date()
    except:
        selected_date_obj = timezone.now().date()
    
    weekly_schedule = {}
    days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    days_map = {'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday'}
    
    for day in days_order:
        weekly_schedule[day] = {'available': False, 'slots': []}
    
    for schedule in DoctorSchedule.objects.filter(doctor=profile, is_active=True):
        day_name = days_map.get(schedule.day_of_week, schedule.day_of_week.capitalize())
        weekly_schedule[day_name]['available'] = True
        weekly_schedule[day_name]['slots'].append({
            'id': schedule.id,
            'startTime': schedule.start_time.strftime('%H:%M'),
            'endTime': schedule.end_time.strftime('%H:%M'),
            'type': schedule.slot_type
        })
    
    todays_appointments = Appointment.objects.filter(
        doctor=profile, appointment_date=selected_date_obj
    ).select_related('patient__user').order_by('appointment_time')
    
    appointments_list = [{
        'id': apt.id,
        'patientName': apt.patient.user.get_full_name() or apt.patient.user.username,
        'patientId': apt.patient.patient_id,
        'time': apt.appointment_time.strftime('%I:%M %p'),
        'duration': '15 min',
        'type': apt.get_appointment_type_display(),
        'status': apt.status
    } for apt in todays_appointments]
    
    working_days = sum(1 for day in weekly_schedule.values() if day['available'])
    week_start = selected_date_obj - timedelta(days=selected_date_obj.weekday())
    week_end = week_start + timedelta(days=6)
    this_week_count = Appointment.objects.filter(
        doctor=profile, appointment_date__gte=week_start, appointment_date__lte=week_end
    ).count()
    
    return JsonResponse({
        'weekly_schedule': weekly_schedule,
        'todays_appointments': appointments_list,
        'stats': {'working_days': working_days, 'todays_appointments': len(appointments_list), 'this_week': this_week_count}
    })


@login_required
@csrf_protect
@require_http_methods(["POST"])
def add_time_slot(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    try:
        data = json.loads(request.body)
        day = data.get('day')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        slot_type = data.get('slot_type', 'consultation')
        if not all([day, start_time, end_time]):
            return JsonResponse({"error": "All fields are required"}, status=400)
        day_map = {'Monday': 'monday', 'Tuesday': 'tuesday', 'Wednesday': 'wednesday', 'Thursday': 'thursday', 'Friday': 'friday', 'Saturday': 'saturday', 'Sunday': 'sunday'}
        schedule = DoctorSchedule.objects.create(
            doctor=profile, day_of_week=day_map.get(day, day.lower()),
            start_time=start_time, end_time=end_time, slot_type=slot_type, is_active=True
        )
        return JsonResponse({"success": True, "message": "Time slot added successfully", "slot_id": schedule.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_protect
@require_http_methods(["POST"])
def toggle_day_availability(request, day):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    try:
        day_map = {
            'Monday': 'monday', 'Tuesday': 'tuesday', 'Wednesday': 'wednesday', 
            'Thursday': 'thursday', 'Friday': 'friday', 'Saturday': 'saturday', 
            'Sunday': 'sunday'
        }
        day_code = day_map.get(day, day.lower())
        
        slots = DoctorSchedule.objects.filter(doctor=profile, day_of_week=day_code)
        
        if slots.exists():
            current_status = slots.first().is_active
            new_status = not current_status
            
            # ✅ FIX: Loop through each slot and call save() individually
            # This triggers the custom save() method logic
            for slot in slots:
                slot.is_active = new_status
                slot.save()  # ← This calls our custom logic!
        else:
            new_status = False
        
        return JsonResponse({
            "success": True, 
            "is_active": new_status, 
            "message": f"{day} availability updated"
        })
        
    except Exception as e:
        import traceback
        print(f"Error in toggle_day_availability: {e}")
        print(traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_protect
@require_http_methods(["DELETE"])
def delete_time_slot(request, slot_id):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    try:
        slot = DoctorSchedule.objects.get(id=slot_id, doctor=profile)
        slot.delete()
        return JsonResponse({"success": True, "message": "Time slot deleted successfully"})
    except DoctorSchedule.DoesNotExist:
        return JsonResponse({"error": "Time slot not found"}, status=404)


@login_required
def get_doctor_profile(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    
    photo_url = request.build_absolute_uri(profile.profile_photo.url) if profile.profile_photo else None
    member_since = profile.created_at.strftime('%B %Y')
    last_updated = 'Today' if profile.updated_at.date() == timezone.now().date() else profile.updated_at.strftime('%B %d, %Y')
    
    return JsonResponse({
        'firstName': request.user.first_name or '',
        'lastName': request.user.last_name or '',
        'email': request.user.email,
        'phone': profile.phone_number or '',
        'specialty': profile.get_specialty_display(),
        'specialtyCode': profile.specialization,
        'subSpecialty': profile.sub_specialty or '',
        'licenseNumber': profile.license_number or '',
        'yearsOfExperience': str(profile.experience_years) if profile.experience_years else '',
        'roomLocation': profile.room_location or '',
        'department': profile.department or '',
        'education': profile.education or '',
        'certification': profile.certification or '',
        'languages': profile.languages or '',
        'hospitalName': profile.hospital_name or '',
        'availableHours': profile.available_hours or '',
        'doctorId': profile.doctor_id,
        'memberSince': member_since,
        'lastUpdated': last_updated,
        'photoUrl': photo_url,
    })


@login_required
@csrf_protect
@require_http_methods(["POST"])
def update_doctor_profile(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    try:
        data = json.loads(request.body)
        request.user.first_name = data.get('firstName', '')
        request.user.last_name = data.get('lastName', '')
        request.user.email = data.get('email', '')
        request.user.save()
        specialty_code = data.get('specialtyCode')
        if specialty_code:
            profile.specialization = specialty_code
        profile.phone_number = data.get('phone', '')
        profile.sub_specialty = data.get('subSpecialty', '')
        profile.license_number = data.get('licenseNumber', '')
        years = data.get('yearsOfExperience', '')
        if years:
            try:
                profile.experience_years = int(years)
            except:
                pass
        profile.room_location = data.get('roomLocation', '')
        profile.department = data.get('department', '')
        profile.education = data.get('education', '')
        profile.certification = data.get('certification', '')
        profile.languages = data.get('languages', '')
        profile.hospital_name = data.get('hospitalName', '')
        profile.available_hours = data.get('availableHours', '')
        profile.save()
        return JsonResponse({"success": True, "message": "Profile updated successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_protect
@require_http_methods(["POST"])
def upload_doctor_photo(request):
    try:
        profile = request.user.doctorprofile
    except DoctorProfile.DoesNotExist:
        return JsonResponse({"error": "Doctor profile not found"}, status=404)
    if 'photo' not in request.FILES:
        return JsonResponse({"error": "No photo file provided"}, status=400)
    photo = request.FILES['photo']
    if photo.size > 5 * 1024 * 1024:
        return JsonResponse({"error": "File size must be less than 5MB"}, status=400)
    if photo.content_type not in ['image/jpeg', 'image/png', 'image/gif']:
        return JsonResponse({"error": "Only JPEG, PNG, and GIF images are allowed"}, status=400)
    if profile.profile_photo:
        profile.profile_photo.delete()
    profile.profile_photo = photo
    profile.save()
    return JsonResponse({
        "success": True, "message": "Photo uploaded successfully",
        "photo_url": request.build_absolute_uri(profile.profile_photo.url)
    })




