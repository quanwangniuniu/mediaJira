import stripe
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .permissions import OrganizationAccessTokenAuthentication
from .models import Plan, Subscription, UsageDaily, Payment
from .serializers import (
    PlanSerializer, SubscriptionSerializer, UsageDailySerializer, CheckoutSessionSerializer, OrganizationSerializer, UserSerializer
)
from core.models import Organization, CustomUser

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
@api_view(['GET'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def list_plans(request):
    """List all available subscription plans"""
    try:
        plans = Plan.objects.all()
        serializer = PlanSerializer(plans, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'PLANS_RETRIEVAL_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def switch_plan(request):
    """Switch user's subscription to a different plan"""
    try:
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response(
                {'error': 'plan_id is required', 'code': 'MISSING_PLAN_ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        try:
            new_plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response(
                {'error': 'Plan not found', 'code': 'PLAN_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if trying to switch to free plan (not allowed)
        if new_plan.name.lower() == 'free':
            return Response(
                {'error': 'Cannot switch to free plan', 'code': 'FREE_PLAN_NOT_ALLOWED'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get current subscription
        current_subscription = Subscription.objects.filter(
            organization=user.organization,
            is_active=True
        ).first()
        
        if not current_subscription:
            return Response(
                {'error': 'No active subscription found', 'code': 'NO_SUBSCRIPTION'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already on the same plan
        if current_subscription.plan.id == new_plan.id:
            return Response(
                {'error': 'Already subscribed to this plan', 'code': 'SAME_PLAN'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get current subscription item ID from Stripe
        stripe_subscription = stripe.Subscription.retrieve(current_subscription.stripe_subscription_id)
        current_item_id = stripe_subscription['items']['data'][0]['id']
        
        # Update subscription in Stripe
        stripe.Subscription.modify(
            current_subscription.stripe_subscription_id,
            items=[{
                'id': current_item_id,
                'price': new_plan.stripe_price_id,
            }],
            proration_behavior='create_prorations'  # Handle prorations for plan changes
        )
        
        # Update local subscription
        current_subscription.plan = new_plan
        current_subscription.save()
        
        return Response({
            'success': True,
            'message': f'Successfully switched to {new_plan.name} plan',
            'new_plan': {
                'id': new_plan.id,
                'name': new_plan.name,
                'stripe_price_id': new_plan.stripe_price_id
            }
        })
        
    except stripe.StripeError as e:
        return Response(
            {'error': str(e), 'code': 'STRIPE_ERROR'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'PLAN_SWITCH_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def get_subscription(request):
    """Get current user's subscription"""
    try:
        user = request.user
        subscription = Subscription.objects.filter(
            organization=user.organization,
            is_active=True
        ).first()
        
        if not subscription:
            return Response(
                {'error': 'No active subscription found', 'code': 'NO_SUBSCRIPTION'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'SUBSCRIPTION_RETRIEVAL_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """Cancel user's active subscription"""
    try:
        user = request.user
        subscription = Subscription.objects.filter(
            organization=user.organization,
            is_active=True
        ).first()
        
        if not subscription:
            return Response(
                {'error': 'No active subscription found', 'code': 'NO_SUBSCRIPTION'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel subscription in Stripe
        stripe.Subscription.cancel(subscription.stripe_subscription_id)
        
        return Response({'success': True})
        
    except stripe.StripeError as e:
        return Response(
            {'error': str(e), 'code': 'STRIPE_ERROR'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'CANCEL_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def create_organization(request):
    """Create a new organization"""
    try:
        name = request.data.get('name')
        description = request.data.get('description', '')
        
        if not name:
            return Response(
                {'error': 'name is required', 'code': 'MISSING_NAME'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        organization = Organization.objects.create(
            name=name,
            desc=description
        )
        
        # Assign user to organization
        user = request.user
        user.organization = organization
        user.save()
        
        serializer = OrganizationSerializer(organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'ORGANIZATION_CREATION_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def leave_organization(request):
    """Remove current user from their organization"""
    try:
        user = request.user
        
        if not user.organization:
            return Response(
                {'error': 'User is not in any organization', 'code': 'NO_ORGANIZATION'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove user from organization
        user.organization = None
        user.save()
        
        return Response({
            'success': True,
            'message': 'Successfully left organization'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'LEAVE_ORGANIZATION_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create Stripe checkout session for subscription"""
    try:
        serializer = CheckoutSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        plan_id = serializer.validated_data['plan_id']
        success_url = serializer.validated_data['success_url']
        cancel_url = serializer.validated_data['cancel_url']
        
        plan = Plan.objects.get(id=plan_id)
        user = request.user
        
        # Create or get Stripe customer
        customer_email = user.email
        customers = stripe.Customer.list(email=customer_email, limit=1)
        
        if customers.data and len(customers.data) > 0:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(
                name=user.username,
                email=customer_email
            )
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=[{
                'price': plan.stripe_price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        return Response({
            'session_id': session.id,
            'url': session.url
        })
        
    except Plan.DoesNotExist:
        return Response(
            {'error': 'Plan not found', 'code': 'PLAN_NOT_FOUND'},
            status=status.HTTP_404_NOT_FOUND
        )
    except stripe.StripeError as e:
        return Response(
            {'error': str(e), 'code': 'STRIPE_ERROR'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'CHECKOUT_SESSION_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def get_usage(request):
    """Get current user's usage statistics"""
    try:
        user = request.user
        usage = UsageDaily.objects.filter(user=user).order_by('-date')
        
        # Get current month usage
        now = datetime.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        current_month_usage = usage.filter(date__gte=start_of_month)
        
        total_previews = sum(u.previews_used for u in current_month_usage)
        total_tasks = sum(u.tasks_used for u in current_month_usage)
        
        return Response({
            'current_month': {
                'previews_used': total_previews,
                'tasks_used': total_tasks
            },
            'daily_usage': UsageDailySerializer(current_month_usage, many=True).data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'USAGE_RETRIEVAL_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([OrganizationAccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def record_usage(request):
    """Record daily usage for a user"""
    try:
        # Get the authenticated user
        user = request.user
        
        # Parse request data
        data = request.data.copy()
        data['user'] = user.id  # Add user to data for serializer
        
        serializer = UsageDailySerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if usage already exists for this date
        date = serializer.validated_data['date']
        
        usage, created = UsageDaily.objects.get_or_create(
            user=user,
            date=date,
            defaults={
                'previews_used': serializer.validated_data.get('previews_used', 0),
                'tasks_used': serializer.validated_data.get('tasks_used', 0)
            }
        )
        
        if not created:
            # Update existing usage
            usage.previews_used += serializer.validated_data.get('previews_used', 0)
            usage.tasks_used += serializer.validated_data.get('tasks_used', 0)
            usage.save()
        
        return Response(UsageDailySerializer(usage).data)
        
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'USAGE_RECORDING_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook(request):
    """Handle Stripe webhook events"""
    try:
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return JsonResponse({'error': 'Invalid payload'}, status=400)
        except stripe.SignatureVerificationError:
            return JsonResponse({'error': 'Invalid signature'}, status=400)
        
        # Handle the event
        if event['type'] == 'checkout.session.completed':
            handle_checkout_completed(event['data']['object'])
        elif event['type'] == 'customer.subscription.created':
            handle_subscription_created(request.user, event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        elif event['type'] == 'invoice.payment_succeeded':
            handle_payment_succeeded(event['data']['object'])
        
        return JsonResponse({'received': True})
        
    except Exception as e:
        return JsonResponse(
            {'error': str(e), 'code': 'WEBHOOK_ERROR'},
            status=500
        )


def handle_checkout_completed(session):
    """Handle successful checkout session completion"""
    try:
        # Do not create local records here. Rely on subscription/invoice webhooks
        # for source-of-truth updates. Optionally log metadata for correlation.
        return
            
    except Exception as e:
        print(f"Error handling checkout completed: {e}")


def handle_subscription_created(user,subscription_data):
    """Handle new subscription creation"""
    try:
        organization = user.organization
        if not organization:
            raise Exception("Organization not found")

        # Determine plan via primary item price
        items = subscription_data.get('items', {}).get('data', [])
        price_id = items[0]['price']['id'] if items else None
        plan = Plan.objects.filter(stripe_price_id=price_id).first() if price_id else None

        # Upsert subscription by Stripe ID
        Subscription.objects.update_or_create(
            stripe_subscription_id=subscription_data['id'],
            defaults={
                'organization': organization,
                'plan': plan,
                'start_date': datetime.fromtimestamp(subscription_data['current_period_start']) if subscription_data.get('current_period_start') else None,
                'end_date': datetime.fromtimestamp(subscription_data['current_period_end']) if subscription_data.get('current_period_end') else None,
                'is_active': subscription_data.get('status') == 'active'
            }
        )
            
    except Subscription.DoesNotExist:
        pass
    except Exception as e:
        print(f"Error handling subscription created: {e}")


def handle_payment_succeeded(invoice_data):
    """Handle successful payment"""
    try:
        stripe_subscription_id = invoice_data.get('subscription')
        subscription = Subscription.objects.filter(
            stripe_subscription_id=stripe_subscription_id
        ).first()

        # Resolve user via customer metadata
        customer_id = invoice_data.get('customer')
        customer = stripe.Customer.retrieve(customer_id) if customer_id else None
        user = None
        if customer and getattr(customer, 'metadata', None):
            user_id = customer.metadata.get('user_id')
            user = CustomUser.objects.filter(id=user_id).first()

        # Extract price/product from invoice lines
        lines = invoice_data.get('lines', {}).get('data', [])
        price_id = lines[0]['price']['id'] if lines and lines[0].get('price') else None
        product_id = lines[0]['price']['product'] if lines and lines[0].get('price') else None

        if subscription and user:
            Payment.objects.create(
                user=user,
                subscription=subscription,
                stripe_product_id=product_id,
                stripe_price_id=price_id,
                stripe_customer_id=customer_id,
                is_active=True
            )
        else:
            print("handle_payment_succeeded: missing subscription or user; skipping Payment create")
    except Exception as e:
        print(f"Error handling payment succeeded: {e}")


def handle_subscription_updated(subscription_data):
    """Handle subscription updates"""
    try:
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_data['id']
        )
        subscription.is_active = subscription_data['status'] == 'active'
        subscription.save()
    except Exception as e:
        print(f"Error handling subscription updated: {e}")

def handle_subscription_deleted(subscription_data):
    """Handle subscription cancellation"""
    try:
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_data['id']
        )
        subscription.is_active = False
        subscription.save()
    except Exception as e:
        print(f"Error handling subscription deleted: {e}")