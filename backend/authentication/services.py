from django.core.exceptions import ValidationError
from stripe_meta.permissions import generate_organization_access_token


def refresh_organization_access_token(user):
    """
    Generate a fresh organization access token for the authenticated user.
    """
    if not user.organization:
        raise ValidationError("User does not belong to an organization.")

    token = generate_organization_access_token(user)
    if not token:
        raise ValidationError("Unable to generate organization token.")

    return token
