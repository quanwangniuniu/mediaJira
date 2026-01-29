"""
Utility functions for handling project invitations and email sending.
"""
import secrets
import logging
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse

from core.models import ProjectInvitation

logger = logging.getLogger(__name__)


def generate_invitation_token():
    """Generate a secure random token for invitations"""
    return secrets.token_urlsafe(32)


def create_project_invitation(
    email,
    project,
    invited_by,
    role='member',
    expires_days=7,
    auto_approve=False,
):
    """
    Create a project invitation and send email.
    
    Args:
        email: Email address of the invited user
        project: Project instance
        invited_by: User who is sending the invitation
        role: Role for the invited user (default: 'member')
        expires_days: Number of days until invitation expires (default: 7)
    
    Returns:
        ProjectInvitation instance
    """
    # Check if there's already a pending invitation
    existing_invitation = ProjectInvitation.objects.filter(
        email=email,
        project=project,
        accepted=False
    ).first()
    
    if existing_invitation and not existing_invitation.is_expired():
        return existing_invitation
    
    # Create new invitation
    token = generate_invitation_token()
    expires_at = timezone.now() + timedelta(days=expires_days)
    
    invitation = ProjectInvitation.objects.create(
        email=email,
        project=project,
        role=role,
        invited_by=invited_by,
        token=token,
        expires_at=expires_at,
        approved=auto_approve,
        approved_by=invited_by if auto_approve else None,
        approved_at=timezone.now() if auto_approve else None,
    )
    
    if auto_approve:
        send_invitation_email(invitation)
    
    return invitation


def send_invitation_email(invitation):
    """
    Send invitation email to the invited user.
    
    Args:
        invitation: ProjectInvitation instance
    """
    try:
        # Get project name safely (handle case where project model fields don't exist)
        try:
            project_name = invitation.project.name
        except Exception:
            # Fallback: get project name from database directly
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT name FROM core_project WHERE id = %s", [invitation.project_id])
                row = cursor.fetchone()
                project_name = row[0] if row else "a project"
        
        # Get inviter name safely
        try:
            inviter_name = invitation.invited_by.get_full_name() or invitation.invited_by.email
        except Exception:
            inviter_name = invitation.invited_by.email if invitation.invited_by else "a team member"
        
        # Build invitation URL
        # In production, this should use the frontend URL from settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        accept_url = f"{frontend_url}/accept-invitation?token={invitation.token}"
        
        # Email subject
        subject = f"You've been invited to join {project_name}"
        
        # Email body (plain text)
        message = f"""
Hello,

You have been invited by {inviter_name} to join the project "{project_name}".

Click the link below to accept the invitation:
{accept_url}

This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}.

If you don't have an account yet, you'll be able to create one when you accept the invitation.

Best regards,
The MediaJira Team
"""
        
        # HTML email body (optional, for better formatting)
        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>You've been invited to join {project_name}</h2>
        <p>Hello,</p>
        <p>You have been invited by <strong>{inviter_name}</strong> to join the project <strong>"{project_name}"</strong>.</p>
        <p>
            <a href="{accept_url}" class="button">Accept Invitation</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #007bff;">{accept_url}</p>
        <p><small>This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}.</small></p>
        <p>If you don't have an account yet, you'll be able to create one when you accept the invitation.</p>
        <div class="footer">
            <p>Best regards,<br>The MediaJira Team</p>
        </div>
    </div>
</body>
</html>
"""
        
        # Get email settings
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@mediajira.com')
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Invitation email sent to {invitation.email} for project {invitation.project.name}")
        
    except Exception as e:
        logger.error(f"Failed to send invitation email to {invitation.email}: {e}")
        # Don't raise - invitation is still created even if email fails
        # Log the error but allow invitation creation to succeed


def accept_invitation(token, user=None, password=None, username=None):
    """
    Accept a project invitation.
    
    Args:
        token: Invitation token
        user: Existing user (if None, will create new user)
        password: Password for new user (required if user is None)
        username: Username for new user (optional)
    
    Returns:
        tuple: (invitation, user, created) - created indicates if user was newly created
    """
    from django.contrib.auth import get_user_model
    from core.models import ProjectMember
    
    User = get_user_model()
    
    # Find invitation
    try:
        invitation = ProjectInvitation.objects.get(token=token, accepted=False)
    except ProjectInvitation.DoesNotExist:
        raise ValueError("Invalid or already accepted invitation token")

    if not invitation.approved:
        raise ValueError("Invitation is pending owner approval")

    # Check if expired
    if invitation.is_expired():
        raise ValueError("Invitation has expired")
    
    # Check if user exists
    try:
        user = User.objects.get(email=invitation.email)
        user_created = False
    except User.DoesNotExist:
        # Create new user
        if not password:
            raise ValueError("Password is required to create a new account")
        
        username = username or invitation.email.split('@')[0]
        # Ensure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User.objects.create_user(
            username=username,
            email=invitation.email,
            password=password,
            is_verified=True,  # Auto-verify invited users
            organization=invitation.project.organization
        )
        user_created = True
    
    # Create or reactivate project membership
    ProjectMember.objects.update_or_create(
        user=user,
        project=invitation.project,
        defaults={
            'role': invitation.role,
            'is_active': True,
        },
    )
    
    # Ensure prior accepted invites do not conflict with unique constraints
    ProjectInvitation.objects.filter(
        email=invitation.email,
        project=invitation.project,
        accepted=True,
    ).exclude(id=invitation.id).delete()

    # Mark invitation as accepted
    invitation.accepted = True
    invitation.accepted_at = timezone.now()
    invitation.save()
    
    return invitation, user, user_created
