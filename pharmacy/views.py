from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.utils import timezone
from django.db.models import Q, F
from datetime import timedelta
from .models import PharmacyProfile, Medicine
from doctors.models import Prescription


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

    return JsonResponse({
        "name": full_name,
        "pharmacy_id": profile.pharmacy_id,
        "role": "Pharmacist",
        "initials": initials,
        "photo_url": photo_url,
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