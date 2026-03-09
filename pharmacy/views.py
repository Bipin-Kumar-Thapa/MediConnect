from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.utils import timezone
from django.db.models import Q, F
from datetime import timedelta
from .models import PharmacyProfile, Medicine, MedicineSchedule, PharmacyFulfillment, FulfilledMedicine
from doctors.models import Prescription
import json


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTION
# ═══════════════════════════════════════════════════════════════

def get_pharmacy_profile(request):
    """Get pharmacy profile or return error"""
    try:
        return request.user.pharmacyprofile, None
    except PharmacyProfile.DoesNotExist:
        return None, JsonResponse({"error": "Pharmacy profile not found"}, status=404)


# ═══════════════════════════════════════════════════════════════
# SIDEBAR DATA
# ═══════════════════════════════════════════════════════════════

@login_required
def get_pharmacy_sidebar_data(request):
    """Get pharmacy staff sidebar information"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error

    first_name = request.user.first_name or ""
    last_name = request.user.last_name or ""

    # Generate initials
    if first_name and last_name:
        initials = f"{first_name[0]}{last_name[0]}".upper()
    elif first_name:
        initials = first_name[0].upper()
    else:
        initials = request.user.username[0].upper() if request.user.username else "P"

    # Get photo URL
    photo_url = None
    if profile.profile_photo:
        photo_url = request.build_absolute_uri(profile.profile_photo.url)

    # Get full name
    full_name = request.user.get_full_name() or request.user.username

    # ✅ Calculate badge counts (TODAY's prescriptions only)
    today = timezone.now().date()
    
    # Pending prescriptions (not in PharmacyFulfillment or status='pending')
    fulfilled_ids = PharmacyFulfillment.objects.exclude(
        status='pending'
    ).values_list('prescription_id', flat=True)
    
    pending_count = Prescription.objects.filter(
        prescribed_date=today
    ).exclude(id__in=fulfilled_ids).count()
    
    # On Hold prescriptions
    hold_ids = PharmacyFulfillment.objects.filter(
        status='on_hold'
    ).values_list('prescription_id', flat=True)
    
    hold_count = Prescription.objects.filter(
        prescribed_date=today,
        id__in=hold_ids
    ).count()
    
    # Total prescriptions needing attention
    prescriptions_badge = pending_count + hold_count
    
    # Patient requests badge (set to 0 for now, will implement later)
    requests_badge = 0

    return JsonResponse({
        "name": full_name,
        "pharmacy_id": profile.pharmacy_id,
        "role": "Pharmacist",
        "initials": initials,
        "photo_url": photo_url,
        "badges": {
            "prescriptions": prescriptions_badge,
            "requests": requests_badge
        }
    })
# ═══════════════════════════════════════════════════════════════
# LOGOUT
# ═══════════════════════════════════════════════════════════════

@login_required
@csrf_protect
@require_http_methods(["POST"])
def pharmacy_logout(request):
    """Logout pharmacy user"""
    try:
        logout(request)
        return JsonResponse({"success": True, "message": "Logged out successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e), "success": False}, status=500)


# ═══════════════════════════════════════════════════════════════
# PHARMACY OVERVIEW (DYNAMIC)
# ═══════════════════════════════════════════════════════════════

@login_required
def get_pharmacy_overview(request):
    """Get pharmacy overview with dynamic stats and filters"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    # Get filter period (today, month, year)
    period = request.GET.get('period', 'today')
    now = timezone.now()
    today = now.date()
    
    # Calculate date range based on period
    if period == 'today':
        start_date = today
        end_date = today
        period_label = "Today"
    elif period == 'month':
        start_date = today.replace(day=1)
        # Last day of current month
        if today.month == 12:
            end_date = today.replace(day=31)
        else:
            next_month = today.replace(month=today.month + 1, day=1)
            end_date = next_month - timedelta(days=1)
        period_label = "This Month"
    else:  # year
        start_date = today.replace(month=1, day=1)
        end_date = today.replace(month=12, day=31)
        period_label = "This Year"
    
    # ═══════════════════════════════════════════════════════════════
    # STATS (filtered by period)
    # ═══════════════════════════════════════════════════════════════
    
    # Prescriptions in period
    prescriptions_count = Prescription.objects.filter(
        prescribed_date__gte=start_date,
        prescribed_date__lte=end_date
    ).count()
    
    # Total medicines (always current, not filtered)
    total_medicines = Medicine.objects.filter(is_active=True).count()
    
    # Low stock items (critical: stock <= reorder_level)
    low_stock_count = Medicine.objects.filter(
        is_active=True,
        quantity_in_stock__lte=F('reorder_level')
    ).count()
    
    # Pending requests (prescriptions not fulfilled)
    pending_requests = Prescription.objects.filter(
        status='active'
    ).count()
    
    # Calculate changes (compare with previous period)
    if period == 'today':
        prev_start = today - timedelta(days=1)
        prev_end = prev_start
        change_label = "vs yesterday"
    elif period == 'month':
        # Previous month
        if start_date.month == 1:
            prev_start = start_date.replace(year=start_date.year - 1, month=12, day=1)
        else:
            prev_start = start_date.replace(month=start_date.month - 1, day=1)
        prev_end = start_date - timedelta(days=1)
        change_label = "vs last month"
    else:  # year
        prev_start = start_date.replace(year=start_date.year - 1)
        prev_end = end_date.replace(year=end_date.year - 1)
        change_label = "vs last year"
    
    prev_prescriptions = Prescription.objects.filter(
        prescribed_date__gte=prev_start,
        prescribed_date__lte=prev_end
    ).count()
    
    prescriptions_change = prescriptions_count - prev_prescriptions
    prescriptions_change_text = f"+{prescriptions_change}" if prescriptions_change > 0 else str(prescriptions_change)
    
    # ═══════════════════════════════════════════════════════════════
    # RECENT PRESCRIPTIONS (Last 10, newest first)
    # ═══════════════════════════════════════════════════════════════
    
    recent_prescriptions = Prescription.objects.select_related(
        'patient__user', 'doctor__user'
    ).order_by('-prescribed_date', '-created_at')[:10]
    
    prescriptions_list = []
    for presc in recent_prescriptions:
        patient_name = presc.patient.user.get_full_name() or presc.patient.user.username
        doctor_name = f"Dr. {presc.doctor.user.get_full_name() or presc.doctor.user.username}"
        
        # Count medicines
        medicines_count = presc.medicines.count()
        
        prescriptions_list.append({
            'id': presc.prescription_number,
            'patient': patient_name,
            'patientId': presc.patient.patient_id,
            'doctor': doctor_name,
            'date': presc.prescribed_date.strftime('%b %d, %Y'),
            'time': presc.created_at.strftime('%I:%M %p'),
            'status': presc.status.capitalize(),
            'medicines': medicines_count
        })
    
    # ═══════════════════════════════════════════════════════════════
    # NOTIFICATIONS (Last 1 hour only)
    # ═══════════════════════════════════════════════════════════════
    
    one_hour_ago = now - timedelta(hours=1)
    notifications = []
    notif_id = 1
    
    # Type 1: New prescriptions (last 1 hour)
    new_prescriptions = Prescription.objects.filter(
        created_at__gte=one_hour_ago
    ).select_related('doctor__user').order_by('-created_at')[:5]
    
    for presc in new_prescriptions:
        time_diff = now - presc.created_at
        minutes = int(time_diff.total_seconds() / 60)
        if minutes < 1:
            time_ago = "Just now"
        elif minutes < 60:
            time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_ago = "1 hour ago"
        
        notifications.append({
            'id': notif_id,
            'type': 'info',
            'title': 'New Prescription',
            'message': f"New prescription {presc.prescription_number} from Dr. {presc.doctor.user.get_full_name()}",
            'time': time_ago
        })
        notif_id += 1
    
    # Type 2: Critical low stock (real-time)
    critical_stock = Medicine.objects.filter(
        is_active=True,
        quantity_in_stock__lte=10  # Critical threshold
    ).order_by('quantity_in_stock')[:3]
    
    for med in critical_stock:
        notifications.append({
            'id': notif_id,
            'type': 'warning',
            'title': 'Critical Stock Alert',
            'message': f"{med.name} is critically low ({med.quantity_in_stock} {med.unit_type}s remaining)",
            'time': "Now"
        })
        notif_id += 1
    
    # Type 3: Medicines expiring soon (within 30 days)
    thirty_days_later = today + timedelta(days=30)
    expiring_soon = Medicine.objects.filter(
        is_active=True,
        expiry_date__lte=thirty_days_later,
        expiry_date__gte=today
    ).count()
    
    if expiring_soon > 0:
        notifications.append({
            'id': notif_id,
            'type': 'warning',
            'title': 'Expiry Alert',
            'message': f"{expiring_soon} medicine{'s' if expiring_soon > 1 else ''} expiring in the next 30 days",
            'time': "Now"
        })
        notif_id += 1
    
    # Limit to 10 notifications
    notifications = notifications[:10]
    
    # ═══════════════════════════════════════════════════════════════
    # LOW STOCK MEDICINES (Top 3 critical items)
    # ═══════════════════════════════════════════════════════════════
    
    low_stock_medicines = Medicine.objects.filter(
        is_active=True,
        quantity_in_stock__lte=F('reorder_level')
    ).order_by('quantity_in_stock')[:3]
    
    low_stock_list = []
    for med in low_stock_medicines:
        # Determine level (critical if <= 10, else low)
        if med.quantity_in_stock <= 10:
            level = 'critical'
        else:
            level = 'low'
        
        low_stock_list.append({
            'name': f"{med.name} {med.generic_name or ''}".strip(),
            'stock': med.quantity_in_stock,
            'unit': f"{med.unit_type}s",
            'level': level
        })
    
    # ═══════════════════════════════════════════════════════════════
    # RESPONSE
    # ═══════════════════════════════════════════════════════════════
    
    return JsonResponse({
        'period': period,
        'period_label': period_label,
        'stats': {
            'prescriptions': prescriptions_count,
            'prescriptions_change': prescriptions_change_text,
            'total_medicines': total_medicines,
            'low_stock': low_stock_count,
            'pending_requests': pending_requests,
        },
        'recent_prescriptions': prescriptions_list,
        'notifications': notifications,
        'low_stock_medicines': low_stock_list,
    })



# ═══════════════════════════════════════════════════════════════
# PROFILE - GET
# ═══════════════════════════════════════════════════════════════

@login_required
def get_pharmacy_profile_data(request):
    """Get pharmacy profile information"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    # Calculate stats (optional - for future use)
    total_prescriptions = Prescription.objects.count()
    
    now = timezone.now()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_prescriptions = Prescription.objects.filter(
        prescribed_date__gte=start_of_month
    ).count()
    
    # Medicine stats
    total_medicines = Medicine.objects.filter(is_active=True).count()
    low_stock_count = Medicine.objects.filter(
        is_active=True,
        quantity_in_stock__lte=F('reorder_level')
    ).count()
    
    member_since = profile.created_at.strftime('%B %d, %Y')
    
    return JsonResponse({
        # Basic Information (from PharmacyProfile)
        'pharmacyName': 'Central Pharmacy',  # You can add this field to model later
        'branchName': 'Main Branch',  # You can add this field to model later
        'phone': profile.phone_number or '',
        'email': request.user.email or '',
        'address': 'Medical Plaza, Suite 200, Thapathali, Kathmandu, Nepal',  # Add to model later
        'operatingHours': '24/7 Open - Round the Clock Service',  # Add to model later
        
        # Contact Person (editable)
        'contactName': request.user.get_full_name() or request.user.username,
        'contactDesignation': profile.specialization or 'Chief Pharmacist',
        'contactPhone': profile.phone_number or '',
        'contactEmail': request.user.email or '',
        
        # Additional Details
        'pharmacyId': profile.pharmacy_id,
        'licenseNumber': profile.license_number or '',
        'establishedYear': '2015',  # Add to model later if needed
        'registrationNumber': 'REG-2015-KTM-5678',  # Add to model later
        'servicesOffered': 'Prescription Filling, Medication Counseling, Immunizations, Health Screenings, Home Delivery, 24/7 Emergency Services',
        'aboutPharmacy': 'Central Pharmacy has been serving the Thapathali, Kathmandu community since 2015. We pride ourselves on providing exceptional pharmaceutical care with a focus on patient safety and satisfaction.',
        
        # Stats
        'memberSince': member_since,
        'stats': {
            'total_prescriptions': total_prescriptions,
            'month_prescriptions': month_prescriptions,
            'total_medicines': total_medicines,
            'low_stock': low_stock_count,
        }
    })


# ═══════════════════════════════════════════════════════════════
# PROFILE - UPDATE (Contact Person Only)
# ═══════════════════════════════════════════════════════════════

@login_required
@csrf_protect
@require_http_methods(["POST"])
def update_pharmacy_profile_data(request):
    """Update pharmacy contact person information only"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    try:
        data = json.loads(request.body)
        
        # Update contact person name (user fields)
        full_name = data.get('contactName', '').strip()
        if full_name:
            name_parts = full_name.split(' ', 1)
            request.user.first_name = name_parts[0]
            request.user.last_name = name_parts[1] if len(name_parts) > 1 else ''
            request.user.save()
        
        # Update contact email
        email = data.get('contactEmail', '').strip()
        if email:
            request.user.email = email
            request.user.save()
        
        # Update profile fields
        profile.phone_number = data.get('contactPhone', '').strip()
        profile.specialization = data.get('contactDesignation', '').strip()
        profile.save()
        
        return JsonResponse({
            "success": True,
            "message": "Contact information updated successfully"
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



@login_required
def get_pharmacy_prescriptions(request):
    """Get prescriptions list with filters"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    status_filter = request.GET.get('status', 'pending')
    search = request.GET.get('search', '').strip()
    selected_date = request.GET.get('date', timezone.now().date().isoformat())
    page = int(request.GET.get('page', 1))
    per_page = 10
    
    try:
        filter_date = timezone.datetime.strptime(selected_date, '%Y-%m-%d').date()
    except:
        filter_date = timezone.now().date()
    
    # ✅ Map filter to status
    if status_filter == 'pending':
        # Prescriptions without fulfillment OR with pending status
        fulfilled_ids = PharmacyFulfillment.objects.exclude(
            status='pending'
        ).values_list('prescription_id', flat=True)
        
        prescriptions = Prescription.objects.filter(
            prescribed_date=filter_date
        ).exclude(id__in=fulfilled_ids)
        
    elif status_filter == 'fulfilled':
        # Prescriptions with fulfilled or partial status
        fulfilled_ids = PharmacyFulfillment.objects.filter(
            status__in=['fulfilled', 'partial']
        ).values_list('prescription_id', flat=True)
        
        prescriptions = Prescription.objects.filter(
            prescribed_date=filter_date,
            id__in=fulfilled_ids
        )
        
    elif status_filter == 'on_hold':
        # ✅ Prescriptions on hold
        hold_ids = PharmacyFulfillment.objects.filter(
            status='on_hold'
        ).values_list('prescription_id', flat=True)
        
        prescriptions = Prescription.objects.filter(
            prescribed_date=filter_date,
            id__in=hold_ids
        )
        
    elif status_filter == 'cancelled':
        # ✅ Cancelled prescriptions
        cancelled_ids = PharmacyFulfillment.objects.filter(
            status='cancelled'
        ).values_list('prescription_id', flat=True)
        
        prescriptions = Prescription.objects.filter(
            prescribed_date=filter_date,
            id__in=cancelled_ids
        )
    else:
        prescriptions = Prescription.objects.filter(prescribed_date=filter_date)
    
    prescriptions = prescriptions.select_related(
        'patient__user',
        'doctor__user'
    ).prefetch_related('medicines').order_by('-created_at')
    
    # Search
    if search:
        prescriptions = prescriptions.filter(
            Q(prescription_number__icontains=search) |
            Q(patient__user__first_name__icontains=search) |
            Q(patient__user__last_name__icontains=search) |
            Q(patient__patient_id__icontains=search) |
            Q(doctor__user__first_name__icontains=search) |
            Q(doctor__user__last_name__icontains=search)
        )
    
    # ✅ Stats for all filters
    fulfilled_ids_all = PharmacyFulfillment.objects.exclude(
        status='pending'
    ).values_list('prescription_id', flat=True)
    
    total_pending = Prescription.objects.filter(
        prescribed_date=filter_date
    ).exclude(id__in=fulfilled_ids_all).count()
    
    fulfilled_ids_completed = PharmacyFulfillment.objects.filter(
        status__in=['fulfilled', 'partial']
    ).values_list('prescription_id', flat=True)
    
    total_fulfilled = Prescription.objects.filter(
        prescribed_date=filter_date,
        id__in=fulfilled_ids_completed
    ).count()
    
    # ✅ On Hold count
    hold_ids = PharmacyFulfillment.objects.filter(
        status='on_hold'
    ).values_list('prescription_id', flat=True)
    
    total_hold = Prescription.objects.filter(
        prescribed_date=filter_date,
        id__in=hold_ids
    ).count()
    
    # ✅ Cancelled count
    cancelled_ids = PharmacyFulfillment.objects.filter(
        status='cancelled'
    ).values_list('prescription_id', flat=True)
    
    total_cancelled = Prescription.objects.filter(
        prescribed_date=filter_date,
        id__in=cancelled_ids
    ).count()
    
    # Pagination
    total_count = prescriptions.count()
    total_pages = max(1, (total_count + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    prescriptions = prescriptions[(page - 1) * per_page: page * per_page]
    
    # Build response
    prescriptions_list = []
    for presc in prescriptions:
        patient_name = presc.patient.user.get_full_name() or presc.patient.user.username
        doctor_name = f"Dr. {presc.doctor.user.get_full_name() or presc.doctor.user.username}"
        medicines_count = presc.medicines.count()
        
        # Get fulfillment status
        try:
            fulfillment = PharmacyFulfillment.objects.get(prescription=presc)
            status = fulfillment.status
        except PharmacyFulfillment.DoesNotExist:
            status = 'pending'
        
        prescriptions_list.append({
            'id': presc.id,
            'prescription_number': presc.prescription_number,
            'patient_name': patient_name,
            'patient_id': presc.patient.patient_id,
            'patient_age': presc.patient.age or 'N/A',
            'doctor_name': doctor_name,
            'doctor_specialty': presc.doctor.get_specialty_display(),
            'date': presc.prescribed_date.strftime('%b %d, %Y'),
            'time': presc.created_at.strftime('%I:%M %p'),
            'medicines_count': medicines_count,
            'status': status
        })
    
    return JsonResponse({
        'prescriptions': prescriptions_list,
        'stats': {
            'total_pending': total_pending,
            'total_fulfilled': total_fulfilled,
            'total_hold': total_hold,  # ✅ Added
            'total_cancelled': total_cancelled  # ✅ Added
        },
        'pagination': {
            'page': page,
            'total_pages': total_pages,
            'total_count': total_count,
            'per_page': per_page
        }
    })


@login_required
def get_prescription_details(request, prescription_id):
    """Get detailed prescription with stock availability"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    try:
        prescription = Prescription.objects.select_related(
            'patient__user',
            'doctor__user'
        ).prefetch_related('medicines').get(id=prescription_id)
    except Prescription.DoesNotExist:
        return JsonResponse({'error': 'Prescription not found'}, status=404)
    
    # Check if already fulfilled
    try:
        fulfillment = PharmacyFulfillment.objects.get(prescription=prescription)
        status = fulfillment.status
    except PharmacyFulfillment.DoesNotExist:
        status = 'pending'
    
    # Patient info
    patient_name = prescription.patient.user.get_full_name() or prescription.patient.user.username
    
    # Doctor info
    doctor_name = f"Dr. {prescription.doctor.user.get_full_name() or prescription.doctor.user.username}"
    
    # Medicines with stock availability
    medicines_list = []
    for med in prescription.medicines.all():
        # ✅ Parse frequency from text (e.g., "2x daily", "3 times daily")
        frequency_text = med.frequency or '1x daily'
        
        # Extract number from frequency
        import re
        frequency_match = re.search(r'(\d+)', frequency_text)
        if frequency_match:
            frequency_count = int(frequency_match.group(1))
        else:
            frequency_count = 1  # Default
        
        # ✅ Parse duration from text (e.g., "7 days", "2 weeks", "10 days")
        duration_text = med.duration or '1 day'
        
        # Extract number of days from duration
        duration_match = re.search(r'(\d+)', duration_text)
        if duration_match:
            duration_days = int(duration_match.group(1))
            
            # If duration mentions "week", multiply by 7
            if 'week' in duration_text.lower():
                duration_days *= 7
            # If duration mentions "month", multiply by 30
            elif 'month' in duration_text.lower():
                duration_days *= 30
        else:
            duration_days = 1  # Default
        
        # Calculate total needed
        total_needed = frequency_count * duration_days
        
        # Search in pharmacy stock
        stock_medicine = Medicine.objects.filter(
            name__icontains=med.medicine_name,
            is_active=True
        ).first()
        
        if stock_medicine:
            available = stock_medicine.quantity_in_stock
            stock_id = stock_medicine.id
            
            if available >= total_needed:
                stock_status = 'available'
            elif available > 0:
                stock_status = 'partial'
            else:
                stock_status = 'out_of_stock'
        else:
            available = 0
            stock_id = None
            stock_status = 'not_found'
        
        medicines_list.append({
            'id': med.id,
            'name': med.medicine_name,
            'dosage': med.dosage or '1 unit',
            'frequency': frequency_text,
            'frequency_count': frequency_count,
            'duration': duration_text,
            'duration_days': duration_days,
            'instructions': med.instructions or '',
            'total_needed': total_needed,
            'stock_available': available,
            'stock_id': stock_id,
            'stock_status': stock_status,
        })
    
    return JsonResponse({
        'id': prescription.id,
        'prescription_number': prescription.prescription_number,
        'patient_name': patient_name,
        'patient_id': prescription.patient.patient_id,
        'patient_age': prescription.patient.age or 'N/A',
        'doctor_name': doctor_name,
        'doctor_specialty': prescription.doctor.get_specialty_display(),
        'date': prescription.prescribed_date.strftime('%b %d, %Y'),
        'time': prescription.created_at.strftime('%I:%M %p'),
        'diagnosis': prescription.diagnosis or 'Not specified',
        'notes': prescription.notes or '',
        'medicines': medicines_list,
        'status': status
    })

@login_required
@csrf_protect
@require_http_methods(["POST"])
def fulfill_prescription(request, prescription_id):
    """Fulfill prescription"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    try:
        prescription = Prescription.objects.select_related('patient__user').prefetch_related('medicines').get(id=prescription_id)
    except Prescription.DoesNotExist:
        return JsonResponse({'error': 'Prescription not found'}, status=404)
    
    try:
        data = json.loads(request.body)
        action = data.get('action')
        selected_medicines = data.get('selected_medicines', [])
        notes = data.get('notes', '')
        
        # ✅ Get or create PharmacyFulfillment
        fulfillment, created = PharmacyFulfillment.objects.get_or_create(
            prescription=prescription,
            defaults={
                'pharmacy_profile': profile,
                'status': 'pending'
            }
        )
        
        if action == 'fulfill':
            fulfilled_count = 0
            
            for med_data in selected_medicines:
                med_id = med_data.get('medicine_id')
                quantity_to_dispense = med_data.get('quantity')
                stock_id = med_data.get('stock_id')
                
                try:
                    prescribed_med = prescription.medicines.get(id=med_id)
                except:
                    continue
                
                if stock_id:
                    try:
                        stock_medicine = Medicine.objects.get(id=stock_id)
                        if stock_medicine.quantity_in_stock >= quantity_to_dispense:
                            stock_medicine.quantity_in_stock -= quantity_to_dispense
                            stock_medicine.save()
                            
                            # ✅ Record fulfilled medicine
                            FulfilledMedicine.objects.create(
                                fulfillment=fulfillment,
                                prescribed_medicine=prescribed_med,
                                stock_medicine=stock_medicine,
                                quantity_dispensed=quantity_to_dispense,
                                quantity_requested=med_data.get('total_needed', quantity_to_dispense)
                            )
                            
                            fulfilled_count += 1
                    except Medicine.DoesNotExist:
                        continue
            
            # Update fulfillment status
            total_medicines = prescription.medicines.count()
            if fulfilled_count == total_medicines:
                fulfillment.status = 'fulfilled'
            elif fulfilled_count > 0:
                fulfillment.status = 'partial'
            else:
                return JsonResponse({'error': 'No medicines could be fulfilled'}, status=400)
            
            fulfillment.pharmacy_profile = profile
            fulfillment.fulfilled_at = timezone.now()
            fulfillment.notes = notes
            fulfillment.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Prescription {fulfillment.status} successfully',
                'status': fulfillment.status
            })
        
        elif action == 'hold':
            fulfillment.status = 'on_hold'
            fulfillment.notes = notes
            fulfillment.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Prescription put on hold',
                'status': 'on_hold'
            })
        
        elif action == 'cancel':
            fulfillment.status = 'cancelled'
            fulfillment.notes = notes
            fulfillment.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Prescription cancelled',
                'status': 'cancelled'
            })
        
        else:
            return JsonResponse({'error': 'Invalid action'}, status=400)
    
    except Exception as e:
        import traceback
        print("Error fulfilling prescription:")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════
# MEDICINE STOCK - GET LIST
# ═══════════════════════════════════════════════════════════════

@login_required
def get_medicine_stock(request):
    """Get medicine stock list with filters"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    # Get filters
    status_filter = request.GET.get('status', 'low_stock')  
    search = request.GET.get('search', '').strip()
    page = int(request.GET.get('page', 1))
    per_page = 20  # ✅ Changed from 12 to 20
    
    # Base query - only active medicines
    medicines = Medicine.objects.filter(is_active=True)
    
    # ✅ Get today's date
    today = timezone.now().date()
    
    # Apply status filter
    if status_filter == 'in_stock':
        # Good stock (above reorder level and quantity > 0 and not expired)
        medicines = medicines.filter(
            quantity_in_stock__gt=F('reorder_level')
        ).exclude(expiry_date__lt=today)
    elif status_filter == 'low_stock':
        # Low stock (at or below reorder level but not zero and not expired)
        medicines = medicines.filter(
            quantity_in_stock__lte=F('reorder_level'),
            quantity_in_stock__gt=0
        ).exclude(expiry_date__lt=today)
    elif status_filter == 'out_of_stock':
        # Out of stock (quantity = 0)
        medicines = medicines.filter(quantity_in_stock=0)
    elif status_filter == 'expired':
        # ✅ NEW: Expired medicines (expiry_date < today)
        medicines = medicines.filter(expiry_date__lt=today)
    # 'all' filter shows everything
    
    # Search
    if search:
        medicines = medicines.filter(
            Q(name__icontains=search) |
            Q(generic_name__icontains=search) |
            Q(manufacturer__icontains=search)
        )
    
    # Order by stock status (critical first)
    medicines = medicines.order_by('quantity_in_stock', 'name')
    
    # Pagination
    total_count = medicines.count()
    total_pages = max(1, (total_count + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    medicines = medicines[(page - 1) * per_page: page * per_page]
    
    # Build response
    medicines_list = []
    for med in medicines:
        # ✅ Check if expired
        is_expired = med.expiry_date and med.expiry_date < today
        
        # Determine status
        if is_expired:
            status = 'expired'
        elif med.quantity_in_stock == 0:
            status = 'out_of_stock'
        elif med.quantity_in_stock <= 10:  # Critical threshold
            status = 'critical'
        elif med.quantity_in_stock <= med.reorder_level:
            status = 'low'
        else:
            status = 'good'
        
        medicines_list.append({
            'id': med.id,
            'name': med.name,
            'dosage': med.dosage or '',
            'generic_name': med.generic_name or '',
            'strength': f"{med.name.split()[-1]}" if any(char.isdigit() for char in med.name) else '',
            'quantity': med.quantity_in_stock,
            'unit': med.get_unit_type_display(),
            'unit_type': med.unit_type,
            'price': float(med.unit_price),
            'reorder_level': med.reorder_level,
            'category': med.get_category_display(),
            'category_value': med.category,
            'expiry_date': med.expiry_date.strftime('%b %Y') if med.expiry_date else 'N/A',
            'expiry_date_full': med.expiry_date.isoformat() if med.expiry_date else '',
            'manufacturer': med.manufacturer or 'N/A',
            'description': med.description or '',
            'status': status,
            'is_expired': is_expired
        })
    
    # ✅ Calculate stats (including expired)
    total_medicines = Medicine.objects.filter(is_active=True).count()
    in_stock_count = Medicine.objects.filter(
        is_active=True,
        quantity_in_stock__gt=F('reorder_level')
    ).exclude(expiry_date__lt=today).count()
    low_stock_count = Medicine.objects.filter(
        is_active=True,
        quantity_in_stock__lte=F('reorder_level'),
        quantity_in_stock__gt=0
    ).exclude(expiry_date__lt=today).count()
    out_of_stock_count = Medicine.objects.filter(
        is_active=True,
        quantity_in_stock=0
    ).count()
    expired_count = Medicine.objects.filter(
        is_active=True,
        expiry_date__lt=today
    ).count()
    
    return JsonResponse({
        'medicines': medicines_list,
        'stats': {
            'total': total_medicines,
            'in_stock': in_stock_count,
            'low_stock': low_stock_count,
            'out_of_stock': out_of_stock_count,
            'expired': expired_count  # ✅ NEW
        },
        'pagination': {
            'page': page,
            'total_pages': total_pages,
            'total_count': total_count,
            'per_page': per_page
        }
    })


# ═══════════════════════════════════════════════════════════════
# MEDICINE STOCK - GET SINGLE
# ═══════════════════════════════════════════════════════════════

@login_required
def get_medicine_details(request, medicine_id):
    """Get single medicine details"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    try:
        medicine = Medicine.objects.get(id=medicine_id, is_active=True)
    except Medicine.DoesNotExist:
        return JsonResponse({'error': 'Medicine not found'}, status=404)
    
    # Determine status
    if medicine.quantity_in_stock == 0:
        status = 'out_of_stock'
    elif medicine.quantity_in_stock <= 10:
        status = 'critical'
    elif medicine.quantity_in_stock <= medicine.reorder_level:
        status = 'low'
    else:
        status = 'good'
    
    return JsonResponse({
        'id': medicine.id,
        'name': medicine.name,
        'dosage': medicine.dosage or '',
        'generic_name': medicine.generic_name or '',
        'quantity': medicine.quantity_in_stock,
        'unit': medicine.get_unit_type_display(),
        'unit_type': medicine.unit_type,
        'price': float(medicine.unit_price),
        'reorder_level': medicine.reorder_level,
        'category': medicine.get_category_display(),
        'category_value': medicine.category,
        'expiry_date': medicine.expiry_date.strftime('%b %d, %Y') if medicine.expiry_date else 'N/A',
        'expiry_date_full': medicine.expiry_date.isoformat() if medicine.expiry_date else '',
        'manufacturer': medicine.manufacturer or '',
        'description': medicine.description or '',
        'side_effects': medicine.side_effects or '',
        'storage_instructions': medicine.storage_instructions or '',
        'status': status,
        'created_at': medicine.created_at.strftime('%b %d, %Y'),
        'updated_at': medicine.updated_at.strftime('%b %d, %Y')
    })


# ═══════════════════════════════════════════════════════════════
# MEDICINE STOCK - CREATE
# ═══════════════════════════════════════════════════════════════

@login_required
@csrf_protect
@require_http_methods(["POST"])
def create_medicine(request):
    """Create new medicine"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        if not data.get('name') or not data.get('quantity') or not data.get('price'):
            return JsonResponse({'error': 'Name, quantity, and price are required'}, status=400)
        
        # Parse expiry date
        expiry_date = None
        if data.get('expiryDate'):
            try:
                expiry_date = timezone.datetime.strptime(data['expiryDate'], '%Y-%m-%d').date()
            except:
                return JsonResponse({'error': 'Invalid expiry date format'}, status=400)
        
        # Create medicine
        medicine = Medicine.objects.create(
            name=data['name'],
            dosage=data.get('dosage', ''),
            generic_name=data.get('generic_name', ''),
            manufacturer=data.get('manufacturer', ''),
            category=data.get('category', 'other'),
            unit_type=data.get('unit_type', 'tablet'),
            quantity_in_stock=int(data['quantity']),
            reorder_level=int(data.get('reorder_level', 50)),
            unit_price=float(data['price']),
            description=data.get('description', ''),
            side_effects=data.get('side_effects', ''),
            storage_instructions=data.get('storage_instructions', ''),
            expiry_date=expiry_date,
            is_active=True
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Medicine "{medicine.name}" added successfully',
            'medicine_id': medicine.id
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════
# MEDICINE STOCK - UPDATE
# ═══════════════════════════════════════════════════════════════

@login_required
@csrf_protect
@require_http_methods(["POST"])
def update_medicine(request, medicine_id):
    """Update medicine"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    try:
        medicine = Medicine.objects.get(id=medicine_id, is_active=True)
    except Medicine.DoesNotExist:
        return JsonResponse({'error': 'Medicine not found'}, status=404)
    
    try:
        data = json.loads(request.body)
        
        # Update fields
        if data.get('name'):
            medicine.name = data['name']
        if data.get('dosage') is not None: 
            medicine.dosage = data['dosage']
        if data.get('generic_name') is not None:
            medicine.generic_name = data['generic_name']
        if data.get('manufacturer') is not None:
            medicine.manufacturer = data['manufacturer']
        if data.get('category'):
            medicine.category = data['category']
        if data.get('unit_type'):
            medicine.unit_type = data['unit_type']
        if data.get('quantity') is not None:
            medicine.quantity_in_stock = int(data['quantity'])
        if data.get('reorder_level') is not None:
            medicine.reorder_level = int(data['reorder_level'])
        if data.get('price') is not None:
            medicine.unit_price = float(data['price'])
        if data.get('description') is not None:
            medicine.description = data['description']
        if data.get('side_effects') is not None:
            medicine.side_effects = data['side_effects']
        if data.get('storage_instructions') is not None:
            medicine.storage_instructions = data['storage_instructions']
        
        # Update expiry date
        if data.get('expiryDate'):
            try:
                medicine.expiry_date = timezone.datetime.strptime(data['expiryDate'], '%Y-%m-%d').date()
            except:
                pass
        
        medicine.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Medicine "{medicine.name}" updated successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════
# MEDICINE STOCK - DELETE (Soft delete)
# ═══════════════════════════════════════════════════════════════

@login_required
@csrf_protect
@require_http_methods(["POST"])
def delete_medicine(request, medicine_id):
    """Soft delete medicine (set is_active=False)"""
    profile, error = get_pharmacy_profile(request)
    if error:
        return error
    
    try:
        medicine = Medicine.objects.get(id=medicine_id, is_active=True)
    except Medicine.DoesNotExist:
        return JsonResponse({'error': 'Medicine not found'}, status=404)
    
    # Soft delete
    medicine.is_active = False
    medicine.save()
    
    return JsonResponse({
        'success': True,
        'message': f'Medicine "{medicine.name}" deleted successfully'
    })