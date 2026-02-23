from django.urls import path
from django.contrib.auth import views as auth_views
from . import views  
from .views import post_login_redirect

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'), 
    path('google-redirect/', views.google_redirect, name='google_redirect'), 
    path('password-reset/', auth_views.PasswordResetView.as_view(success_url='/accounts/password-reset/'), name='password_reset'),
    path('reset-password-confirm/',views.reset_password_confirm,name='reset_password_confirm'),
    path('get-csrf/',views.get_csrf_token,name='get_csrf'),
    path("redirect/", post_login_redirect, name="post_login_redirect"),
]