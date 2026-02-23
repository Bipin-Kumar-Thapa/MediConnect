from django.db import models, transaction, IntegrityError
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from datetime import timedelta


class DoctorProfile(models.Model):
    SPECIALTY_CHOICES = [
        ('cardiology', 'Cardiologist'),
        ('general', 'General Physician'),
        ('dermatology', 'Dermatologist'),
        ('orthopedic', 'Orthopedic'),
        ('ophthalmology', 'Ophthalmologist'),
        ('dentistry', 'Dentist'),
        ('neurology', 'Neurologist'),
        ('pediatrics', 'Pediatrician'),
        ('psychiatry', 'Psychiatrist'),
        ('gynecology', 'Gynecologist'),
        ('other', 'Other'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctorprofile")
    doctor_id = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    
    specialization = models.CharField(max_length=100, choices=SPECIALTY_CHOICES, default='general')
    qualification = models.CharField(max_length=150, blank=True, null=True)
    experience_years = models.PositiveIntegerField(default=0)
    license_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    hospital_name = models.CharField(max_length=150, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    is_verified = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    
    profile_photo = models.ImageField(upload_to='doctor_photos/', null=True, blank=True)
    sub_specialty = models.CharField(max_length=100, blank=True)
    room_location = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=100, blank=True)
    education = models.TextField(blank=True)
    certification = models.TextField(blank=True)
    languages = models.CharField(max_length=200, blank=True)
    available_hours = models.CharField(max_length=200, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.doctor_id:
            return super().save(*args, **kwargs)
        
        year = timezone.now().year
        for _ in range(5):
            try:
                with transaction.atomic():
                    last = DoctorProfile.objects.filter(
                        doctor_id__startswith=f"DOC-{year}-"
                    ).order_by("-doctor_id").first()
                    
                    if last:
                        last_number = int(last.doctor_id.split("-")[-1])
                        next_number = last_number + 1
                    else:
                        next_number = 1
                    
                    self.doctor_id = f"DOC-{year}-{next_number:03d}"
                    super().save(*args, **kwargs)
                    return
            except IntegrityError:
                continue
        
        raise IntegrityError("Failed to generate unique doctor_id")

    def __str__(self):
        return f"{self.doctor_id} - Dr. {self.user.get_full_name() or self.user.username}"
    
    def get_specialty_display(self):
        return dict(self.SPECIALTY_CHOICES).get(self.specialization, self.specialization)
    
    def get_initials(self):
        first_name = self.user.first_name or ""
        last_name = self.user.last_name or ""
        if first_name and last_name:
            return f"{first_name[0]}{last_name[0]}".upper()
        elif first_name:
            return first_name[0].upper()
        elif self.user.username:
            return self.user.username[0].upper()
        return "D"


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('missed', 'Missed'),
        ('needs_rescheduling', 'Needs Rescheduling'),  # ← NEW STATUS
    ]
    
    TYPE_CHOICES = [
        ('consultation', 'Consultation'),
        ('follow-up', 'Follow-up'),
        ('check-up', 'Check-up'),
    ]
    
    patient = models.ForeignKey('patients.PatientProfile', on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='appointments')
    
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    reason = models.TextField()
    reminder_sent = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    location = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-appointment_date', '-appointment_time']
    
    def __str__(self):
        return f"{self.patient.patient_id} - {self.doctor.doctor_id} - {self.appointment_date}"
    
    def get_appointment_type_display(self):
        return dict(self.TYPE_CHOICES).get(self.appointment_type, self.appointment_type)
    
    @property
    def is_upcoming(self):
        today = timezone.now().date()
        return self.appointment_date >= today and self.status in ['pending', 'confirmed']


class Prescription(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
    ]
    
    prescription_number = models.CharField(max_length=50, unique=True, editable=False)
    patient = models.ForeignKey('patients.PatientProfile', on_delete=models.CASCADE, related_name='prescriptions')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='prescriptions')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='prescriptions')
    
    diagnosis = models.TextField()
    notes = models.TextField(blank=True, null=True)
    prescribed_date = models.DateField(auto_now_add=True)
    valid_until = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-prescribed_date']
    
    def save(self, *args, **kwargs):
        if not self.prescription_number:
            year = timezone.now().year
            last_prescription = Prescription.objects.filter(
                prescription_number__startswith=f"RX-{year}-"
            ).order_by('-prescription_number').first()
            
            if last_prescription:
                last_number = int(last_prescription.prescription_number.split('-')[-1])
                next_number = last_number + 1
            else:
                next_number = 1
            
            self.prescription_number = f"RX-{year}-{next_number:03d}"
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.prescription_number} - {self.patient.patient_id}"
    
    def is_expired(self):
        return timezone.now().date() > self.valid_until


class PrescribedMedicine(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='medicines')
    medicine_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['id']
    
    def __str__(self):
        return f"{self.medicine_name} - {self.dosage}"


class ConsultationHistory(models.Model):
    TYPE_CHOICES = [
        ('new_visit', 'New Visit'),
        ('follow_up', 'Follow-up'),
    ]
    
    consultation_number = models.CharField(max_length=50, unique=True, editable=False)
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='consultation_history', null=True, blank=True)
    patient = models.ForeignKey('patients.PatientProfile', on_delete=models.CASCADE, related_name='consultation_histories')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='consultation_histories')
    
    consultation_date = models.DateField()
    consultation_time = models.TimeField()
    consultation_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='new_visit')
    
    chief_complaint = models.TextField()
    diagnosis = models.TextField()
    symptoms = models.TextField(help_text='Comma-separated symptoms', blank=True)
    
    blood_pressure = models.CharField(max_length=20, blank=True, null=True)
    heart_rate = models.CharField(max_length=20, blank=True, null=True)
    temperature = models.CharField(max_length=20, blank=True, null=True)
    weight = models.CharField(max_length=20, blank=True, null=True)
    height = models.CharField(max_length=20, blank=True, null=True)
    
    examination_findings = models.TextField(blank=True, null=True)
    treatment_plan = models.TextField()
    prescription_issued = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-consultation_date', '-consultation_time']
        verbose_name_plural = 'Consultation Histories'
    
    def save(self, *args, **kwargs):
        if not self.consultation_number:
            year = timezone.now().year
            last_consultation = ConsultationHistory.objects.filter(
                consultation_number__startswith=f"CONS-{year}-"
            ).order_by('-consultation_number').first()
            
            if last_consultation:
                last_number = int(last_consultation.consultation_number.split('-')[-1])
                next_number = last_number + 1
            else:
                next_number = 1
            
            self.consultation_number = f"CONS-{year}-{next_number:03d}"
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.consultation_number} - {self.patient.patient_id}"
    
    def get_consultation_type_display(self):
        return dict(self.TYPE_CHOICES).get(self.consultation_type, self.consultation_type)
    
    def get_symptoms_list(self):
        if self.symptoms:
            return [s.strip() for s in self.symptoms.split(',') if s.strip()]
        return []


class DoctorSchedule(models.Model):
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    SLOT_TYPE_CHOICES = [
        ('consultation', 'Consultation'),
    ]
    
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='schedules')
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_type = models.CharField(max_length=20, choices=SLOT_TYPE_CHOICES, default='consultation')
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['day_of_week', 'start_time']
    
    def __str__(self):
        return f"{self.doctor.doctor_id} - {self.get_day_of_week_display()} {self.start_time}-{self.end_time}"
    
    def save(self, *args, **kwargs):
        """
        Detects when doctor marks day as off and notifies affected patients
        """
        is_marking_off = False
        
        # Check if this is an existing schedule being marked as off
        if self.pk:
            try:
                old_schedule = DoctorSchedule.objects.get(pk=self.pk)
                if old_schedule.is_active and not self.is_active:
                    is_marking_off = True
            except DoctorSchedule.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        # If marking day as off, handle affected appointments
        if is_marking_off:
            self.handle_affected_appointments()
    
    def handle_affected_appointments(self):
        """
        Find and notify about appointments affected by marking day as off
        """
        # Map day_of_week to weekday number
        day_map = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        
        target_weekday = day_map.get(self.day_of_week)
        if target_weekday is None:
            return
        
        # Find upcoming appointments on this day of week (next 30 days)
        today = timezone.now().date()
        next_30_days = today + timedelta(days=30)
        
        # Get all dates in next 30 days that match this weekday
        affected_dates = []
        current_date = today
        while current_date <= next_30_days:
            if current_date.weekday() == target_weekday:
                affected_dates.append(current_date)
            current_date += timedelta(days=1)
        
        # Find appointments on these dates
        affected_appointments = Appointment.objects.filter(
            doctor=self.doctor,
            appointment_date__in=affected_dates,
            status__in=['pending', 'confirmed']
        ).select_related('patient__user')
        
        # Update status and send emails
        for appointment in affected_appointments:
            appointment.status = 'needs_rescheduling'
            appointment.save()
            
            # Send email notification
            self.send_reschedule_email(appointment)
    
    def send_reschedule_email(self, appointment):
        """
        Send email to patient about affected appointment
        """
        try:
            patient_email = appointment.patient.user.email
            if not patient_email:
                return
            
            doctor_name = self.doctor.user.get_full_name() or self.doctor.user.username
            patient_name = appointment.patient.user.get_full_name() or appointment.patient.user.username
            
            subject = '⚠️ Your Appointment Needs Rescheduling'
            
            # Create reschedule link
            reschedule_url = f'http://localhost:3000'
            
            # Render email template
            html_message = render_to_string('registration/appointment_reschedule_notification.html', {
                'patient_name': patient_name,
                'doctor_name': f'Dr. {doctor_name}',
                'appointment_date': appointment.appointment_date.strftime('%B %d, %Y'),
                'appointment_time': appointment.appointment_time.strftime('%I:%M %p'),
                'reschedule_link': reschedule_url,
                'appointment_id': appointment.id,
            })
            
            send_mail(
                subject,
                '',  # Plain text version (empty for now)
                'noreply@mediconnect.com',
                [patient_email],
                html_message=html_message,
                fail_silently=True,
            )
            
        except Exception as e:
            print(f"Error sending reschedule email: {e}")


class SharedConsultation(models.Model):
    consultation = models.ForeignKey(ConsultationHistory, on_delete=models.CASCADE, related_name='shared_records')
    shared_by = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='consultations_shared_by_me')
    shared_with = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='consultations_shared_with_me')
    message = models.TextField(blank=True, null=True)
    shared_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-shared_at']
        unique_together = ['consultation', 'shared_by', 'shared_with']

    def __str__(self):
        return f"{self.consultation.consultation_number} shared by {self.shared_by.doctor_id} to {self.shared_with.doctor_id}"