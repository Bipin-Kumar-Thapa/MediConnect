from django.db import models, transaction, IntegrityError
from django.contrib.auth.models import User
from django.utils import timezone
import random
import string

class PatientProfile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='patientprofile'
    )
    patient_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        null=True,
        blank=True,
    )

    # Contact Information
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=10, blank=True, null=True)

    # Personal Information
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    blood_group = models.CharField(max_length=5, null=True, blank=True)
    
    # Profile Photo
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=150, blank=True, null=True)
    emergency_contact_relation = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def generate_random_code(self, length=6):
        chars = ''.join([c for c in (string.ascii_uppercase + string.digits) 
                        if c not in 'O0I1'])
        return ''.join(random.choice(chars) for _ in range(length))

    def save(self, *args, **kwargs):
        if self.patient_id:
            return super().save(*args, **kwargs)

        year = timezone.now().year

        for attempt in range(10):
            try:
                with transaction.atomic():
                    # Generate random code
                    random_code = self.generate_random_code(6)
                    
                    self.patient_id = f"PAT-{year}-{random_code}"
                    
                    if PatientProfile.objects.filter(patient_id=self.patient_id).exists():
                        continue  
                    
                    super().save(*args, **kwargs)
                    return

            except IntegrityError:
                continue

        raise IntegrityError("Failed to generate unique patient_id after 10 attempts")

    def __str__(self):
        return f"{self.patient_id} - {self.user.username}"
    
    def get_gender_display_short(self):
        return dict(self.GENDER_CHOICES).get(self.gender, None)
