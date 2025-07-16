# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('email', 'username', 'is_verified', 'organization', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('is_verified', 'organization')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)