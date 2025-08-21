from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens.
    """
    
    async def __call__(self, scope, receive, send):
        # Get the token from headers
        headers = dict(scope['headers'])
        auth_header = headers.get(b'authorization', b'').decode('utf-8')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            scope['user'] = await self.get_user_from_token(token)
        else:
            # Fallback: accept token from query string (?token=...)
            try:
                query_string = scope.get('query_string', b'').decode('utf-8')
            except Exception:
                query_string = ''

            token_from_query = None
            if query_string:
                try:
                    from urllib.parse import parse_qs
                    qs = parse_qs(query_string)
                    # Support common param names
                    for key in ('token', 'access_token', 'auth', 'Authorization'):
                        values = qs.get(key)
                        if values and len(values) > 0 and values[0]:
                            token_from_query = values[0]
                            break
                except Exception:
                    token_from_query = None

            if token_from_query:
                scope['user'] = await self.get_user_from_token(token_from_query)
            else:
                scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Get user from JWT token"""
        try:
            # Decode the token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            # Get the user
            user = User.objects.get(id=user_id)
            return user
            
        except (InvalidToken, TokenError, ObjectDoesNotExist, KeyError):
            return AnonymousUser()
        except Exception:
            return AnonymousUser() 