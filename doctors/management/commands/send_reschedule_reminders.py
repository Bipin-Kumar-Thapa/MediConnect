from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from doctors.models import Appointment
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

class Command(BaseCommand):
    help = 'Send 12-hour reminder emails for appointments that need rescheduling'

    def handle(self, *args, **options):
        now = timezone.now()
        twelve_hours_ago = now - timedelta(hours=12)
        
        self.stdout.write(f"Current time: {now}")
        self.stdout.write(f"Looking for appointments marked 'needs_rescheduling' more than 12 hours ago...")
        self.stdout.write(f"Cutoff time: {twelve_hours_ago}")
        self.stdout.write("-" * 50)
        
        # Find appointments needing 12-hour reminder
        appointments = Appointment.objects.filter(
            status='needs_rescheduling',
            reminder_sent=False,
            updated_at__lte=twelve_hours_ago
        ).select_related('patient__user', 'doctor__user')
        
        count = appointments.count()
        self.stdout.write(f"Found {count} appointment(s) needing 12-hour reminder")
        
        if count == 0:
            self.stdout.write(self.style.WARNING("No appointments found that need 12-hour reminders"))
            return
        
        sent_count = 0
        for appointment in appointments:
            try:
                patient_email = appointment.patient.user.email
                if not patient_email:
                    self.stdout.write(self.style.WARNING(f"Skipping - No email for patient"))
                    continue
                
                patient_name = appointment.patient.user.get_full_name()
                doctor_name = appointment.doctor.user.get_full_name()
                appointment_date = appointment.appointment_date.strftime('%B %d, %Y')
                appointment_time = appointment.appointment_time.strftime('%I:%M %p')
                
                subject = '⏰ Urgent Reminder: Please Reschedule Your Appointment'
                
                # Create reschedule link
                reschedule_url = 'http://localhost:3000/patient/appointments'
                
                # ✅ Use your EXISTING template (appointment_reschedule_notification.html)
                html_message = render_to_string('registration/appointment_reschedule_reminder.html', {
                    'patient_name': patient_name,
                    'doctor_name': f'Dr. {doctor_name}',
                    'appointment_date': appointment_date,
                    'appointment_time': appointment_time,
                    'reschedule_link': reschedule_url,
                    'appointment_id': appointment.id,
                })
                
                # Send email with HTML
                send_mail(
                    subject,
                    '',  # Plain text version (empty - HTML will be used)
                    settings.EMAIL_HOST_USER,
                    [patient_email],
                    html_message=html_message,  # ✅ Beautiful HTML email!
                    fail_silently=False,
                )
                
                # Mark as sent
                appointment.reminder_sent = True
                appointment.save(update_fields=['reminder_sent'])
                
                sent_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Sent 12-hour reminder to {patient_name} ({patient_email})"
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Failed to send email: {str(e)}"
                    )
                )
        
        self.stdout.write("-" * 50)
        self.stdout.write(
            self.style.SUCCESS(f"✓ Successfully sent {sent_count} reminder email(s)")
        )