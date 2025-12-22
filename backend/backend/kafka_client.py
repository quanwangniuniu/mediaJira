"""
Kafka Client Utilities
Shared utilities for Kafka client configuration and connection management.
"""
import os
import logging
from typing import Optional
from decouple import config

logger = logging.getLogger(__name__)

# Kafka broker configuration
# Select the appropriate bootstrap server based on context:
# - INTERNAL (kafka:9092): For containers connecting within Docker network
# - EXTERNAL (localhost:29092): For host machine or CI environments
KAFKA_BOOTSTRAP_SERVERS = config(
    'KAFKA_BROKER',
    default='kafka:9092'  # Default to INTERNAL listener for containers
)

# Determine bootstrap server based on environment
def get_bootstrap_servers() -> str:
    """
    Get the appropriate Kafka bootstrap server address.
    
    Returns:
        Bootstrap server address (INTERNAL or EXTERNAL listener)
    
    Usage:
        # In containers: returns 'kafka:9092' (INTERNAL)
        # On host/CI: set KAFKA_BROKER=localhost:29092 (EXTERNAL)
    """
    broker = os.getenv('KAFKA_BROKER', KAFKA_BOOTSTRAP_SERVERS)
    
    # Auto-detect if running in container vs host
    # Containers typically use service name 'kafka:9092'
    # Host/CI typically use 'localhost:29092'
    if 'kafka:' in broker or ':9092' in broker:
        # INTERNAL listener for containers
        return broker
    else:
        # EXTERNAL listener for host/CI
        return broker if broker else 'localhost:29092'

# Client ID configuration
def get_client_id(service_name: str = 'mediajira') -> str:
    """
    Generate a client ID for Kafka clients.
    
    Args:
        service_name: Name of the service/application
    
    Returns:
        Formatted client ID
    """
    hostname = os.getenv('HOSTNAME', 'unknown')
    return f"{service_name}-{hostname}"

# Common Kafka configuration
def get_base_producer_config() -> dict:
    """
    Get base configuration for Kafka producers.
    
    Returns:
        Dictionary with recommended producer settings
    """
    return {
        'bootstrap_servers': get_bootstrap_servers(),
        'client_id': get_client_id(),
        'acks': 'all',  # Wait for all in-sync replicas (durability)
        'retries': 3,
        'max_in_flight_requests_per_connection': 5,
        'enable_idempotence': True,  # Prevent duplicate messages
        'compression_type': 'snappy',
        'value_serializer': lambda v: v.encode('utf-8') if isinstance(v, str) else v,
        'key_serializer': lambda k: k.encode('utf-8') if isinstance(k, str) else None,
    }

def get_base_consumer_config(group_id: str, **kwargs) -> dict:
    """
    Get base configuration for Kafka consumers.
    
    Args:
        group_id: Consumer group ID (required for offset management)
        **kwargs: Additional configuration overrides
    
    Returns:
        Dictionary with recommended consumer settings
    """
    config_dict = {
        'bootstrap_servers': get_bootstrap_servers(),
        'client_id': get_client_id(),
        'group_id': group_id,
        'auto_offset_reset': 'earliest',  # Start from beginning if no offset
        'enable_auto_commit': False,  # Manual offset commit for better control
        'max_poll_records': 100,  # Batch size for processing
        'session_timeout_ms': 30000,  # 30 seconds
        'heartbeat_interval_ms': 10000,  # 10 seconds
        'value_deserializer': lambda m: m.decode('utf-8') if m else None,
        'key_deserializer': lambda k: k.decode('utf-8') if k else None,
    }
    config_dict.update(kwargs)  # Allow overrides
    return config_dict

# Topic validation
def validate_topic_exists(producer_or_admin_client, topic: str) -> bool:
    """
    Validate that a topic exists before using it.
    
    Args:
        producer_or_admin_client: Kafka producer or admin client instance
        topic: Topic name to validate
    
    Returns:
        True if topic exists, False otherwise
    """
    try:
        from kafka.admin import KafkaAdminClient
        from kafka.errors import KafkaError
        
        if isinstance(producer_or_admin_client, KafkaAdminClient):
            admin = producer_or_admin_client
        else:
            # Create admin client from producer's bootstrap servers
            admin = KafkaAdminClient(
                bootstrap_servers=get_bootstrap_servers(),
                client_id=get_client_id('admin')
            )
        
        # List topics
        metadata = admin.list_topics()
        exists = topic in metadata.topics
        
        if not exists and not isinstance(producer_or_admin_client, KafkaAdminClient):
            admin.close()
        
        if not exists:
            logger.warning(f"Topic '{topic}' does not exist. Create it using create-topics.sh")
        
        return exists
    except Exception as e:
        logger.error(f"Error validating topic '{topic}': {e}")
        return False

