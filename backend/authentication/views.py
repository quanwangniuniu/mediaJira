from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    def post(self, request):
        data = request.data
        email = data.get("email")
        password = data.get("password")
        name = data.get("name")
        org_code = data.get("org_code")

        if not email or not password or not name:
            return Response({"error": "Missing fields"}, status=400)

        if len(password) < 8:
            return Response({"error": "Password too short"}, status=400)

        if User.objects.filter(email=email, org_code=org_code).exists():
            return Response({"error": "Email already exists"}, status=400)

        verification_token = str(uuid.uuid4())

        user = User.objects.create_user(
            email=email,
            password=password,
            name=name,
            org_code=org_code,
            is_verified=False,
            verification_token=verification_token
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