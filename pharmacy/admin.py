from django.contrib import admin
from .models import PharmacyProfile, Medicine, MedicineSchedule, PharmacyFulfillment, FulfilledMedicine


@admin.register(PharmacyProfile)
class PharmacyProfileAdmin(admin.ModelAdmin):
    list_display = ['pharmacy_id', 'user', 'phone_number', 'department', 'is_active', 'created_at']
    list_filter = ['is_active', 'department', 'created_at']
    search_fields = ['pharmacy_id', 'user__username', 'user__first_name', 'user__last_name', 'phone_number']
    readonly_fields = ['pharmacy_id', 'created_at', 'updated_at']


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ['name', 'generic_name', 'category', 'unit_type', 'quantity_in_stock', 'stock_status', 'is_active']
    list_filter = ['category', 'unit_type', 'is_active']
    search_fields = ['name', 'generic_name', 'manufacturer']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(MedicineSchedule)
class MedicineScheduleAdmin(admin.ModelAdmin):
    list_display = ['prescribed_medicine', 'prescription', 'start_date', 'end_date', 'status']
    list_filter = ['status', 'start_date', 'end_date']
    search_fields = ['prescribed_medicine__medicine_name', 'prescription__patient__user__first_name']


# ✅ NEW ADMINS
@admin.register(PharmacyFulfillment)
class PharmacyFulfillmentAdmin(admin.ModelAdmin):
    list_display = ['prescription', 'pharmacy_profile', 'status', 'fulfilled_at', 'created_at']
    list_filter = ['status', 'created_at', 'fulfilled_at']
    search_fields = ['prescription__prescription_number', 'prescription__patient__user__first_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FulfilledMedicine)
class FulfilledMedicineAdmin(admin.ModelAdmin):
    list_display = ['fulfillment', 'prescribed_medicine', 'stock_medicine', 'quantity_dispensed', 'quantity_requested', 'dispensed_at']
    list_filter = ['dispensed_at']
    search_fields = ['prescribed_medicine__medicine_name', 'stock_medicine__name']