from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.utils import timezone

from .models import StaffProfile, LabReport


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────
def get_staff_profile(request):
    try:
        return request.user.staffprofile, None
    except StaffProfile.DoesNotExist:
        return None, JsonResponse({"error": "Staff profile not found"}, status=404)


# ─────────────────────────────────────────────
# Sidebar data
# ─────────────────────────────────────────────
@login_required
def get_staff_sidebar_data(request):
    profile, error = get_staff_profile(request)
    if error:
        return error

    first_name = request.user.first_name or ""
    last_name  = request.user.last_name  or ""

    if first_name and last_name:
        initials = f"{first_name[0]}{last_name[0]}".upper()
    elif first_name:
        initials = first_name[0].upper()
    else:
        initials = request.user.username[0].upper() if request.user.username else "S"

    photo_url = None
    if profile.profile_photo:
        photo_url = request.build_absolute_uri(profile.profile_photo.url)

    return JsonResponse({
        "name":      request.user.get_full_name() or request.user.username,
        "staff_id":  profile.staff_id,
        "role":      "Staff",
        "initials":  initials,
        "photo_url": photo_url,
    })


# ─────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────
@login_required
@csrf_protect
@require_http_methods(["POST"])
def staff_logout(request):
    try:
        logout(request)
        return JsonResponse({"success": True, "message": "Logged out successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e), "success": False}, status=500)


# ─────────────────────────────────────────────
# Overview — stats + last 10 reports (newest first)
# ─────────────────────────────────────────────
@login_required
def get_staff_overview(request):
    profile, error = get_staff_profile(request)
    if error:
        return error

    today    = timezone.now().date()
    week_ago = today - timezone.timedelta(days=7)

    # Stats — scoped to this staff member's uploads
    total_reports    = LabReport.objects.filter(uploaded_by=profile).count()
    today_reports    = LabReport.objects.filter(uploaded_by=profile, created_at__date=today).count()
    week_reports     = LabReport.objects.filter(uploaded_by=profile, created_at__date__gte=week_ago).count()
    critical_reports = LabReport.objects.filter(uploaded_by=profile, status='critical').count()

    # Last 10 reports — newest first (so when a new one is uploaded it pushes oldest out)
    recent_reports = LabReport.objects.filter(
        uploaded_by=profile
    ).select_related(
        'patient__user', 'doctor__user'
    ).order_by('-created_at')[:10]

    reports_list = []
    for r in recent_reports:
        # Patient photo
        patient_photo = None
        if r.patient.profile_photo:
            patient_photo = request.build_absolute_uri(r.patient.profile_photo.url)

        # Patient initials fallback
        patient_name = r.patient.user.get_full_name() or r.patient.user.username
        parts = patient_name.split()
        initials = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else patient_name[0].upper()

        # Doctor name
        doctor_name = None
        if r.doctor:
            doctor_name = f"Dr. {r.doctor.user.get_full_name() or r.doctor.user.username}"

        # Human-readable time
        diff = timezone.now() - r.created_at
        total_mins = int(diff.total_seconds() / 60)
        if total_mins < 1:
            time_label = "Just now"
        elif total_mins < 60:
            time_label = f"{total_mins} min ago"
        elif total_mins < 1440:
            time_label = f"{int(total_mins / 60)} hr ago"
        elif r.created_at.date() == today:
            time_label = f"Today, {r.created_at.strftime('%I:%M %p')}"
        elif r.created_at.date() == today - timezone.timedelta(days=1):
            time_label = "Yesterday"
        else:
            time_label = r.created_at.strftime('%b %d, %Y')

        reports_list.append({
            "id":            r.id,
            "report_number": r.report_number,
            "patient_name":  patient_name,
            "patient_id":    r.patient.patient_id,
            "patient_photo": patient_photo,
            "patient_initials": initials,
            "test_name":     r.test_name,
            "category":      r.get_category_display_name(),
            "doctor":        doctor_name or "—",
            "status":        r.status,           # normal / abnormal / critical
            "date":          time_label,
            "report_number": r.report_number,
        })

    today_str = timezone.now().strftime('%b %d, %Y')

    return JsonResponse({
        "staff_name": request.user.first_name or request.user.get_full_name() or "Staff",
        "stats": {
            "total_reports":    total_reports,
            "today_reports":    today_reports,
            "week_reports":     week_reports,
            "critical_reports": critical_reports,
            "today_date":       today_str,
        },
        "recent_reports": reports_list,
    })


# ─────────────────────────────────────────────
# Patients list — for the patient dropdown
# ─────────────────────────────────────────────
@login_required
def get_patients_for_staff(request):
    _, error = get_staff_profile(request)
    if error:
        return error

    from patients.models import PatientProfile
    patients = PatientProfile.objects.filter(
        is_active=True
    ).select_related('user').order_by('user__first_name', 'user__last_name')

    return JsonResponse({
        "patients": [{
            "id":         p.id,
            "patient_id": p.patient_id,
            "name":       p.user.get_full_name() or p.user.username,
            "age":        p.age or "N/A",
            "gender":     p.get_gender_display_short() if hasattr(p, 'get_gender_display_short') else (p.gender or "N/A"),
        } for p in patients]
    })


# ─────────────────────────────────────────────
# Doctors for a specific patient
# ─────────────────────────────────────────────
@login_required
def get_doctors_for_patient(request, patient_id):
    _, error = get_staff_profile(request)
    if error:
        return error

    from patients.models import PatientProfile
    from doctors.models import Appointment, DoctorProfile

    try:
        patient = PatientProfile.objects.get(id=patient_id)
    except PatientProfile.DoesNotExist:
        return JsonResponse({"error": "Patient not found"}, status=404)

    doctor_ids = Appointment.objects.filter(
        patient=patient
    ).values_list('doctor_id', flat=True).distinct()

    doctors = DoctorProfile.objects.filter(
        id__in=doctor_ids, is_active=True
    ).select_related('user')

    doctors_list = []
    for doc in doctors:
        last_apt = Appointment.objects.filter(
            patient=patient, doctor=doc
        ).order_by('-appointment_date').first()

        photo_url = None
        if doc.profile_photo:
            photo_url = request.build_absolute_uri(doc.profile_photo.url)

        doctors_list.append({
            "id":         doc.id,
            "doctor_id":  doc.doctor_id,
            "name":       f"Dr. {doc.user.get_full_name() or doc.user.username}",
            "specialty":  doc.get_specialty_display(),
            "department": doc.department or "",
            "last_visit": last_apt.appointment_date.strftime('%b %d, %Y') if last_apt else None,
            "photo_url":  photo_url,
        })

    return JsonResponse({"doctors": doctors_list})


# ─────────────────────────────────────────────
# Upload lab report
# ─────────────────────────────────────────────
@login_required
@csrf_protect
@require_http_methods(["POST"])
def upload_lab_report(request):
    profile, error = get_staff_profile(request)
    if error:
        return error

    try:
        from patients.models import PatientProfile
        from doctors.models import DoctorProfile
        from .models import LabReportParameter
        import json as _json
        from datetime import datetime

        if request.content_type and 'multipart' in request.content_type:
            patient_id     = request.POST.get('patient_id')
            doctor_id      = request.POST.get('doctor_id')
            test_name      = request.POST.get('test_name')
            test_date      = request.POST.get('test_date')
            category       = request.POST.get('category', 'other').lower()
            overall_status = request.POST.get('overall_status', 'normal').lower()
            is_completed   = request.POST.get('is_completed', 'false').lower() == 'true'
            notes          = request.POST.get('notes', '')
            parameters     = _json.loads(request.POST.get('parameters', '[]'))
            report_file    = request.FILES.get('report_file')
            report_image   = request.FILES.get('report_image')
        else:
            data           = _json.loads(request.body)
            patient_id     = data.get('patient_id')
            doctor_id      = data.get('doctor_id')
            test_name      = data.get('test_name')
            test_date      = data.get('test_date')
            category       = data.get('category', 'other').lower()
            overall_status = data.get('overall_status', 'normal').lower()
            is_completed   = data.get('is_completed', False)
            notes          = data.get('notes', '')
            parameters     = data.get('parameters', [])
            report_file    = None
            report_image   = None

        if not all([patient_id, test_name, test_date, category]):
            return JsonResponse({"error": "Patient, test name, date and category are required"}, status=400)

        try:
            patient = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return JsonResponse({"error": "Patient not found"}, status=404)

        doctor = None
        if doctor_id:
            try:
                doctor = DoctorProfile.objects.get(id=doctor_id)
            except DoctorProfile.DoesNotExist:
                pass

        try:
            test_date_obj = datetime.strptime(test_date, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

        status_map = {
            'normal': 'normal', 'abnormal': 'abnormal', 'critical': 'critical',
        }
        overall_status = status_map.get(overall_status, 'normal')

        category_map = {
            'hematology': 'hematology', 'biochemistry': 'biochemistry',
            'endocrinology': 'endocrinology', 'microbiology': 'microbiology',
            'radiology': 'radiology', 'immunology': 'other',
            'pathology': 'other', 'other': 'other',
        }
        category = category_map.get(category, 'other')

        report = LabReport.objects.create(
            patient=patient,
            doctor=doctor,
            uploaded_by=profile,
            test_name=test_name,
            test_date=test_date_obj,
            category=category,
            status=overall_status,
            is_completed=is_completed,
            notes=notes,
            report_file=report_file,
            report_image=report_image,
        )

        for param in parameters:
            name = param.get('name', '').strip()
            if name:
                LabReportParameter.objects.create(
                    report=report,
                    name=name,
                    value=param.get('value', ''),
                    unit=param.get('unit', ''),
                    normal_range=param.get('normalRange', ''),
                    status=param.get('status', 'Normal'),
                )

        return JsonResponse({
            "success":       True,
            "message":       "Lab report uploaded successfully",
            "report_number": report.report_number,
            "report_id":     report.id,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────
# Get lab reports list — paginated, filtered
# ─────────────────────────────────────────────
@login_required
def get_staff_lab_reports(request):
    profile, error = get_staff_profile(request)
    if error:
        return error

    from .models import LabReportParameter

    search       = request.GET.get('search', '').strip()
    filter_by    = request.GET.get('filter', 'All')
    page         = int(request.GET.get('page', 1))
    per_page     = 10

    reports = LabReport.objects.filter(
        uploaded_by=profile
    ).select_related('patient__user', 'doctor__user').order_by('-created_at')

    # Search
    if search:
        from django.db.models import Q
        reports = reports.filter(
            Q(patient__user__first_name__icontains=search) |
            Q(patient__user__last_name__icontains=search)  |
            Q(report_number__icontains=search)             |
            Q(test_name__icontains=search)                 |
            Q(doctor__user__first_name__icontains=search)  |
            Q(doctor__user__last_name__icontains=search)
        )

    # Filter
    if filter_by == 'Normal':
        reports = reports.filter(status='normal')
    elif filter_by == 'Abnormal':
        reports = reports.filter(status='abnormal')
    elif filter_by == 'Critical':
        reports = reports.filter(status='critical')
    elif filter_by == 'Completed':
        reports = reports.filter(is_completed=True)
    elif filter_by == 'Pending':
        reports = reports.filter(is_completed=False)

    # Stats — always from full uploaded set (not filtered)
    all_mine = LabReport.objects.filter(uploaded_by=profile)
    stats = {
        'total':     all_mine.count(),
        'normal':    all_mine.filter(status='normal').count(),
        'abnormal':  all_mine.filter(status='abnormal').count(),
        'critical':  all_mine.filter(status='critical').count(),
        'completed': all_mine.filter(is_completed=True).count(),
        'pending':   all_mine.filter(is_completed=False).count(),
    }

    total_count = reports.count()
    total_pages = max(1, (total_count + per_page - 1) // per_page)
    page        = max(1, min(page, total_pages))
    reports     = reports[(page - 1) * per_page: page * per_page]

    reports_list = []
    for r in reports:
        patient_name = r.patient.user.get_full_name() or r.patient.user.username
        parts    = patient_name.split()
        initials = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else patient_name[0].upper()

        patient_photo = None
        if r.patient.profile_photo:
            patient_photo = request.build_absolute_uri(r.patient.profile_photo.url)

        doctor_name    = None
        doctor_specialty = None
        if r.doctor:
            doctor_name    = f"Dr. {r.doctor.user.get_full_name() or r.doctor.user.username}"
            doctor_specialty = r.doctor.get_specialty_display()

        # Parameters
        params = []
        for p in r.parameters.all():
            params.append({
                'name':        p.name,
                'value':       p.value,
                'unit':        p.unit,
                'normalRange': p.normal_range,
                'status':      p.status,
            })

        # File download url
        file_url = None
        if r.report_file:
            file_url = request.build_absolute_uri(r.report_file.url)

        # Time label
        diff       = timezone.now() - r.created_at
        total_mins = int(diff.total_seconds() / 60)
        today      = timezone.now().date()
        if total_mins < 1:
            time_label = "Just now"
        elif total_mins < 60:
            time_label = f"{total_mins} min ago"
        elif total_mins < 1440:
            time_label = f"{int(total_mins/60)} hr ago"
        elif r.created_at.date() == today:
            time_label = f"Today, {r.created_at.strftime('%I:%M %p')}"
        elif r.created_at.date() == today - timezone.timedelta(days=1):
            time_label = f"Yesterday, {r.created_at.strftime('%I:%M %p')}"
        else:
            time_label = r.created_at.strftime('%b %d, %Y')

        reports_list.append({
            'id':               r.id,
            'report_number':    r.report_number,
            'patient_name':     patient_name,
            'patient_id':       r.patient.patient_id,
            'patient_db_id':    r.patient.id,
            'patient_photo':    patient_photo,
            'patient_initials': initials,
            'age':              r.patient.age or 'N/A',
            'gender':           r.patient.get_gender_display_short() if hasattr(r.patient, 'get_gender_display_short') else 'N/A',
            'doctor':           doctor_name or '—',
            'doctor_specialty': doctor_specialty or '',
            'doctor_db_id':     r.doctor.id if r.doctor else None,
            'test_name':        r.test_name,
            'test_date_raw':    r.test_date.strftime('%Y-%m-%d'),
            'category':         r.get_category_display_name(),
            'category_raw':     r.category,
            'status':           r.status,
            'date':             time_label,
            'notes':            r.notes or '',
            'parameters':       params,
            'file_url':         file_url,
            'image_url':        request.build_absolute_uri(r.report_image.url) if r.report_image else None,
            'is_completed':     r.is_completed,
        })

    return JsonResponse({
        'reports':     reports_list,
        'stats':       stats,
        'pagination':  {
            'page':        page,
            'total_pages': total_pages,
            'total_count': total_count,
            'per_page':    per_page,
        }
    })


# ─────────────────────────────────────────────
# Edit lab report
# ─────────────────────────────────────────────
@login_required
@csrf_protect
@require_http_methods(["POST"])
def edit_lab_report(request, report_id):
    profile, error = get_staff_profile(request)
    if error:
        return error

    try:
        report = LabReport.objects.get(id=report_id, uploaded_by=profile)
    except LabReport.DoesNotExist:
        return JsonResponse({"error": "Report not found"}, status=404)

    try:
        from patients.models import PatientProfile
        from doctors.models import DoctorProfile
        from .models import LabReportParameter
        import json as _json
        from datetime import datetime

        if request.content_type and 'multipart' in request.content_type:
            patient_id     = request.POST.get('patient_id')
            doctor_id      = request.POST.get('doctor_id')
            test_name      = request.POST.get('test_name')
            test_date      = request.POST.get('test_date')
            category       = request.POST.get('category', 'other').lower()
            overall_status = request.POST.get('overall_status', 'normal').lower()
            is_completed   = request.POST.get('is_completed', 'false').lower() == 'true'
            notes          = request.POST.get('notes', '')
            parameters     = _json.loads(request.POST.get('parameters', '[]'))
            new_file       = request.FILES.get('report_file')
            new_image      = request.FILES.get('report_image')
        else:
            data           = _json.loads(request.body)
            patient_id     = data.get('patient_id')
            doctor_id      = data.get('doctor_id')
            test_name      = data.get('test_name')
            test_date      = data.get('test_date')
            category       = data.get('category', 'other').lower()
            overall_status = data.get('overall_status', 'normal').lower()
            is_completed   = data.get('is_completed', False)
            notes          = data.get('notes', '')
            parameters     = data.get('parameters', [])
            new_file       = None
            new_image      = None

        # Update patient
        if patient_id:
            try:
                report.patient = PatientProfile.objects.get(id=patient_id)
            except PatientProfile.DoesNotExist:
                return JsonResponse({"error": "Patient not found"}, status=404)

        # Update doctor
        if doctor_id:
            try:
                report.doctor = DoctorProfile.objects.get(id=doctor_id)
            except DoctorProfile.DoesNotExist:
                pass
        else:
            report.doctor = None

        # Update fields
        if test_name:
            report.test_name = test_name

        if test_date:
            try:
                report.test_date = datetime.strptime(test_date, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({"error": "Invalid date format"}, status=400)

        category_map = {
            'hematology': 'hematology', 'biochemistry': 'biochemistry',
            'endocrinology': 'endocrinology', 'microbiology': 'microbiology',
            'radiology': 'radiology', 'immunology': 'other',
            'pathology': 'other', 'other': 'other',
        }
        status_map = {'normal': 'normal', 'abnormal': 'abnormal', 'critical': 'critical'}

        report.category     = category_map.get(category, report.category)
        report.status       = status_map.get(overall_status, report.status)
        report.is_completed = is_completed
        report.notes        = notes

        # Replace file only if new one uploaded
        if new_file:
            if report.report_file:
                report.report_file.delete(save=False)
            report.report_file = new_file

        # Replace image only if new one uploaded
        if new_image:
            if report.report_image:
                report.report_image.delete(save=False)
            report.report_image = new_image

        report.save()

        # Replace parameters — delete old, create new
        if parameters:
            report.parameters.all().delete()
            for param in parameters:
                name = param.get('name', '').strip()
                if name:
                    LabReportParameter.objects.create(
                        report=report,
                        name=name,
                        value=param.get('value', ''),
                        unit=param.get('unit', ''),
                        normal_range=param.get('normalRange', ''),
                        status=param.get('status', 'Normal'),
                    )

        return JsonResponse({
            "success":       True,
            "message":       "Lab report updated successfully",
            "report_number": report.report_number,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)