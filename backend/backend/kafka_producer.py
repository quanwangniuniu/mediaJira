"""
Kafka Producer Pattern
Recommended producer implementation with proper error handling, retries, and graceful shutdown.
"""
import json
import logging
import signal
import sys
from typing import Any, Dict, Optional
from kafka import KafkaProducer
from kafka.errors import KafkaError, KafkaTimeoutError

from .kafka_client import get_base_producer_config, get_bootstrap_servers, validate_topic_exists

logger = logging.getLogger(__name__)


class KafkaProducerClient:
    """
    Recommended Kafka Producer client with best practices:
    - Connection pooling and reuse
    - Proper acknowledgment (acks=all)
    - Idempotent producer (prevents duplicates)
    - Retry logic with exponential backoff
    - Graceful shutdown handling
    - Structured message format (headers, key, value)
    - Error handling and logging
    """
    
    def __init__(self, **config_overrides):
        """
        Initialize Kafka producer with recommended configuration.
        
        Args:
            **config_overrides: Additional configuration to override defaults
        """
        config = get_base_producer_config()
        config.update(config_overrides)
        
        self.producer = None
        self._shutdown = False
        self._setup_graceful_shutdown()
        
        try:
            self.producer = KafkaProducer(**config)
            logger.info(f"Kafka producer initialized with bootstrap servers: {get_bootstrap_servers()}")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {e}")
            raise
    
    def _setup_graceful_shutdown(self):
        """Register signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down producer gracefully...")
            self.close()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def send_message(
        self,
        topic: str,
        value: Any,
        key: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
        partition: Optional[int] = None
    ) -> bool:
        """
        Send a message to Kafka topic.
        
        Args:
            topic: Topic name (following domain.action.format convention)
            value: Message value (dict, str, or bytes)
            key: Optional message key (for partitioning)
            headers: Optional message headers (dict of str -> str)
            partition: Optional partition number (None for key-based partitioning)
        
        Returns:
            True if message was sent successfully, False otherwise
        
        Example:
            producer = KafkaProducerClient()
            producer.send_message(
                topic='campaign.created.json',
                value={'campaign_id': '123', 'name': 'Test Campaign'},
                key='123',
                headers={'source': 'api', 'version': '1.0'}
            )
        """
        if self._shutdown or not self.producer:
            logger.error("Producer is closed, cannot send message")
            return False
        
        try:
            # Serialize value if it's a dict
            if isinstance(value, dict):
                serialized_value = json.dumps(value).encode('utf-8')
            elif isinstance(value, str):
                serialized_value = value.encode('utf-8')
            else:
                serialized_value = value
            
            # Prepare headers
            kafka_headers = []
            if headers:
                kafka_headers = [(k.encode('utf-8'), v.encode('utf-8')) for k, v in headers.items()]
            
            # Send message
            future = self.producer.send(
                topic=topic,
                value=serialized_value,
                key=key.encode('utf-8') if key else None,
                headers=kafka_headers,
                partition=partition
            )
            
            # Wait for acknowledgment (acks=all ensures durability)
            record_metadata = future.get(timeout=10)
            
            logger.debug(
                f"Message sent successfully to topic={record_metadata.topic}, "
                f"partition={record_metadata.partition}, offset={record_metadata.offset}"
            )
            return True
            
        except KafkaTimeoutError:
            logger.error(f"Timeout sending message to topic '{topic}'")
            return False
        except KafkaError as e:
            logger.error(f"Kafka error sending message to topic '{topic}': {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending message to topic '{topic}': {e}")
            return False
    
    def send_batch(self, messages: list) -> int:
        """
        Send a batch of messages.
        
        Args:
            messages: List of dicts with keys: topic, value, key (optional), headers (optional)
        
        Returns:
            Number of successfully sent messages
        
        Example:
            messages = [
                {'topic': 'campaign.created.json', 'value': {...}, 'key': '123'},
                {'topic': 'asset.updated.json', 'value': {...}, 'key': '456'},
            ]
            success_count = producer.send_batch(messages)
        """
        success_count = 0
        for msg in messages:
            if self.send_message(
                topic=msg['topic'],
                value=msg['value'],
                key=msg.get('key'),
                headers=msg.get('headers')
            ):
                success_count += 1
        
        # Flush to ensure all messages are sent
        self.flush()
        return success_count
    
    def flush(self, timeout: float = 10.0):
        """Flush all pending messages."""
        if self.producer:
            try:
                self.producer.flush(timeout=timeout)
                logger.debug("Producer flushed successfully")
            except Exception as e:
                logger.error(f"Error flushing producer: {e}")
    
    def close(self, timeout: float = 10.0):
        """Close the producer gracefully."""
        if self.producer and not self._shutdown:
            logger.info("Closing Kafka producer...")
            try:
                self.flush(timeout=timeout)
                self.producer.close(timeout=timeout)
                self._shutdown = True
                logger.info("Kafka producer closed successfully")
            except Exception as e:
                logger.error(f"Error closing producer: {e}")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# Singleton instance (optional, for reuse across application)
_producer_instance: Optional[KafkaProducerClient] = None


def get_producer(**config_overrides) -> KafkaProducerClient:
    """
    Get or create a singleton producer instance.
    
    Args:
        **config_overrides: Configuration overrides
    
    Returns:
        KafkaProducerClient instance
    """
    global _producer_instance
    if _producer_instance is None or _producer_instance._shutdown:
        _producer_instance = KafkaProducerClient(**config_overrides)
    return _producer_instance


def close_producer():
    """Close the singleton producer instance."""
    global _producer_instance
    if _producer_instance:
        _producer_instance.close()
        _producer_instance = None

