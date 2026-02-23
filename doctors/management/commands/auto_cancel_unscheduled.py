"""
Management command to auto-cancel appointments that weren't rescheduled within 24 hours.

This command should be run every 30 minutes via Windows Task Scheduler.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from doctors.models import Appointment
from datetime import timedelta


class Command(BaseCommand):
    help = 'Auto-cancel appointments that need rescheduling after 24 hours'

    def handle(self, *args, **kwargs):
        """
        Find appointments that:
        1. Status = 'needs_rescheduling'
        2. Updated 24+ hours ago (when status was changed)
        3. Change status to 'cancelled' (no email sent)
        """
        
        # Calculate cutoff time (24 hours ago)
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        self.stdout.write(f"Looking for appointments updated before {cutoff_time}")
        
        # Find appointments that need to be cancelled
        old_appointments = Appointment.objects.filter(
            status='needs_rescheduling',
            updated_at__lt=cutoff_time
        )
        
        cancelled_count = 0
        
        for appointment in old_appointments:
            try:
                # Store details before cancelling
                patient_name = appointment.patient.user.get_full_name()
                doctor_name = appointment.doctor.user.get_full_name()
                appointment_date = appointment.appointment_date.strftime('%B %d, %Y')
                appointment_time = appointment.appointment_time.strftime('%I:%M %p')
                
                # Change status to cancelled
                appointment.status = 'cancelled'
                appointment.save()
                
                cancelled_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Cancelled Appointment #{appointment.id}: "
                        f"{patient_name} with Dr. {doctor_name} on {appointment_date} at {appointment_time}"
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Error cancelling Appointment #{appointment.id}: {str(e)}"
                    )
                )
        
        # Summary
        self.stdout.write("-" * 50)
        if cancelled_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f"✓ Auto-cancelled {cancelled_count} appointments")
            )
            self.stdout.write(
                self.style.WARNING(
                    "These appointments were not rescheduled within 24 hours."
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING("No appointments found that need auto-cancellation")
            )