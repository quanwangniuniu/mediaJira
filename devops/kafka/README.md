# Kafka Setup Guide

This directory contains the configuration, scripts, and documentation for the Kafka messaging infrastructure in MediaJira.

## Overview

Kafka is configured in **KRaft mode** (Kafka Raft) - a modern deployment model that eliminates the need for Zookeeper. The setup includes:

- **KRaft Architecture**: Single-node broker+controller setup (no Zookeeper dependency)
- **Dual Listeners**: INTERNAL (containers) and EXTERNAL (host/CI) for flexible connectivity
- **Topic Management**: Pre-defined topics with explicit configurations
- **Observability**: Full metrics and monitoring via Prometheus and Grafana
- **Security Ready**: Placeholders and documentation for production security

## Quick Start

### 1. Start Kafka

Kafka is included in `docker-compose.dev.yml`. Start all services:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Or start just Kafka:

```bash
docker compose -f docker-compose.dev.yml up -d kafka kafka-exporter kafka-ui
```

### 2. Create Topics

Topics must be created before clients can use them (auto-creation is disabled):

```bash
# From host machine
docker exec -it kafka bash -c "cd /tmp && /path/to/create-topics.sh kafka:9092"

# Or manually create a topic
docker exec kafka kafka-topics --bootstrap-server kafka:9092 --create \
  --topic campaign.created.json \
  --partitions 3 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete \
  --config compression.type=snappy
```

### 3. Verify Setup

```bash
# List topics
docker exec kafka kafka-topics --bootstrap-server kafka:9092 --list

# Describe a topic
docker exec kafka kafka-topics --bootstrap-server kafka:9092 --describe --topic campaign.created.json

# Check consumer groups
docker exec kafka kafka-consumer-groups --bootstrap-server kafka:9092 --list
```

## Architecture

### KRaft Mode

Kafka runs in **KRaft mode** (Kafka Raft), which:
- Eliminates Zookeeper dependency
- Simplifies deployment (single-node broker+controller)
- Provides better performance and scalability
- Is the future of Kafka (Zookeeper deprecated in Kafka 4.0+)

The current setup uses a single node acting as both broker and controller.

### Listeners

Kafka exposes two listeners:

1. **INTERNAL** (`kafka:9092`): For containers connecting within Docker network
   - Use this from backend/frontend containers
   - Set `KAFKA_BROKER=kafka:9092`

2. **EXTERNAL** (`localhost:29092`): For host machine or CI environments
   - Use this from host machine or CI pipelines
   - Set `KAFKA_BROKER=localhost:29092`

Clients automatically select the appropriate listener based on the `KAFKA_BROKER` environment variable.

## Topic Standards

### Naming Convention

Topics follow: **`domain.action.format`**

Examples:
- `campaign.created.json` - Campaign creation events
- `asset.updated.json` - Asset update events
- `retrospective.completed.json` - Completed retrospective events

### Topic Definitions

See `topics.yaml` for complete topic definitions.

All topics are configured with:
- Explicit partition counts
- Retention policies
- Cleanup policies (delete)
- Compression (snappy)
- Replication factor (1 for dev, 3 for production)

### Creating Topics

1. **Use the script** (recommended):
   ```bash
   ./create-topics.sh [bootstrap-server]
   ```

2. **Manually**:
   ```bash
   docker exec kafka kafka-topics --bootstrap-server kafka:9092 --create \
     --topic <topic-name> \
     --partitions <n> \
     --replication-factor 1 \
     --config retention.ms=<ms> \
     --config cleanup.policy=delete
   ```

For detailed topic configuration, see [KAFKA_TOPICS.md](./KAFKA_TOPICS.md).

## Client Usage

### Backend (Python)

Use the recommended producer/consumer patterns:

```python
from backend.kafka_producer import KafkaProducerClient
from backend.kafka_consumer import KafkaConsumerClient

# Producer example
with KafkaProducerClient() as producer:
    producer.send_message(
        topic='campaign.created.json',
        value={'campaign_id': '123', 'name': 'Test Campaign'},
        key='123',
        headers={'source': 'api', 'version': '1.0'}
    )

# Consumer example
def handle_message(message):
    print(f"Received: {message['value']}")
    return True  # Success

consumer = KafkaConsumerClient(
    topics=['campaign.created.json'],
    group_id='campaign-processor',
    message_handler=handle_message
)
consumer.start()
```

See [KAFKA_CLIENT_GUIDE.md](../backend/docs/KAFKA_CLIENT_GUIDE.md) for complete usage guide.

### Frontend (JavaScript/TypeScript)

```typescript
import { getProducer } from '@/lib/kafka/client';

const producer = getProducer();
await producer.connect();
await producer.sendMessage(
  'campaign.created.json',
  { campaign_id: '123', name: 'Test Campaign' },
  '123',
  { source: 'frontend', version: '1.0' }
);
```

## Monitoring

### Grafana Dashboards

Two pre-configured dashboards are available:

1. **Kafka Broker Overview** (`kafka-dashboard.json`)
   - Broker health, throughput, latency, disk usage
   - Request rates and error rates
   - Partition and replication status

2. **Kafka Consumer Lag** (`kafka-consumer-lag-dashboard.json`)
   - Consumer lag by group and topic
   - Offset tracking
   - Lag trends and alerts

**Access Grafana**: http://localhost:3001

**To Import Dashboards**:
1. Open Grafana → Dashboards → Import
2. Upload JSON files from `devops/grafana/`
3. Select Prometheus as data source

### Metrics

- **Kafka Broker**: JMX metrics on port `9999` (scraped by Prometheus)
- **Consumer Lag**: Kafka Exporter on port `9308` (scraped by Prometheus)
- **Prometheus**: http://localhost:9090

See [KAFKA_MONITORING.md](./KAFKA_MONITORING.md) for detailed monitoring guide.

## Security

### Current Setup (Development)

Uses **PLAINTEXT** mode (no authentication/encryption):
- Acceptable for local development
- **NOT suitable for production**

### Production Security

For production, configure:
- **SASL_SSL**: SCRAM-SHA-512 authentication + SSL encryption
- **ACLs**: Fine-grained access control per user/topic
- **SSL Certificates**: For encryption and mutual TLS

See [KAFKA_SECURITY.md](./KAFKA_SECURITY.md) for complete security setup guide.

Security placeholders are documented in `docker-compose.dev.yml` Kafka service configuration.

## Services

### Kafka Broker

- **Image**: `confluentinc/cp-kafka:7.6.0`
- **Container**: `kafka`
- **Ports**:
  - `9092`: INTERNAL listener
  - `29092`: EXTERNAL listener
  - `9999`: JMX metrics
- **Volume**: `kafka_data` (persistent storage)

### Kafka Exporter

- **Image**: `danielqsj/kafka-exporter`
- **Container**: `kafka-exporter`
- **Port**: `9308` (metrics endpoint)
- **Purpose**: Exports consumer lag and offset metrics

### Kafka UI

- **Image**: `provectuslabs/kafka-ui:latest`
- **Container**: `kafka-ui`
- **Port**: `8081` (web UI)
- **Purpose**: Web-based cluster management and topic browser
- **Access**: http://localhost:8081

### kcat (Kafka Cat)

- **Image**: `edenhill/kcat:1.7.1`
- **Container**: `kcat`
- **Purpose**: Command-line tool for producing/consuming messages
- **Usage**: `docker exec -it kcat kcat -b kafka:9092 -t campaign.created.json -C`

## Files in This Directory

- `kafka.yml` - JMX Prometheus exporter configuration
- `topics.yaml` - Topic definitions
- `create-topics.sh` - Script to create topics
- `README.md` - This file
- `KAFKA_TOPICS.md` - Topic standards and conventions
- `KAFKA_MONITORING.md` - Monitoring guide
- `KAFKA_SECURITY.md` - Security configuration guide
- `jmx_prometheus_javaagent.jar` - JMX metrics exporter (binary)

## Environment Variables

Configure via `.env` file or docker-compose environment:

- `KAFKA_BROKER` - Bootstrap server address (default: `kafka:9092` for containers, `localhost:29092` for host)
- `KAFKA_NODE_ID` - KRaft node ID (default: `1`)
- `CLUSTER_ID` - KRaft cluster ID (default: `MW-7IGsmQbmFkrf2x7Ho5A`)

For production security:
- `KAFKA_SASL_USERNAME` - SASL username
- `KAFKA_SASL_PASSWORD` - SASL password
- `KAFKA_SSL_*` - SSL certificate paths and passwords

## Common Operations

### List Topics

```bash
docker exec kafka kafka-topics --bootstrap-server kafka:9092 --list
```

### Describe Topic

```bash
docker exec kafka kafka-topics --bootstrap-server kafka:9092 --describe --topic campaign.created.json
```

### Produce Message

```bash
docker exec -it kcat kcat -b kafka:9092 -t campaign.created.json -P
# Type message and press Enter, Ctrl+D to send
```

### Consume Messages

```bash
docker exec -it kcat kcat -b kafka:9092 -t campaign.created.json -C
```

### List Consumer Groups

```bash
docker exec kafka kafka-consumer-groups --bootstrap-server kafka:9092 --list
```

### Describe Consumer Group

```bash
docker exec kafka kafka-consumer-groups --bootstrap-server kafka:9092 \
  --group my-consumer-group --describe
```

### Delete Topic

```bash
# WARNING: Permanently deletes topic and all data
docker exec kafka kafka-topics --bootstrap-server kafka:9092 \
  --delete --topic campaign.created.json
```

## Troubleshooting

### Kafka Won't Start

1. Check logs: `docker logs kafka`
2. Verify ports are not in use: `netstat -tuln | grep -E '9092|29092|9999'`
3. Check disk space: `df -h`
4. Verify KRaft configuration is correct

### Can't Connect from Client

1. **From container**: Use `kafka:9092` (INTERNAL listener)
2. **From host**: Use `localhost:29092` (EXTERNAL listener)
3. Verify `KAFKA_BROKER` environment variable is set correctly
4. Check Kafka is running: `docker ps | grep kafka`

### Topics Not Appearing

1. Topics must be created manually (auto-creation disabled)
2. Use `create-topics.sh` script or create manually
3. Verify topic creation: `docker exec kafka kafka-topics --bootstrap-server kafka:9092 --list`

### Consumer Lag High

1. Check Grafana dashboard for lag visualization
2. Identify slow consumer groups
3. Scale consumers or optimize processing
4. Check for errors in consumer logs

See individual guide files for more troubleshooting:
- [KAFKA_MONITORING.md](./KAFKA_MONITORING.md) - Monitoring and metrics
- [KAFKA_SECURITY.md](./KAFKA_SECURITY.md) - Security troubleshooting

## Additional Resources

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [KRaft Documentation](https://kafka.apache.org/documentation/#kraft)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#bestpractices)
- [Confluent Platform Documentation](https://docs.confluent.io/)

## Support

For issues or questions:
1. Check the troubleshooting sections in guide files
2. Review Kafka logs: `docker logs kafka`
3. Check monitoring dashboards for anomalies
4. Consult Kafka documentation

