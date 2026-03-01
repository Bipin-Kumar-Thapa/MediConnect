from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


def send_lab_report_email(report):
    """
    Send email notification to patient when lab report is marked as complete.
    Email template and color scheme based on overall_status:
    - normal → Green card (reassuring)
    - abnormal → Orange card (review needed)
    - critical → Red card (urgent)
    """
    
    # Only send if report is completed
    if not report.is_completed:
        return False
    
    # Get patient email
    patient_email = report.patient.user.email
    if not patient_email:
        print(f"No email for patient {report.patient.patient_id}")
        return False
    
    # Get patient name
    patient_name = report.patient.user.get_full_name() or report.patient.user.username
    
    # Get test names
    test_sections = report.test_sections.all()
    if test_sections.exists():
        if test_sections.count() == 1:
            test_name = test_sections.first().get_test_name()
        else:
            test_name = f"{test_sections.count()} Tests"
    else:
        test_name = "Lab Report"
    
    # Get doctor name (if assigned)
    doctor_name = None
    if report.doctor:
        doctor_name = f"Dr. {report.doctor.user.get_full_name()}"
    
    # Build report URL (patient will click to view)
    from django.urls import reverse
    report_url = f"{settings.FRONTEND_URL}"
    
    # Determine template and subject based on status
    status = report.overall_status.lower()
    
    if status == 'normal':
        template_name = 'registration/lab_report_normal.html'
        subject = f'✅ Lab Report Ready - {test_name} (Normal)'
        status_emoji = '✅'
        status_label = 'Normal'
        
    elif status == 'abnormal':
        template_name = 'registration/lab_report_abnormal.html'
        subject = f'⚠️ Lab Report Ready - {test_name} (Abnormal - Review Needed)'
        status_emoji = '⚠️'
        status_label = 'Abnormal'
        
    elif status == 'critical':
        template_name = 'registration/lab_report_critical.html'
        subject = f'🚨 URGENT: Critical Lab Report - {test_name}'
        status_emoji = '🚨'
        status_label = 'Critical'
    else:
        # Fallback to normal
        template_name = 'registration/lab_report_normal.html'
        subject = f'Lab Report Ready - {test_name}'
        status_emoji = 'ℹ️'
        status_label = 'Completed'
    
    # Context for email template
    context = {
        'patient_name': patient_name,
        'test_name': test_name,
        'report_number': report.report_number,
        'test_date': report.test_date.strftime('%B %d, %Y'),
        'status': status_label,
        'status_emoji': status_emoji,
        'doctor_name': doctor_name,
        'report_url': report_url,
        'hospital_name': 'MediConnect Hospital',
    }
    
    # Render HTML email
    html_message = render_to_string(template_name, context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[patient_email],
            html_message=html_message,
            fail_silently=False,
        )
        print(f"✅ Lab report email sent to {patient_email} ({status})")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send lab report email: {e}")
        return False