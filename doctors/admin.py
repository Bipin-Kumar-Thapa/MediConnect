from django.contrib import admin
from .models import DoctorProfile

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("doctor_id", "user", "specialization", "is_verified")
    search_fields = ("doctor_id", "user__username", "specialization")