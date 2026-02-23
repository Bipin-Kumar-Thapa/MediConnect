from django.db import models
from django.contrib.auth.models import User

class SignupCode(models.Model):
    ROLE_CHOICES = [
        ('doctor', 'Doctor'),
        ('staff', 'Staff'),
        ('pharmacy', 'Pharmacy'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    code = models.CharField(max_length=20, unique=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.role} - {self.code}"
