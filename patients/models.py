from django.db import models, transaction, IntegrityError
from django.contrib.auth.models import User
from django.utils import timezone

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

    def save(self, *args, **kwargs):
        if self.patient_id:
            return super().save(*args, **kwargs)

        year = timezone.now().year

        for _ in range(5):  # retry safety
            try:
                with transaction.atomic():
                    last = (
                        PatientProfile.objects
                        .filter(patient_id__startswith=f"PAT-{year}-")
                        .order_by("-patient_id")
                        .first()
                    )

                    if last:
                        last_number = int(last.patient_id.split("-")[-1])
                        next_number = last_number + 1
                    else:
                        next_number = 1

                    self.patient_id = f"PAT-{year}-{next_number:03d}"
                    super().save(*args, **kwargs)
                    return

            except IntegrityError:
                continue  # retry with next number

        raise IntegrityError("Failed to generate unique patient_id")

    def __str__(self):
        return f"{self.patient_id} - {self.user.username}"
    
    def get_gender_display_short(self):
        """Return short gender display (Male, Female, Other)"""
        return dict(self.GENDER_CHOICES).get(self.gender, None)