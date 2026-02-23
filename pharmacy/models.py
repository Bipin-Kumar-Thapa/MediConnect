from django.db import models, transaction, IntegrityError
from django.contrib.auth.models import User
from django.utils import timezone

class PharmacyProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='pharmacyprofile'
    )
    
    # ✅ Auto-generated Pharmacy ID
    pharmacy_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        null=True,
        blank=True,
    )
    
    license_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if self.pharmacy_id:
            return super().save(*args, **kwargs)

        year = timezone.now().year

        for _ in range(5):  # retry safety
            try:
                with transaction.atomic():
                    last = (
                        PharmacyProfile.objects
                        .filter(pharmacy_id__startswith=f"PHARM-{year}-")
                        .order_by("-pharmacy_id")
                        .first()
                    )

                    if last:
                        last_number = int(last.pharmacy_id.split("-")[-1])
                        next_number = last_number + 1
                    else:
                        next_number = 1

                    self.pharmacy_id = f"PHARM-{year}-{next_number:03d}"
                    super().save(*args, **kwargs)
                    return

            except IntegrityError:
                continue  # retry with next number

        raise IntegrityError("Failed to generate unique pharmacy_id")
    
    def __str__(self):
        return f"{self.pharmacy_id} - Pharmacy ({self.user.get_full_name()})"


# ✅ MEDICINE STOCK MODEL
class Medicine(models.Model):
    UNIT_CHOICES = [
        ('tablet', 'Tablet'),
        ('capsule', 'Capsule'),
        ('syrup', 'Syrup'),
        ('injection', 'Injection'),
        ('drops', 'Drops'),
        ('cream', 'Cream'),
    ]
    
    name = models.CharField(max_length=255)
    generic_name = models.CharField(max_length=255, blank=True, null=True)
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    
    unit_type = models.CharField(max_length=50, choices=UNIT_CHOICES, default='tablet')
    quantity_in_stock = models.PositiveIntegerField(default=0)
    
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expiry_date = models.DateField(null=True, blank=True)
    
    description = models.TextField(blank=True, null=True)
    
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.unit_type})"
    
    @property
    def is_low_stock(self):
        """Check if stock is low (less than 50 units)"""
        return self.quantity_in_stock < 50


# ✅ MEDICINE SCHEDULE/TIMETABLE MODEL
class MedicineSchedule(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('discontinued', 'Discontinued'),
    ]
    
    prescription = models.ForeignKey(
        'doctors.Prescription',
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    prescribed_medicine = models.ForeignKey(
        'doctors.PrescribedMedicine',
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='schedules'
    )
    
    # Timing
    morning = models.BooleanField(default=False)
    afternoon = models.BooleanField(default=False)
    night = models.BooleanField(default=False)
    
    # Duration
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Stock tracking
    total_quantity = models.PositiveIntegerField(default=0)
    remaining_quantity = models.PositiveIntegerField(default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Additional info
    special_instructions = models.TextField(blank=True, null=True)
    side_effects = models.TextField(blank=True, null=True)
    purpose = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.prescribed_medicine.medicine_name} - Schedule"
    
    @property
    def is_low_stock(self):
        """Check if remaining quantity is low"""
        return self.remaining_quantity < 5
    
    @property
    def stock_percentage(self):
        """Calculate stock percentage"""
        if self.total_quantity == 0:
            return 0
        return (self.remaining_quantity / self.total_quantity) * 100
    
    def get_timing_display(self):
        """Return timing as readable string"""
        timings = []
        if self.morning:
            timings.append('Morning')
        if self.afternoon:
            timings.append('Afternoon')
        if self.night:
            timings.append('Night')
        return ', '.join(timings) if timings else 'Not scheduled'