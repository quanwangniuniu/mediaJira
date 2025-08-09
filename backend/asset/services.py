import json
from datetime import datetime
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class AssetEventService:
    """
    Service for broadcasting asset events to WebSocket groups.
    Handles all real-time notifications for asset updates.
    """
    
    @staticmethod
    def broadcast_status_change(asset_id, from_state, to_state, changed_by, metadata=None):
        """Broadcast asset status change event"""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'asset_{asset_id}',
            {
                'type': 'asset_status_changed',
                'asset_id': asset_id,
                'from_state': from_state,
                'to_state': to_state,
                'changed_by': changed_by.username if hasattr(changed_by, 'username') else str(changed_by),
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'metadata': metadata or {}
            }
        )
    
    @staticmethod
    def broadcast_version_published(asset_id, version_number, published_by, file_name):
        """Broadcast version published event"""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'asset_{asset_id}',
            {
                'type': 'version_published',
                'asset_id': asset_id,
                'version_number': version_number,
                'published_by': published_by.username if hasattr(published_by, 'username') else str(published_by),
                'file_name': file_name,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        )
    
    @staticmethod
    def broadcast_comment_added(asset_id, comment_id, user_id, body):
        """Broadcast comment addition event"""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'asset_{asset_id}',
            {
                'type': 'comment_added',
                'asset_id': asset_id,
                'comment_id': comment_id,
                'user_id': user_id,
                'body': body,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        )
    
    @staticmethod
    def broadcast_review_assigned(asset_id, assigned_user_id, role, assigned_by):
        """Broadcast review assignment event"""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'asset_{asset_id}',
            {
                'type': 'review_assigned',
                'asset_id': asset_id,
                'assigned_user_id': assigned_user_id,
                'role': role,
                'assigned_by': assigned_by.username if hasattr(assigned_by, 'username') else str(assigned_by),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        )
    
    @staticmethod
    def broadcast_version_scan_started(asset_id, version_id, version_number):
        """Broadcast version scan started event"""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'asset_{asset_id}',
            {
                'type': 'version_scan_started',
                'asset_id': asset_id,
                'version_id': version_id,
                'version_number': version_number,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        )
    
    @staticmethod
    def broadcast_version_scan_completed(asset_id, version_id, version_number, scan_status, scan_result):
        """Broadcast version scan completed event"""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'asset_{asset_id}',
            {
                'type': 'version_scan_completed',
                'asset_id': asset_id,
                'version_id': version_id,
                'version_number': version_number,
                'scan_status': scan_status,
                'scan_result': scan_result,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        )
    
 