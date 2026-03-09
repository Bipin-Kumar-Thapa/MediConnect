from django.contrib import admin
from .models import SignupCode

@admin.register(SignupCode)
class SignupCodeAdmin(admin.ModelAdmin):
    list_display = ('role', 'code', 'is_used')  
    search_fields = ('role', 'code')


