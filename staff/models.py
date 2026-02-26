from django.db import models, transaction, IntegrityError
from django.contrib.auth.models import User
from django.utils import timezone
import random
import string


class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staffprofile')
    staff_id = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='staff_photos/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def generate_random_code(self, length=6):
        """Generate random alphanumeric code (uppercase letters + digits)"""
        chars = ''.join([c for c in (string.ascii_uppercase + string.digits) 
                        if c not in 'O0I1'])  # Remove confusing characters
        return ''.join(random.choice(chars) for _ in range(length))

    def save(self, *args, **kwargs):
        if self.staff_id:
            return super().save(*args, **kwargs)

        year = timezone.now().year
        
        for attempt in range(10):
            try:
                with transaction.atomic():
                    random_code = self.generate_random_code(6)
                    self.staff_id = f"STF-{year}-{random_code}"
                    
                    if StaffProfile.objects.filter(staff_id=self.staff_id).exists():
                        continue
                    
                    super().save(*args, **kwargs)
                    return

            except IntegrityError:
                continue

        raise IntegrityError("Failed to generate unique staff_id after 10 attempts")

    def __str__(self):
        return f"{self.staff_id} - {self.user.get_full_name()}"


class LabReport(models.Model):
    STATUS_CHOICES = [
        ('normal', 'Normal'),
        ('abnormal', 'Abnormal'),
        ('critical', 'Critical'),
    ]

    CATEGORY_CHOICES = [
        ('hematology', 'Hematology'),
        ('biochemistry', 'Biochemistry'),
        ('endocrinology', 'Endocrinology'),
        ('microbiology', 'Microbiology'),
        ('radiology', 'Radiology'),
        ('other', 'Other'),
    ]

    report_number = models.CharField(max_length=20, unique=True, blank=True)
    patient = models.ForeignKey('patients.PatientProfile', on_delete=models.CASCADE, related_name='lab_reports')
    doctor = models.ForeignKey('doctors.DoctorProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='patient_lab_reports')
    uploaded_by = models.ForeignKey(StaffProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_reports')

    test_name    = models.CharField(max_length=200)
    test_date    = models.DateField()
    category     = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='normal')
    is_completed = models.BooleanField(default=False)
    findings     = models.TextField(blank=True, null=True)
    notes        = models.TextField(blank=True, null=True)
    report_file  = models.FileField(upload_to='lab_reports/', blank=True, null=True)
    report_image = models.ImageField(upload_to='lab_report_images/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.report_number:
            year = timezone.now().year
            count = LabReport.objects.count() + 1
            self.report_number = f"LAB-{year}-{count:04d}"
        super().save(*args, **kwargs)

    def get_category_display_name(self):
        return dict(self.CATEGORY_CHOICES).get(self.category, self.category.capitalize())

    def __str__(self):
        return f"{self.report_number} - {self.patient} - {self.test_name}"


class LabReportParameter(models.Model):
    STATUS_CHOICES = [
        ('Normal', 'Normal'),
        ('High', 'High'),
        ('Low', 'Low'),
    ]

    report = models.ForeignKey(LabReport, on_delete=models.CASCADE, related_name='parameters')
    name = models.CharField(max_length=100)
    value = models.CharField(max_length=100)
    unit = models.CharField(max_length=50, blank=True)
    normal_range = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Normal')

    def __str__(self):
        return f"{self.name}: {self.value} {self.unit}"