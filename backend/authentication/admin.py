# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
User = get_user_model()

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'username', 'is_verified', 'organization', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('is_verified', 'organization')}),
    )

admin.site.register(User, CustomUserAdmin)