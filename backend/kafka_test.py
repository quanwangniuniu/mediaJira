"""
Example: Kafka Producer and Consumer Usage
This example demonstrates recommended patterns for using Kafka in Django.

For production usage, see:
- backend/kafka_producer.py - Recommended producer implementation
- backend/kafka_consumer.py - Recommended consumer implementation
- docs/KAFKA_CLIENT_GUIDE.md - Complete usage guide
"""

from backend.kafka_producer import KafkaProducerClient
from backend.kafka_consumer import KafkaConsumerClient
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def example_producer():
    """Example: Using the recommended Kafka producer pattern."""
    # Create producer using context manager (automatic cleanup)
    with KafkaProducerClient() as producer:
        # Send a message
        success = producer.send_message(
            topic='campaign.created.json',
            value={
                'campaign_id': '123',
                'name': 'Example Campaign',
                'created_at': '2024-01-15T10:00:00Z'
            },
            key='123',
            headers={
                'source': 'example-script',
                'version': '1.0'
            }
        )
        
        if success:
            logger.info("Message sent successfully")
        else:
            logger.error("Failed to send message")


def example_consumer():
    """Example: Using the recommended Kafka consumer pattern."""
    def handle_message(message):
        """Message handler - processes each message."""
        try:
            logger.info(f"Received message: {message}")
            
            # Extract data
            value = message['value']
            topic = message['topic']
            key = message['key']
            
            # Process message based on topic
            if 'campaign.created' in topic:
                logger.info(f"Processing campaign creation: {value}")
                # Your processing logic here
            
            return True  # Return True on success
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return False  # Return False on failure
    
    # Create consumer
    consumer = KafkaConsumerClient(
        topics=['campaign.created.json'],
        group_id='example-consumer-group',
        message_handler=handle_message
    )
    
    try:
        # Start consuming (this blocks until stopped)
        consumer.start(blocking=True)
    except KeyboardInterrupt:
        logger.info("Stopping consumer...")
    finally:
        consumer.stop()


if __name__ == '__main__':
    # Run producer example
    logger.info("Running producer example...")
    example_producer()
    
    # To run consumer example, uncomment:
    # logger.info("Running consumer example...")
    # example_consumer()
