# Kafka Client Usage Guide

This guide provides recommended patterns for using Kafka in the MediaJira application.

## Overview

The Kafka client utilities provide production-ready implementations with:
- Proper error handling and retry logic
- Graceful shutdown handling
- Connection pooling and reuse
- Consumer groups for parallel processing
- Explicit offset management
- Structured message format

## Architecture

### Listeners

Kafka is configured with two listeners:

- **INTERNAL** (`kafka:9092`): For containers connecting within Docker network
- **EXTERNAL** (`localhost:29092`): For host machine or CI environments

The client utilities automatically select the appropriate listener based on the `KAFKA_BROKER` environment variable.

### Topic Naming

Topics follow the convention: `domain.action.format`

- Examples: `campaign.created.json`, `asset.updated.json`
- See `KAFKA_TOPICS.md` for full naming standards

## Producer Usage

### Basic Example

```python
from backend.kafka_producer import KafkaProducerClient

# Initialize producer
producer = KafkaProducerClient()

# Send a message
success = producer.send_message(
    topic='campaign.created.json',
    value={
        'campaign_id': '123',
        'name': 'Summer Campaign',
        'created_at': '2024-01-15T10:00:00Z'
    },
    key='123',  # Optional: for partitioning
    headers={
        'source': 'api',
        'version': '1.0',
        'user_id': 'user-456'
    }
)

if success:
    print("Message sent successfully")

# Always close the producer
producer.close()
```

### Using Context Manager

```python
from backend.kafka_producer import KafkaProducerClient

with KafkaProducerClient() as producer:
    producer.send_message(
        topic='campaign.created.json',
        value={'campaign_id': '123', 'name': 'Test Campaign'},
        key='123'
    )
    # Producer automatically closed
```

### Sending Batch Messages

```python
from backend.kafka_producer import KafkaProducerClient

producer = KafkaProducerClient()

messages = [
    {
        'topic': 'campaign.created.json',
        'value': {'campaign_id': '123', 'name': 'Campaign 1'},
        'key': '123'
    },
    {
        'topic': 'campaign.created.json',
        'value': {'campaign_id': '124', 'name': 'Campaign 2'},
        'key': '124'
    },
]

success_count = producer.send_batch(messages)
print(f"Sent {success_count}/{len(messages)} messages")
producer.close()
```

### Producer Configuration

The producer uses recommended defaults:

- `acks='all'`: Wait for all in-sync replicas (durability)
- `enable_idempotence=True`: Prevent duplicate messages
- `retries=3`: Automatic retry on failure
- `compression_type='snappy'`: Compress messages to reduce bandwidth

You can override configuration:

```python
producer = KafkaProducerClient(
    acks=1,  # Override acknowledgment setting
    retries=5  # More retries
)
```

## Consumer Usage

### Basic Example

```python
from backend.kafka_consumer import KafkaConsumerClient
import logging

logging.basicConfig(level=logging.INFO)

def handle_campaign_event(message):
    """Process campaign events."""
    try:
        print(f"Received message from {message['topic']}:")
        print(f"  Key: {message['key']}")
        print(f"  Value: {message['value']}")
        print(f"  Headers: {message['headers']}")
        
        # Your processing logic here
        campaign_data = message['value']
        # ... process campaign_data ...
        
        return True  # Success
    except Exception as e:
        print(f"Error processing message: {e}")
        return False  # Failure

# Create consumer
consumer = KafkaConsumerClient(
    topics=['campaign.created.json', 'campaign.updated.json'],
    group_id='campaign-processor',
    message_handler=handle_campaign_event
)

try:
    # Start consuming (blocks until stopped)
    consumer.start(blocking=True)
except KeyboardInterrupt:
    print("Stopping consumer...")
finally:
    consumer.stop()
```

### Using Context Manager

```python
from backend.kafka_consumer import KafkaConsumerClient

def handle_message(message):
    print(f"Processing: {message['value']}")
    return True

with KafkaConsumerClient(
    topics=['campaign.created.json'],
    group_id='example-group',
    message_handler=handle_message
) as consumer:
    consumer.start(blocking=True)
```

### Non-Blocking Consumer

```python
from backend.kafka_consumer import KafkaConsumerClient
import time

def handle_message(message):
    print(f"Processing: {message['value']}")
    return True

consumer = KafkaConsumerClient(
    topics=['campaign.created.json'],
    group_id='background-processor',
    message_handler=handle_message
)

# Start in background thread
consumer.start(blocking=False)

# Do other work...
time.sleep(60)

# Stop when done
consumer.stop()
```

### Consumer Configuration

The consumer uses recommended defaults:

- `enable_auto_commit=False`: Manual offset commit for better control
- `auto_offset_reset='earliest'`: Start from beginning if no offset exists
- `max_poll_records=100`: Process messages in batches
- `session_timeout_ms=30000`: 30 second session timeout
- `heartbeat_interval_ms=10000`: 10 second heartbeat

Override configuration:

```python
consumer = KafkaConsumerClient(
    topics=['campaign.created.json'],
    group_id='my-group',
    message_handler=handle_message,
    auto_offset_reset='latest',  # Start from latest offset
    max_poll_records=50  # Smaller batch size
)
```

## Consumer Groups

Consumer groups enable parallel processing:

- Multiple consumers with the same `group_id` share partitions
- Each partition is consumed by only one consumer in the group
- Offsets are managed per consumer group

Example: Scaling with multiple consumers

```python
# Consumer 1
consumer1 = KafkaConsumerClient(
    topics=['campaign.created.json'],
    group_id='campaign-processors',  # Same group
    message_handler=handle_message
)

# Consumer 2 (can run in different process/container)
consumer2 = KafkaConsumerClient(
    topics=['campaign.created.json'],
    group_id='campaign-processors',  # Same group
    message_handler=handle_message
)

# Both consumers will share the workload
```

## Error Handling

### Producer Errors

The producer automatically retries on transient failures. Check return value:

```python
success = producer.send_message(topic='campaign.created.json', value={...})
if not success:
    # Handle permanent failure (log, send to dead-letter queue, etc.)
    logger.error("Failed to send message after retries")
```

### Consumer Errors

Handle errors in the message handler:

```python
def handle_message(message):
    try:
        # Process message
        process_campaign(message['value'])
        return True
    except ValidationError as e:
        logger.error(f"Invalid message: {e}")
        # Optionally send to dead-letter topic
        return False
    except ProcessingError as e:
        logger.error(f"Processing error: {e}")
        # Retry logic or dead-letter topic
        return False
```

## Message Format

### Producer Side

```python
producer.send_message(
    topic='campaign.created.json',
    value={
        'campaign_id': '123',
        'name': 'Campaign Name',
        'metadata': {...}
    },
    key='123',  # String key
    headers={
        'source': 'api',
        'correlation_id': 'req-456'
    }
)
```

### Consumer Side

```python
def handle_message(message):
    # message is a dictionary with:
    # - topic: str
    # - partition: int
    # - offset: int
    # - key: str or None
    # - value: dict, str, or bytes (auto-parsed JSON)
    # - headers: dict
    # - timestamp: int
    
    value = message['value']  # Already parsed JSON if possible
    headers = message['headers']
    correlation_id = headers.get('correlation_id')
    # ...
```

## Best Practices

1. **Always close producers/consumers** - Use context managers when possible
2. **Use consumer groups** - For parallel processing and offset management
3. **Handle errors gracefully** - Return False from message handler on failure
4. **Use message keys** - For partitioning related messages to same partition
5. **Include headers** - For tracing (correlation_id, source, etc.)
6. **Validate topics exist** - Use `create-topics.sh` before running clients
7. **Monitor consumer lag** - Check Grafana dashboards regularly
8. **Use appropriate batch sizes** - Balance throughput vs latency

## Integration with Django

### In Django Views

```python
from django.http import JsonResponse
from backend.kafka_producer import get_producer

def create_campaign(request):
    # ... create campaign in database ...
    
    # Publish event to Kafka
    producer = get_producer()
    producer.send_message(
        topic='campaign.created.json',
        value={
            'campaign_id': str(campaign.id),
            'name': campaign.name,
            'created_at': campaign.created_at.isoformat()
        },
        key=str(campaign.id),
        headers={'source': 'django-api', 'user_id': str(request.user.id)}
    )
    
    return JsonResponse({'status': 'created'})
```

### Running Consumers as Django Management Commands

Create `management/commands/kafka_consumer.py`:

```python
from django.core.management.base import BaseCommand
from backend.kafka_consumer import KafkaConsumerClient

class Command(BaseCommand):
    help = 'Run Kafka consumer for campaign events'
    
    def handle(self, *args, **options):
        def handle_message(message):
            # Process message using Django models
            from campaign.models import Campaign
            # ... process message ...
            return True
        
        consumer = KafkaConsumerClient(
            topics=['campaign.created.json'],
            group_id='django-campaign-processor',
            message_handler=handle_message
        )
        
        try:
            consumer.start(blocking=True)
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('Stopping consumer...'))
        finally:
            consumer.stop()
```

Run with: `python manage.py kafka_consumer`

## Troubleshooting

### Topic doesn't exist

Error: `Topic 'campaign.created.json' does not exist`

Solution: Create topics using `create-topics.sh` script

### Connection refused

Error: `Connection refused to kafka:9092`

Solution: 
- Check Kafka container is running: `docker ps | grep kafka`
- Verify `KAFKA_BROKER` environment variable is correct
- For host machine, use `localhost:29092` (EXTERNAL listener)

### Consumer lag increasing

Solution:
- Increase number of consumers in the group
- Optimize message processing (reduce processing time)
- Check for stuck/failing message handlers

### Messages not being consumed

Check:
1. Consumer group is properly configured
2. Topics exist and have messages
3. Consumer is running and connected
4. No exceptions in message handler causing silent failures

