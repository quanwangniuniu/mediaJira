from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
import uuid
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserProfileSerializer
from core.models import Team, Organization, Role
from access_control.models import UserRole

User = get_user_model()

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    def post(self, request):
        data = request.data
        email = data.get("email")
        password = data.get("password")
        username = data.get("username")
        organization_id = data.get("organization_id")

        if not email or not password or not username:
            return Response({"error": "Missing fields"}, status=400)

        if len(password) < 8:
            return Response({"error": "Password too short"}, status=400)

        # Check if the email is already registered (unique across all users)
        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already registered"}, status=400)

        # If org is provided, check that it exists
        organization = None
        if organization_id:
            try:
                organization = Organization.objects.get(id=organization_id)
            except Organization.DoesNotExist:
                return Response({"error": "Organization not found"}, status=400)

        verification_token = str(uuid.uuid4())
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_verified=False,
            verification_token=verification_token,
            organization=organization
        )

        # mock
        print(f"Send verification link: http://localhost:8000/auth/verify?token={verification_token}")

        return Response({"message": "User registered. Please verify email."}, status=201)
    
class VerifyEmailView(APIView):
    def get(self, request):
        token = request.GET.get("token")
        if not token:
            return Response({"error": "Missing token"}, status=400)

        try:
            user = User.objects.get(verification_token=token)
            if user.is_verified:
                return Response({"message": "Email already verified."})
            user.is_verified = True
            user.verification_token = None
            user.save()
            return Response({"message": "Email successfully verified."})
        except User.DoesNotExist:
            return Response({"error": "Invalid token"}, status=400)

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password required.'}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_verified:
            return Response({'error': 'User not verified'}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        profile_data = UserProfileSerializer(user).data
        return Response({
            'message': 'Login successful',
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': profile_data
        }, status=status.HTTP_200_OK)

class SsoRedirectView(APIView):
    def get(self, request):
        # Log the SSO redirect attempt
        print(f"[SSO DEBUG] Redirect requested - User IP: {request.META.get('REMOTE_ADDR')}")
        
        # Simulate redirect to SSO provider
        # In real SSO, you'd redirect to Okta/Azure AD with a state param
        redirect_url = "https://mock-sso-provider.com/auth?state=mockstate"
        
        print(f"[SSO DEBUG] Generated redirect URL: {redirect_url}")
        
        return Response({
            "redirect_url": redirect_url
        })

class SsoCallbackView(APIView):
    def get(self, request):
        # Log the SSO callback attempt
        print(f"[SSO DEBUG] Callback received - User IP: {request.META.get('REMOTE_ADDR')}")
        
        # Simulate SSO callback with a mock user
        mock_email = request.query_params.get("email", "buyer@agencyX.com")
        print(f"[SSO DEBUG] Processing email: {mock_email}")
        
        # Handle empty email parameter
        if not mock_email or mock_email.strip() == "":
            print(f"[SSO DEBUG] Error: Email parameter is required")
            return Response({"error": "Email parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate email format (basic check for @ symbol)
        if "@" not in mock_email:
            print(f"[SSO DEBUG] Error: Invalid email format - {mock_email}")
            return Response({"error": "Invalid email format."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use simple username generation to avoid conflicts
        import uuid
        username = f"user_{str(uuid.uuid4())[:8]}"
        
        domain = mock_email.split("@")[-1].lower()
        print(f"[SSO DEBUG] Extracted domain: {domain}")
        
        org = Organization.objects.filter(email_domain__iexact=domain).first()
        if not org:
            print(f"[SSO DEBUG] Error: No organization found for domain: {domain}")
            return Response({"error": "No organization found for this email domain."}, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"[SSO DEBUG] Found organization: {org.name}")

        # Find or create user
        user, created = User.objects.get_or_create(
            email=mock_email,
            defaults={
                "username": username,
                "is_verified": True,
                "is_active": True,
                "organization": org
            }
        )
        
        if created:
            print(f"[SSO DEBUG] Created new user: {user.email} with username: {user.username}")
        else:
            print(f"[SSO DEBUG] Found existing user: {user.email}")
        if not created:
            user.organization = org
            user.is_verified = True
            user.is_active = True
            user.save()

        # Assign default role (e.g., Media Buyer)
        default_role, _ = Role.objects.get_or_create(
            organization=org,
            name="Media Buyer",
            defaults={"level": 30}
        )
        UserRole.objects.get_or_create(user=user, role=default_role)

        # Generate token
        refresh = RefreshToken.for_user(user)
        profile_data = UserProfileSerializer(user).data
        
        print(f"[SSO DEBUG] SSO login successful for user: {user.email}")
        print(f"[SSO DEBUG] User roles: {profile_data.get('roles', [])}")
        
        return Response({
            "message": "SSO login successful",
            "token": str(refresh.access_token),
            "refresh": str(refresh),
            "user": profile_data
        }, status=status.HTTP_200_OK)


class MeView(APIView):
    """Get current logged-in user's data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        profile_data = UserProfileSerializer(request.user).data
        return Response(profile_data, status=status.HTTP_200_OK)