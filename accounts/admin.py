from django.contrib import admin
from .models import SignupCode

@admin.register(SignupCode)
class SignupCodeAdmin(admin.ModelAdmin):
    list_display = ('role', 'code', 'is_used')  # Columns to show in the admin list view
    search_fields = ('role', 'code')  # Fields to be searchable in the admin panel


