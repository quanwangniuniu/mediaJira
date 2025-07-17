from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
import uuid
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserProfileSerializer
from access_control.models import Role, Team, Organization

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