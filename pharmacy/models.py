from django.db import models, transaction, IntegrityError
from django.contrib.auth.models import User
from django.utils import timezone
import random
import string


class PharmacyProfile(models.Model):
    """Pharmacy staff profile with random ID generation"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='pharmacyprofile')
    pharmacy_id = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    specialization = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True, default='Pharmacy')
    shift = models.CharField(max_length=100, blank=True, null=True)
    years_of_experience = models.IntegerField(blank=True, null=True, default=0)
    profile_photo = models.ImageField(upload_to='pharmacy_photos/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def generate_random_code(self, length=6):
        """Generate random alphanumeric code (uppercase letters + digits)"""
        chars = ''.join([c for c in (string.ascii_uppercase + string.digits) 
                        if c not in 'O0I1'])  # Remove confusing characters
        return ''.join(random.choice(chars) for _ in range(length))

    def save(self, *args, **kwargs):
        if self.pharmacy_id:
            return super().save(*args, **kwargs)

        year = timezone.now().year
        
        for attempt in range(10):
            try:
                with transaction.atomic():
                    random_code = self.generate_random_code(6)
                    self.pharmacy_id = f"PHR-{year}-{random_code}"
                    
                    if PharmacyProfile.objects.filter(pharmacy_id=self.pharmacy_id).exists():
                        continue
                    
                    super().save(*args, **kwargs)
                    return

            except IntegrityError:
                continue

        raise IntegrityError("Failed to generate unique pharmacy_id after 10 attempts")

    def __str__(self):
        return f"{self.pharmacy_id} - {self.user.get_full_name()}"


class Medicine(models.Model):
    """Medicine inventory"""
    UNIT_TYPE_CHOICES = [
        ('tablet', 'Tablet'),
        ('capsule', 'Capsule'),
        ('syrup', 'Syrup'),
        ('injection', 'Injection'),
        ('drops', 'Drops'),
        ('cream', 'Cream'),
        ('inhaler', 'Inhaler'),
        ('other', 'Other'),
    ]

    CATEGORY_CHOICES = [
        ('antibiotic', 'Antibiotic'),
        ('painkiller', 'Painkiller'),
        ('antiviral', 'Antiviral'),
        ('antifungal', 'Antifungal'),
        ('vitamin', 'Vitamin/Supplement'),
        ('cardiac', 'Cardiac'),
        ('diabetes', 'Diabetes'),
        ('respiratory', 'Respiratory'),
        ('gastrointestinal', 'Gastrointestinal'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, blank=True, null=True)
    generic_name = models.CharField(max_length=200, blank=True, null=True)
    manufacturer = models.CharField(max_length=200, blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    unit_type = models.CharField(max_length=20, choices=UNIT_TYPE_CHOICES, default='tablet')
    
    # Stock management
    quantity_in_stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=50)  # Alert when stock reaches this level
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Additional info
    description = models.TextField(blank=True, null=True)
    side_effects = models.TextField(blank=True, null=True)
    storage_instructions = models.TextField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    
    # Tracking
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.unit_type})"

    @property
    def is_low_stock(self):
        """Check if medicine is below reorder level"""
        return self.quantity_in_stock <= self.reorder_level

    @property
    def stock_status(self):
        """Return stock status"""
        if self.quantity_in_stock == 0:
            return 'out_of_stock'
        elif self.is_low_stock:
            return 'low_stock'
        else:
            return 'in_stock'


class MedicineSchedule(models.Model):
    """Track patient medicine schedules"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
    ]

    prescription = models.ForeignKey('doctors.Prescription', on_delete=models.CASCADE, related_name='medicine_schedules')
    prescribed_medicine = models.ForeignKey('doctors.PrescribedMedicine', on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Schedule details
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Timing
    morning = models.BooleanField(default=False)
    afternoon = models.BooleanField(default=False)
    night = models.BooleanField(default=False)
    
    # Inventory tracking
    total_quantity = models.IntegerField(default=0)  # Total pills/doses needed
    remaining_quantity = models.IntegerField(default=0)  # Pills/doses remaining
    
    # Additional info
    purpose = models.TextField(blank=True, null=True)
    side_effects = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.prescribed_medicine.medicine_name} - {self.prescription.patient.user.get_full_name()}"

    @property
    def stock_percentage(self):
        """Calculate remaining stock percentage"""
        if self.total_quantity == 0:
            return 0
        return int((self.remaining_quantity / self.total_quantity) * 100)


class PharmacyFulfillment(models.Model):
    """Track pharmacy fulfillment of prescriptions"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Assignment'),
        ('fulfilled', 'Fully Fulfilled'),
        ('partial', 'Partially Fulfilled'),
        ('on_hold', 'On Hold'),
        ('cancelled', 'Cancelled by Patient'),
    ]
    
    prescription = models.OneToOneField(
        'doctors.Prescription',
        on_delete=models.CASCADE,
        related_name='pharmacy_fulfillment'
    )
    
    pharmacy_profile = models.ForeignKey(
        PharmacyProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fulfillments'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.prescription.prescription_number} - {self.status}"


class FulfilledMedicine(models.Model):
    """Track individual medicines fulfilled from a prescription"""
    
    fulfillment = models.ForeignKey(
        PharmacyFulfillment,
        on_delete=models.CASCADE,
        related_name='fulfilled_medicines'
    )
    
    prescribed_medicine = models.ForeignKey(
        'doctors.PrescribedMedicine',
        on_delete=models.CASCADE
    )
    
    stock_medicine = models.ForeignKey(
        Medicine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    quantity_dispensed = models.IntegerField()
    quantity_requested = models.IntegerField()
    
    dispensed_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.prescribed_medicine.medicine_name} - {self.quantity_dispensed}/{self.quantity_requested}"