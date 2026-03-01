from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.utils import timezone
from .models import StaffProfile, LabReport, TestSection, LabReportParameter, LabReportAttachment
from patients.models import PatientProfile
from doctors.models import DoctorProfile
import json as _json
from datetime import datetime
from .email_notifications import send_lab_report_email


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
    critical_reports = LabReport.objects.filter(uploaded_by=profile, overall_status='critical').count()

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
            "test_name":     "Multiple Tests",
            "category":      "Various",
            "doctor":        doctor_name or "—",
            "status":        r.overall_status,
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
        if request.content_type and 'multipart' in request.content_type:
            patient_id = request.POST.get('patient_id')
            doctor_id = request.POST.get('doctor_id')
            test_date = request.POST.get('test_date')
            is_completed = request.POST.get('is_completed', 'false').lower() == 'true'
            notes = request.POST.get('notes', '')
            test_sections_json = request.POST.get('test_sections', '[]')
            # ✅ CHANGED: Get multiple files
            report_files = request.FILES.getlist('report_files')
            report_images = request.FILES.getlist('report_images')
        else:
            data = _json.loads(request.body)
            patient_id = data.get('patient_id')
            doctor_id = data.get('doctor_id')
            test_date = data.get('test_date')
            is_completed = data.get('is_completed', False)
            notes = data.get('notes', '')
            test_sections_json = _json.dumps(data.get('test_sections', []))
            report_files = []
            report_images = []

        if not all([patient_id, test_date]):
            return JsonResponse({"error": "Patient and test date are required"}, status=400)

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
            return JsonResponse({"error": "Invalid date format"}, status=400)

        # Parse test sections
        test_sections = _json.loads(test_sections_json)
        
        if not test_sections:
            return JsonResponse({"error": "At least one test section is required"}, status=400)

        # Create LabReport (keep old fields for backwards compatibility)
        report = LabReport.objects.create(
            patient=patient,
            doctor=doctor,
            uploaded_by=profile,
            test_date=test_date_obj,
            is_completed=is_completed,
            notes=notes,
        )

        # ✅ NEW: Save multiple documents
        for file in report_files:
            LabReportAttachment.objects.create(
                report=report,
                file=file,
                attachment_type='document'
            )

        # ✅ NEW: Save multiple images
        for image in report_images:
            LabReportAttachment.objects.create(
                report=report,
                file=image,
                attachment_type='image'
            )

        # Create test sections and parameters
        for section_data in test_sections:
            test_name_choice = section_data.get('test_name_choice', '')
            custom_test_name = section_data.get('custom_test_name', '')
            category = section_data.get('category', 'other').lower()
            status = section_data.get('status', 'normal').lower()
            findings = section_data.get('findings', '')
            parameters = section_data.get('parameters', [])

            # Validate status
            status_map = {'normal': 'normal', 'abnormal': 'abnormal', 'critical': 'critical'}
            status = status_map.get(status, 'normal')

            # Validate category
            category_map = {
                'hematology': 'hematology', 'biochemistry': 'biochemistry',
                'endocrinology': 'endocrinology', 'microbiology': 'microbiology',
                'radiology': 'radiology', 'other': 'other',
            }
            category = category_map.get(category, 'other')

            # Create TestSection
            test_section = TestSection.objects.create(
                report=report,
                test_name_choice=test_name_choice if test_name_choice != 'Other' else None,
                custom_test_name=custom_test_name if test_name_choice == 'Other' or not test_name_choice else None,
                category=category,
                status=status,
                findings=findings,
            )

            # Create parameters for this test section
            for param in parameters:
                name = param.get('name', '').strip()
                if name:
                    LabReportParameter.objects.create(
                        test_section=test_section,
                        name=name,
                        value=param.get('value', ''),
                        unit=param.get('unit', ''),
                        normal_range=param.get('normalRange', ''),
                        status=param.get('status', 'Normal'),
                    )

        # Calculate and update overall status
        report.update_overall_status()

        #Send email if report is completed
        if report.is_completed:
            send_lab_report_email(report)

        return JsonResponse({
            "success": True,
            "message": "Lab report uploaded successfully",
            "report_number": report.report_number,
            "report_id": report.id,
        })

    except Exception as e:
        import traceback
        print(f"Error uploading lab report: {e}")
        print(traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────
# Get lab reports list — paginated, filtered
# ─────────────────────────────────────────────
@login_required
def get_staff_lab_reports(request):
    profile, error = get_staff_profile(request)
    if error:
        return error

    search       = request.GET.get('search', '').strip()
    filter_by    = request.GET.get('filter', 'All')
    page         = int(request.GET.get('page', 1))
    per_page     = 10

    reports = LabReport.objects.filter(
        uploaded_by=profile
    ).select_related('patient__user', 'doctor__user').prefetch_related('attachments').order_by('-created_at')

    # Search
    if search:
        from django.db.models import Q
        reports = reports.filter(
            Q(patient__user__first_name__icontains=search) |
            Q(patient__user__last_name__icontains=search)  |
            Q(report_number__icontains=search)             |
            Q(doctor__user__first_name__icontains=search)  |
            Q(doctor__user__last_name__icontains=search)
        )

    # Filter
    if filter_by == 'Normal':
        reports = reports.filter(overall_status='normal')
    elif filter_by == 'Abnormal':
        reports = reports.filter(overall_status='abnormal')
    elif filter_by == 'Critical':
        reports = reports.filter(overall_status='critical')
    elif filter_by == 'Completed':
        reports = reports.filter(is_completed=True)
    elif filter_by == 'Pending':
        reports = reports.filter(is_completed=False)

    # Stats
    all_mine = LabReport.objects.filter(uploaded_by=profile)
    stats = {
        'total':     all_mine.count(),
        'normal':    all_mine.filter(overall_status='normal').count(),
        'abnormal':  all_mine.filter(overall_status='abnormal').count(),
        'critical':  all_mine.filter(overall_status='critical').count(),
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

        # Get test sections and their parameters
        test_sections_data = []
        for section in r.test_sections.all():
            params = []
            for p in section.parameters.all():
                params.append({
                    'name':        p.name,
                    'value':       p.value,
                    'unit':        p.unit,
                    'normalRange': p.normal_range,
                    'status':      p.status,
                })
            
            test_sections_data.append({
                'test_name': section.get_test_name(),
                'category': section.get_category_display_name(),
                'status': section.status,
                'findings': section.findings or '',
                'parameters': params,
            })

        # ✅ NEW: Get attachments
        attachments_data = []
        for attachment in r.attachments.all():
            attachments_data.append({
                'id': attachment.id,
                'type': attachment.attachment_type,
                'url': request.build_absolute_uri(attachment.file.url) if attachment.file else None,
                'filename': attachment.file.name.split('/')[-1] if attachment.file else None,
            })

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
            'test_date_raw':    r.test_date.strftime('%Y-%m-%d'),
            'status':           r.overall_status,
            'date':             time_label,
            'notes':            r.notes or '',
            'test_sections':    test_sections_data,
            'attachments':      attachments_data,  # ✅ NEW
            # Keep old fields for backwards compatibility
            'file_url':         request.build_absolute_uri(r.report_file.url) if r.report_file else None,
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
        if request.content_type and 'multipart' in request.content_type:
            patient_id = request.POST.get('patient_id')
            doctor_id = request.POST.get('doctor_id')
            test_date = request.POST.get('test_date')
            is_completed = request.POST.get('is_completed', 'false').lower() == 'true'
            notes = request.POST.get('notes', '')
            test_sections_json = request.POST.get('test_sections', '[]')
            # ✅ NEW: Get multiple files
            new_files = request.FILES.getlist('report_files')
            new_images = request.FILES.getlist('report_images')
        else:
            data = _json.loads(request.body)
            patient_id = data.get('patient_id')
            doctor_id = data.get('doctor_id')
            test_date = data.get('test_date')
            is_completed = data.get('is_completed', False)
            notes = data.get('notes', '')
            test_sections_json = _json.dumps(data.get('test_sections', []))
            new_files = []
            new_images = []

        # Check if report is completed (only allow toggling completion status)
        was_completed = report.is_completed
        if was_completed and not is_completed:
            # Allow marking as pending
            pass
        elif was_completed and is_completed:
            # Completed report, don't allow any other changes
            return JsonResponse({"error": "Cannot edit completed reports. Please mark as pending first."}, status=400)

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
        if test_date:
            try:
                report.test_date = datetime.strptime(test_date, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({"error": "Invalid date format"}, status=400)

        report.is_completed = is_completed
        report.notes = notes
        report.save()

        # ✅ NEW: Add new attachments
        for file in new_files:
            LabReportAttachment.objects.create(
                report=report,
                file=file,
                attachment_type='document'
            )

        for image in new_images:
            LabReportAttachment.objects.create(
                report=report,
                file=image,
                attachment_type='image'
            )

        # DELETE OLD TEST SECTIONS (will cascade delete parameters)
        report.test_sections.all().delete()

        # CREATE NEW TEST SECTIONS
        test_sections = _json.loads(test_sections_json)
        
        if not test_sections:
            return JsonResponse({"error": "At least one test section is required"}, status=400)

        for section_data in test_sections:
            test_name_choice = section_data.get('test_name_choice', '')
            custom_test_name = section_data.get('custom_test_name', '')
            category = section_data.get('category', 'other').lower()
            status = section_data.get('status', 'normal').lower()
            findings = section_data.get('findings', '')
            parameters = section_data.get('parameters', [])

            # Validate status
            status_map = {'normal': 'normal', 'abnormal': 'abnormal', 'critical': 'critical'}
            status = status_map.get(status, 'normal')

            # Validate category
            category_map = {
                'hematology': 'hematology', 'biochemistry': 'biochemistry',
                'endocrinology': 'endocrinology', 'microbiology': 'microbiology',
                'radiology': 'radiology', 'other': 'other',
            }
            category = category_map.get(category, 'other')

            # Create TestSection
            test_section = TestSection.objects.create(
                report=report,
                test_name_choice=test_name_choice if test_name_choice != 'Other' else None,
                custom_test_name=custom_test_name if test_name_choice == 'Other' or not test_name_choice else None,
                category=category,
                status=status,
                findings=findings,
            )

            # Create parameters for this test section
            for param in parameters:
                name = param.get('name', '').strip()
                if name:
                    LabReportParameter.objects.create(
                        test_section=test_section,
                        name=name,
                        value=param.get('value', ''),
                        unit=param.get('unit', ''),
                        normal_range=param.get('normalRange', ''),
                        status=param.get('status', 'Normal'),
                    )

        # Calculate and update overall status
        report.update_overall_status()

        # (Don't send duplicate if already was completed)
        if report.is_completed and not was_completed:
            send_lab_report_email(report)

        return JsonResponse({
            "success": True,
            "message": "Lab report updated successfully",
            "report_number": report.report_number,
        })

    except Exception as e:
        import traceback
        print(f"Error updating lab report: {e}")
        print(traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=500)


# ✅ NEW: Delete attachment endpoint
@login_required
@csrf_protect
@require_http_methods(["DELETE"])
def delete_attachment(request, attachment_id):
    """Delete a lab report attachment"""
    profile, error = get_staff_profile(request)
    if error:
        return error
    
    try:
        attachment = LabReportAttachment.objects.get(
            id=attachment_id,
            report__uploaded_by=profile
        )
        
        # Check if report is completed
        if attachment.report.is_completed:
            return JsonResponse({"error": "Cannot delete attachments from completed reports"}, status=400)
        
        attachment.delete()  # This will also delete file from disk
        
        return JsonResponse({"success": True, "message": "Attachment deleted successfully"})
    
    except LabReportAttachment.DoesNotExist:
        return JsonResponse({"error": "Attachment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def search_patients(request):
    """Search patients by name (min 2 characters)"""
    _, error = get_staff_profile(request)
    if error:
        return error

    from patients.models import PatientProfile
    from django.db.models import Q

    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({"patients": []})

    # Search by first name, last name, or patient_id
    patients = PatientProfile.objects.filter(
        Q(user__first_name__icontains=query) |
        Q(user__last_name__icontains=query) |
        Q(patient_id__icontains=query),
        is_active=True
    ).select_related('user').order_by('user__first_name', 'user__last_name')[:10]

    return JsonResponse({
        "patients": [{
            "id": p.id,
            "patient_id": p.patient_id,
            "name": p.user.get_full_name() or p.user.username,
            "age": p.age or "N/A",
            "gender": p.get_gender_display_short() if hasattr(p, 'get_gender_display_short') else (p.gender or "N/A"),
        } for p in patients]
    })