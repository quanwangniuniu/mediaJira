import stripe
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .permissions import HasValidOrganizationToken
from .models import Plan, Subscription, UsageDaily, Payment
from .serializers import (
    PlanSerializer, SubscriptionSerializer, UsageDailySerializer, CheckoutSessionSerializer, 
    OrganizationSerializer, CreateOrganizationSerializer, OrganizationUserSerializer
)
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from core.models import Organization, CustomUser

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
def list_plans(request):
    """List all available subscription plans"""
    try:
        plans = Plan.objects.all()
        
        # Fetch prices from Stripe and attach to plans
        plans_with_prices = []
        for plan in plans:
            if plan.stripe_price_id:
                try:
                    stripe_price = stripe.Price.retrieve(plan.stripe_price_id)
                    # Attach price info to plan object
                    plan._price = stripe_price.unit_amount / 100  # Convert from cents to dollars
                    plan._currency = stripe_price.currency.upper()
                except stripe.error.StripeError as e:
                    # If Stripe price doesn't exist, set price to None
                    plan._price = None
                    plan._currency = None
            else:
                # If no stripe_price_id, assume free plan
                plan._price = 0
                plan._currency = 'USD'
            
            plans_with_prices.append(plan)
        
        # Sort plans by price (lowest to highest)
        plans_sorted = sorted(plans_with_prices, key=lambda p: p._price if p._price is not None else float('inf'))
        
        serializer = PlanSerializer(plans_sorted, many=True)
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
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
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
        
        # Get current subscription item ID and price from Stripe
        stripe_subscription = stripe.Subscription.retrieve(current_subscription.stripe_subscription_id)
        current_item_id = stripe_subscription['items']['data'][0]['id']
        
        # Get prices to determine if upgrade or downgrade
        current_price_data = stripe.Price.retrieve(current_subscription.plan.stripe_price_id)
        new_price_data = stripe.Price.retrieve(new_plan.stripe_price_id)
        current_price = current_price_data.unit_amount / 100  # Convert cents to dollars
        new_price = new_price_data.unit_amount / 100
        
        is_upgrade = new_price > current_price
        
        # Update subscription in Stripe based on upgrade/downgrade
        if is_upgrade:
            # UPGRADE: Immediate switch with proration
            stripe.Subscription.modify(
                current_subscription.stripe_subscription_id,
                items=[{
                    'id': current_item_id,
                    'price': new_plan.stripe_price_id,
                }],
                proration_behavior='always_invoice'  # Charge prorated amount immediately
            )
            # DON'T update local subscription - webhook will handle it
            # The subscription.updated webhook will update the plan when upgrade completes
            
            return Response({
                'requested': True
            })
        else:
            # DOWNGRADE: Immediate switch with no refund
            stripe.Subscription.modify(
                current_subscription.stripe_subscription_id,
                items=[{
                    'id': current_item_id,
                    'price': new_plan.stripe_price_id,
                }],
                proration_behavior='none'  # No refund or proration
            )
            # DON'T update local subscription - webhook will handle it
            # The subscription.updated webhook will update the plan when downgrade completes
            
            return Response({
                'requested': True
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
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
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
@permission_classes([IsAuthenticated])
def create_organization(request):
    """Create a new organization"""
    try:
        if request.user.organization:
            return Response(
                {'error': 'User is already in an organization', 'code': 'USER_ALREADY_IN_ORGANIZATION'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate input data using serializer
        serializer = CreateOrganizationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        organization = Organization.objects.create(
            name=validated_data['name'],
            desc=validated_data.get('description', ''),
            email_domain=validated_data.get('email_domain', '')
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
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
def invite_users_to_organization(request):
    """Invite users to organization by email"""
    try:
        user = request.user
        
        if not user.organization:
            return Response(
                {'error': 'User is not in any organization', 'code': 'NO_ORGANIZATION'},
                status=status.HTTP_400_BAD_REQUEST
            )
        emails = request.data.get('emails')
        if not emails or not isinstance(emails, list) or len(emails) == 0:
            return Response(
                {'error': 'No emails provided', 'code': 'NO_EMAILS_PROVIDED'},
                status=status.HTTP_400_BAD_REQUEST
            )
        organization = user.organization
        
        with transaction.atomic():
            try:
                for email in emails:
                    user = CustomUser.objects.filter(email=email).first()
                    if not user:
                        raise Exception(f'User {email} not found')
                    elif user.organization:
                        raise Exception(f'User {email} is already a member of an organization')
                    else:
                        user.organization = organization
                        user.save()
            except Exception as e:
                return Response(
                    {'error': str(e), 'code': 'INVITE_USERS_ERROR'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response({
            'success': True
        })
    
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'INVITE_USERS_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
def leave_organization(request):
    """Remove current user from their organization"""
    try:
        user = request.user
        # Remove user from organization
        user.organization = None
        user.save()
        
        return Response({
            'success': True
        })
        
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'LEAVE_ORGANIZATION_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
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
        
        # Check if organization already has an active subscription
        existing_subscription = Subscription.objects.filter(
            organization=user.organization,
            is_active=True
        ).first()
        
        if existing_subscription:
            return Response(
                {'error': 'Organization already has an active subscription. Use switch plan to change your plan.', 'code': 'SUBSCRIPTION_EXISTS'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or get Stripe customer and update metadata if needed
        customer_email = user.email
        customers = stripe.Customer.list(email=customer_email, limit=1)
        
        if customers.data and len(customers.data) > 0:
            customer = customers.data[0]
            # Update customer metadata to ensure it has the latest info
            stripe.Customer.modify(
                customer.id,
                metadata={'user_id': user.id, 'organization_id': user.organization.id}
            )
        else:
            customer = stripe.Customer.create(
                name=user.username,
                email=customer_email,
                metadata={'user_id': user.id, 'organization_id': user.organization.id}
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
            cancel_url=cancel_url,
            metadata={'user_id': user.id, 'organization_id': user.organization.id}
        )
        
        # Return JSON with checkout URL instead of 303 redirect to avoid CORS issues
        return Response({
            'checkout_url': session.url
        }, status=status.HTTP_200_OK)
        
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
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
def get_usage(request):
    """Get current user's usage statistics"""
    try:
        user = request.user
        
        # Check if organization has an active subscription
        has_active_subscription = Subscription.objects.filter(
            organization=user.organization,
            is_active=True
        ).exists()
        
        if not has_active_subscription:
            return Response({
                'error': 'No active subscription',
                'code': 'NO_ACTIVE_SUBSCRIPTION'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        usage = UsageDaily.objects.filter(user=user).first()
        
        if not usage:
            return Response({
                'error': 'No usage found',
                'code': 'NO_USAGE_FOUND'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UsageDailySerializer(usage)
        return Response(serializer.data)
        
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'USAGE_RETRIEVAL_ERROR'},
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
        
        event_type = event['type']
        
        # Handle the event
        if event_type == 'checkout.session.completed':
            handle_checkout_completed(event['data']['object'])
        elif event_type == 'customer.subscription.created':
            handle_subscription_created(event['data']['object'])
        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        elif event_type == 'invoice.payment_succeeded':
            handle_payment_succeeded(event['data']['object'])
        elif event_type == 'invoice.payment_failed':
            handle_payment_failed(event['data']['object'])
        
        return JsonResponse({'received': True})
        
    except Exception as e:
        return JsonResponse(
            {'error': str(e), 'code': 'WEBHOOK_ERROR'},
            status=500
        )


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
def list_organization_users(request):
    """List users in the authenticated user's organization with pagination"""
    try:
        if not request.user.organization:
            return Response(
                {'error': 'No organization found for user', 'code': 'NO_ORGANIZATION'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = CustomUser.objects.filter(organization=request.user.organization).order_by('id')
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = OrganizationUserSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'ORG_USERS_LIST_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasValidOrganizationToken])
def remove_organization_user(request, user_id: int):
    """Remove a user from the authenticated user's organization by user_id"""
    try:
        if not request.user.organization:
            return Response(
                {'error': 'No organization found for user', 'code': 'NO_ORGANIZATION'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target = CustomUser.objects.filter(id=user_id, organization=request.user.organization).first()
        if not target:
            return Response(
                {'error': 'User not found in organization', 'code': 'USER_NOT_IN_ORG'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Allow anyone in org to remove any user for now (no roles yet)
        target.organization = None
        target.save()

        return Response({'success': True})
    except Exception as e:
        return Response(
            {'error': str(e), 'code': 'ORG_USER_REMOVE_ERROR'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def handle_checkout_completed(session):
    """Handle successful checkout session completion"""
    try:
        # Do not create local records here. Rely on subscription/invoice webhooks
        # for source-of-truth updates. Optionally log metadata for correlation.
        return
            
    except Exception as e:
        pass


def handle_subscription_created(subscription_data):
    """Handle new subscription creation"""
    try:
        subscription_id = subscription_data.get('id')
        
        # Get organization ID from customer metadata
        customer_id = subscription_data.get('customer')
        org_id = None
        if customer_id:
            customer = stripe.Customer.retrieve(customer_id)
            org_id = customer.metadata.get('organization_id')
        
        if not org_id:
            raise Exception("Organization ID not found in subscription or customer metadata")
        
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            raise Exception("Organization not found")

        # Determine plan via items.data[0].price.id
        items = subscription_data.get('items', {}).get('data', [])
        price_id = items[0]['price']['id'] if items else None
        
        plan = Plan.objects.filter(stripe_price_id=price_id).first() if price_id else None

        # Extract start_date from subscription.start_date
        # Extract end_date from items.data[0].current_period_end
        start_date = subscription_data.get('start_date')
        end_date = items[0].get('current_period_end') if items else None

        # Upsert subscription by Stripe ID
        subscription, created = Subscription.objects.update_or_create(
            stripe_subscription_id=subscription_id,
            defaults={
                'organization': organization,
                'plan': plan,
                'start_date': datetime.fromtimestamp(start_date) if start_date else None,
                'end_date': datetime.fromtimestamp(end_date) if end_date else None,
                'is_active': subscription_data.get('status') == 'active'
            }
        )
            
    except Subscription.DoesNotExist:
        pass
    except Exception as e:
        pass


def handle_payment_succeeded(invoice_data):
    """Handle successful payment"""
    try:
        # Get subscription ID from parent.subscription_details.subscription
        parent = invoice_data.get('parent', {})
        subscription_details = parent.get('subscription_details', {})
        stripe_subscription_id = subscription_details.get('subscription')
        
        subscription = Subscription.objects.filter(
            stripe_subscription_id=stripe_subscription_id
        ).first()

        # Resolve user via customer metadata
        customer_id = invoice_data.get('customer')
        
        customer = stripe.Customer.retrieve(customer_id) if customer_id else None
        
        user_id = customer.metadata.get('user_id') if customer else None
        
        user = CustomUser.objects.filter(id=user_id).first()
        
        # Extract price/product from invoice lines pricing.price_details
        lines = invoice_data.get('lines', {}).get('data', [])
        
        if lines and len(lines) > 0:
            pricing = lines[0].get('pricing', {})
            price_details = pricing.get('price_details', {})
            price_id = price_details.get('price')
            product_id = price_details.get('product')
        else:
            price_id = None
            product_id = None

        if stripe_subscription_id and user:
            # Get invoice_id from the invoice_data itself
            invoice_id = invoice_data.get('id')
            
            payment = Payment.objects.create(
                user=user,
                stripe_invoice_id=invoice_id,
                stripe_subscription_id=stripe_subscription_id,
                stripe_product_id=product_id,
                stripe_price_id=price_id,
                stripe_customer_id=customer_id,
                is_active=True
            )
    except Exception as e:
        pass


def handle_subscription_updated(subscription_data):
    """Handle subscription updates (including plan changes for upgrades and downgrades, and renewals)"""
    try:
        subscription_id = subscription_data['id']
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_id
        )
        subscription.is_active = subscription_data['status'] == 'active'
        
        # Check if plan changed (for upgrades or downgrades)
        items = subscription_data.get('items', {}).get('data', [])
        if items and len(items) > 0:
            # Always update dates from Stripe (handles renewals and plan changes)
            subscription.start_date = datetime.fromtimestamp(items[0].get('current_period_start', 0))
            subscription.end_date = datetime.fromtimestamp(items[0].get('current_period_end', 0))
            current_price_id = items[0]['price']['id']
            if subscription.plan.stripe_price_id != current_price_id:
                # Plan has changed, update local subscription
                new_plan = Plan.objects.filter(stripe_price_id=current_price_id).first()
                if new_plan:
                    subscription.plan = new_plan
        
        subscription.save()
    except Subscription.DoesNotExist:
        pass
    except Exception as e:
        pass

def handle_payment_failed(invoice_data):
    """Handle failed payment (e.g., expired credit card)"""
    # Stripe will automatically retry payment failures
    # After multiple failures, the subscription will be cancelled
    # No immediate action needed here - we just acknowledge the failure
    # The subscription will be marked inactive when customer.subscription.deleted is received
    pass

def handle_subscription_deleted(subscription_data):
    """Handle subscription cancellation"""
    try:
        subscription_id = subscription_data['id']
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_id
        )
        subscription.is_active = False
        subscription.save()
    except Subscription.DoesNotExist:
        pass
    except Exception as e:
        pass