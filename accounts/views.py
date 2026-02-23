from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
import json
from django.contrib.auth.models import User
# from django.shortcuts import render
# from .models import PatientProfile, DoctorProfile, StaffProfile, PharmacyProfile
from .models import SignupCode
# from django.contrib.auth import hashers
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import ensure_csrf_cookie
from patients.models import PatientProfile
from doctors.models import DoctorProfile
from staff.models import StaffProfile

@csrf_protect
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        # Get user by email
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({'message': 'Invalid credentials'}, status=400)

        user = authenticate(
            request,
            username=user_obj.username,
            password=password
        )

        if user is None:
            return JsonResponse({'message': 'Invalid credentials'}, status=400)

        login(request, user)

        if hasattr(user, 'doctorprofile'):
            role = 'doctor'
        elif hasattr(user, 'staffprofile'):
            role = 'staff'
        elif hasattr(user, 'pharmacyprofile'):
            role = 'pharmacy'
        elif hasattr(user, 'patientprofile'):
            role = 'patient'
        else:
            role = 'unknown'

        return JsonResponse({
            'message': 'Login successful',
            'role': role,
            'redirect_url': '/accounts/redirect/'
        }, status=200)

    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_protect
def signup_view(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)

        first_name = data.get('first_name')
        last_name = data.get('last_name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        validation_code = data.get('validation_code')

        if User.objects.filter(email=email).exists():
            return JsonResponse({'message': 'Email already exists'}, status=400)

        signup_code_obj = None

        # signup code for non-patient roles
        if role != 'patient':
            try:
                signup_code_obj = SignupCode.objects.get(
                    role=role,
                    code=validation_code,
                    is_used=False
                )
            except SignupCode.DoesNotExist:
                return JsonResponse(
                    {'message': 'Invalid or already used signup code'},
                    status=400
                )

        if role == 'pharmacy' and PharmacyProfile.objects.exists():
            return JsonResponse(
                {'message': 'Pharmacy already exists'},
                status=400
            )

        # Create user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        # Create role profile
        if role == 'patient':
            PatientProfile.objects.get_or_create(user=user)
        elif role == 'doctor':
            DoctorProfile.objects.get_or_create(user=user)
        elif role == 'staff':
            StaffProfile.objects.create(user=user)
        elif role == 'pharmacy':
            PharmacyProfile.objects.create(user=user)
        else:
            return JsonResponse({'message': 'Invalid role'}, status=400)

        # signup code as used AFTER successful signup
        if signup_code_obj:
            signup_code_obj.is_used = True
            signup_code_obj.save()

        return JsonResponse({'message': 'Signup successful'}, status=200)

    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@login_required
def google_redirect(request):
    user = request.user
    if (
        hasattr(user, 'doctorprofile') or
        hasattr(user, 'staffprofile') or
        hasattr(user, 'pharmacyprofile')
    ):
        from django.contrib.auth import logout
        logout(request)
        return redirect("http://localhost:3000/login?error=google_not_allowed")

    # Google users are patients only
    PatientProfile.objects.get_or_create(user=user)

    return redirect("http://localhost:3000/patient")



@csrf_protect
def reset_password_confirm(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)

    try:
        data = json.loads(request.body)

        uid = data.get('uid')
        token = data.get('token')
        password = data.get('password')

        user_id = urlsafe_base64_decode(uid).decode()
        user = User.objects.get(pk=user_id)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return JsonResponse({'error': 'Invalid token'}, status=400)

        user.set_password(password)
        user.save()

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'error': 'Something went wrong'}, status=400)

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'message': 'CSRF cookie set'})



@login_required
def post_login_redirect(request):
    user = request.user

    if hasattr(user, 'doctorprofile'):
        return redirect("doctor_home")

    if hasattr(user, 'staffprofile'):
        return redirect("staff_home")

    if hasattr(user, 'pharmacyprofile'):
        return redirect("pharmacy_home")

    if hasattr(user, 'patientprofile'):
        return redirect("patient-overview")

    return redirect("login")