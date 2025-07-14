# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('email', 'username', 'is_verified', 'org_code', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('is_verified', 'org_code')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)