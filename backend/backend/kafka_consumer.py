"""
Kafka Consumer Pattern
Recommended consumer implementation with consumer groups, offset management, and graceful shutdown.
"""
import json
import logging
import signal
import sys
import threading
from typing import Callable, List, Optional, Dict, Any
from kafka import KafkaConsumer
from kafka.errors import KafkaError

from .kafka_client import get_base_consumer_config, get_bootstrap_servers

logger = logging.getLogger(__name__)


class KafkaConsumerClient:
    """
    Recommended Kafka Consumer client with best practices:
    - Consumer group configuration for parallel processing
    - Explicit offset management (manual commit)
    - Graceful shutdown with proper offset commit
    - Error handling with dead-letter topic consideration
    - Batch processing with configurable batch size
    - Heartbeat configuration for long-running processing
    - Proper exception handling and logging
    """
    
    def __init__(
        self,
        topics: List[str],
        group_id: str,
        message_handler: Callable[[Dict[str, Any]], bool],
        **config_overrides
    ):
        """
        Initialize Kafka consumer with recommended configuration.
        
        Args:
            topics: List of topic names to consume from
            group_id: Consumer group ID (for offset management and parallel processing)
            message_handler: Callback function(message_dict) -> bool
                            Returns True if message processed successfully, False otherwise
            **config_overrides: Additional configuration to override defaults
        
        Example:
            def handle_campaign_event(message):
                print(f"Received: {message}")
                # Process message...
                return True  # Success
            
            consumer = KafkaConsumerClient(
                topics=['campaign.created.json', 'campaign.updated.json'],
                group_id='campaign-processor',
                message_handler=handle_campaign_event
            )
            consumer.start()
        """
        self.topics = topics
        self.group_id = group_id
        self.message_handler = message_handler
        self.consumer = None
        self._shutdown = False
        self._thread: Optional[threading.Thread] = None
        self._setup_graceful_shutdown()
        
        config = get_base_consumer_config(group_id=group_id, **config_overrides)
        
        try:
            self.consumer = KafkaConsumer(*topics, **config)
            logger.info(
                f"Kafka consumer initialized for topics={topics}, "
                f"group_id={group_id}, bootstrap_servers={get_bootstrap_servers()}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Kafka consumer: {e}")
            raise
    
    def _setup_graceful_shutdown(self):
        """Register signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down consumer gracefully...")
            self.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def _parse_message(self, message) -> Dict[str, Any]:
        """
        Parse Kafka message into a dictionary.
        
        Args:
            message: Kafka message object
        
        Returns:
            Dictionary with message data
        """
        try:
            # Parse headers
            headers = {}
            if message.headers:
                headers = {k.decode('utf-8'): v.decode('utf-8') for k, v in message.headers}
            
            # Parse value
            value = message.value
            if isinstance(value, bytes):
                try:
                    value = json.loads(value.decode('utf-8'))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    value = value.decode('utf-8', errors='ignore')
            
            return {
                'topic': message.topic,
                'partition': message.partition,
                'offset': message.offset,
                'key': message.key.decode('utf-8') if message.key else None,
                'value': value,
                'headers': headers,
                'timestamp': message.timestamp,
            }
        except Exception as e:
            logger.error(f"Error parsing message: {e}")
            return {
                'topic': message.topic,
                'partition': message.partition,
                'offset': message.offset,
                'value': message.value,
                'error': str(e)
            }
    
    def _process_messages(self):
        """Main message processing loop."""
        logger.info(f"Starting consumer loop for group_id={self.group_id}, topics={self.topics}")
        
        try:
            while not self._shutdown:
                try:
                    # Poll for messages (timeout in milliseconds)
                    message_batch = self.consumer.poll(timeout_ms=1000, max_records=100)
                    
                    if not message_batch:
                        continue
                    
                    # Process each partition's messages
                    for topic_partition, messages in message_batch.items():
                        for message in messages:
                            if self._shutdown:
                                break
                            
                            try:
                                # Parse message
                                message_dict = self._parse_message(message)
                                
                                # Process message using handler
                                success = self.message_handler(message_dict)
                                
                                if success:
                                    logger.debug(
                                        f"Message processed successfully: "
                                        f"topic={message.topic}, partition={message.partition}, offset={message.offset}"
                                    )
                                else:
                                    logger.warning(
                                        f"Message processing failed: "
                                        f"topic={message.topic}, partition={message.partition}, offset={message.offset}"
                                    )
                                    # TODO: Send to dead-letter topic or handle retry logic
                                
                            except Exception as e:
                                logger.error(
                                    f"Error processing message "
                                    f"(topic={message.topic}, partition={message.partition}, offset={message.offset}): {e}"
                                )
                                # Continue processing other messages
                                continue
                    
                    # Commit offsets after processing batch (manual commit)
                    if not self._shutdown:
                        self.consumer.commit()
                        
                except KafkaError as e:
                    logger.error(f"Kafka error in consumer loop: {e}")
                    # Continue looping, Kafka client will handle retries
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error in consumer loop: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Fatal error in consumer loop: {e}")
        finally:
            logger.info("Consumer loop stopped")
            self._commit_offsets()
    
    def _commit_offsets(self):
        """Commit current offsets."""
        try:
            if self.consumer:
                self.consumer.commit()
                logger.info("Offsets committed successfully")
        except Exception as e:
            logger.error(f"Error committing offsets: {e}")
    
    def start(self, blocking: bool = True):
        """
        Start consuming messages.
        
        Args:
            blocking: If True, blocks until shutdown. If False, runs in background thread.
        """
        if not self.consumer:
            raise RuntimeError("Consumer not initialized")
        
        if blocking:
            self._process_messages()
        else:
            self._thread = threading.Thread(target=self._process_messages, daemon=True)
            self._thread.start()
            logger.info("Consumer started in background thread")
    
    def stop(self, timeout: float = 10.0):
        """
        Stop consuming messages gracefully.
        
        Args:
            timeout: Maximum time to wait for shutdown
        """
        if self._shutdown:
            return
        
        logger.info("Stopping Kafka consumer...")
        self._shutdown = True
        
        if self.consumer:
            try:
                # Commit any pending offsets
                self._commit_offsets()
                
                # Close consumer
                self.consumer.close(timeout=timeout)
                logger.info("Kafka consumer stopped successfully")
            except Exception as e:
                logger.error(f"Error stopping consumer: {e}")
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()


# Example usage function
def run_consumer_example():
    """
    Example of how to use the KafkaConsumerClient.
    """
    def handle_message(message: Dict[str, Any]) -> bool:
        """Example message handler."""
        try:
            logger.info(f"Processing message: {message}")
            # Your processing logic here
            # Return True on success, False on failure
            return True
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            return False
    
    consumer = KafkaConsumerClient(
        topics=['campaign.created.json'],
        group_id='example-consumer-group',
        message_handler=handle_message
    )
    
    try:
        consumer.start(blocking=True)
    except KeyboardInterrupt:
        logger.info("Interrupted, shutting down...")
    finally:
        consumer.stop()

