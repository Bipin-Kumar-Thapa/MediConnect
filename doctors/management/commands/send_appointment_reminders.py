from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta, datetime
from doctors.models import Appointment


class Command(BaseCommand):
    help = 'Send email reminders for appointments starting in 1 hour'

    def handle(self, *args, **kwargs):
        now = timezone.now()

        # ✅ Find appointments that start in 55-65 minutes (10 min window to avoid missing)
        reminder_start = now + timedelta(minutes=55)
        reminder_end   = now + timedelta(minutes=65)

        # Get pending/confirmed appointments in that window
        upcoming = Appointment.objects.filter(
            status__in=['pending', 'confirmed'],
            reminder_sent=False  # ✅ Don't send twice
        ).select_related('patient__user', 'doctor__user')

        sent_count = 0

        for apt in upcoming:
            # Combine appointment date + time into datetime
            apt_datetime_naive = datetime.combine(apt.appointment_date, apt.appointment_time)
            apt_datetime = timezone.make_aware(apt_datetime_naive, timezone.get_current_timezone())

            # ✅ Check if appointment is in the 55-65 minute window
            if reminder_start <= apt_datetime <= reminder_end:
                patient_email = apt.patient.user.email

                if not patient_email:
                    self.stdout.write(f'No email for patient {apt.patient.patient_id}, skipping.')
                    continue

                # Build email context
                context = {
                    'patient_name':     apt.patient.user.get_full_name() or apt.patient.user.username,
                    'patient_id':       apt.patient.patient_id,
                    'doctor_name':      f"Dr. {apt.doctor.user.get_full_name()}",
                    'specialty':        apt.doctor.get_specialty_display(),
                    'appointment_date': apt.appointment_date.strftime('%A, %B %d, %Y'),
                    'appointment_time': apt.appointment_time.strftime('%I:%M %p'),
                    'appointment_type': apt.get_appointment_type_display(),
                    'location':         apt.doctor.room_location or 'Visit Reception at Ground Floor',
                }

                # Render HTML template
                html_message = render_to_string(
                    'registration/appointment_reminder_email.html',
                    context
                )

                # Send email
                try:
                    send_mail(
                        subject=f'⏰ Appointment Reminder - {context["appointment_time"]} Today | MediConnect',
                        message=f'Reminder: You have an appointment with {context["doctor_name"]} at {context["appointment_time"]} today.',
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[patient_email],
                        html_message=html_message,
                        fail_silently=False,
                    )

                    # ✅ Mark reminder as sent so it doesn't send again
                    apt.reminder_sent = True
                    apt.save()

                    sent_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ Reminder sent to {patient_email} for appointment at {context["appointment_time"]}'
                        )
                    )

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Failed to send to {patient_email}: {e}')
                    )

        self.stdout.write(
            self.style.SUCCESS(f'\n📧 Done! Sent {sent_count} reminder(s).')
        )