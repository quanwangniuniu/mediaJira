# Kafka Topic Standards and Conventions

## Naming Convention

Topics follow the pattern: **`domain.action.format`**

### Format Components

- **domain**: The business domain or service name (e.g., `campaign`, `asset`, `retrospective`)
- **action**: The action or event type (e.g., `created`, `updated`, `deleted`, `completed`)
- **format**: The message format/serialization (e.g., `json`, `avro`, `protobuf`)

### Examples

- `campaign.created.json` - Campaign creation events in JSON format
- `asset.updated.json` - Asset update events in JSON format
- `retrospective.completed.json` - Completed retrospective events in JSON format

### Naming Rules

1. Use lowercase letters only
2. Separate words with dots (`.`)
3. Be descriptive but concise
4. Use past tense for actions (e.g., `created`, `updated`, `deleted`)
5. Specify the serialization format explicitly

## Topic Configuration Standards

### Partitions

- **Default**: 3 partitions per topic
- **Guidance**: 
  - Low throughput (< 1k msg/sec): 1-2 partitions
  - Medium throughput (1k-10k msg/sec): 3-6 partitions
  - High throughput (> 10k msg/sec): 6+ partitions
  - Consider consumer parallelism needs (max consumers = partition count)

### Replication Factor

- **Development**: 1 (single broker)
- **Production**: 3 (recommended for fault tolerance)
- **Minimum**: Should match or exceed `min.insync.replicas`

### Retention Policy

- **Time-based retention**: Use `retention.ms` for event logs
- **Size-based retention**: Use `retention.bytes` if size limits are needed
- **Common retention periods**:
  - Standard events: 7 days (604800000 ms)
  - Audit/deletion events: 30 days (2592000000 ms)
  - Long-term events: 90+ days or unlimited (-1)

### Cleanup Policy

- **delete**: For event logs (default)
- **compact**: For keyed topics where latest value per key is important
- **delete,compact**: For topics that need both behaviors

### Compression

- **Recommended**: `snappy` (good balance of speed and compression)
- **Alternatives**:
  - `gzip`: Better compression, higher CPU
  - `lz4`: Faster, less compression
  - `zstd`: Best compression, moderate CPU

### Minimum In-Sync Replicas

- **Development**: 1 (since replication factor is 1)
- **Production**: Should be at least 2 (typically replication_factor - 1)
- **Trade-off**: Higher values improve durability but reduce availability

## Topic Management

### Creating Topics

Topics should be **pre-defined** before clients use them. Auto-creation is disabled (`KAFKA_AUTO_CREATE_TOPICS_ENABLE=false`).

Use the provided script to create topics:

```bash
# From host machine (EXTERNAL listener)
docker exec -it kafka bash -c "cd / && /path/to/create-topics.sh localhost:29092"

# From within kafka container (INTERNAL listener)
./create-topics.sh kafka:9092
```

Or manually:

```bash
kafka-topics --bootstrap-server kafka:9092 --create \
  --topic campaign.created.json \
  --partitions 3 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete \
  --config compression.type=snappy
```

### Listing Topics

```bash
kafka-topics --bootstrap-server kafka:9092 --list
```

### Describing Topics

```bash
kafka-topics --bootstrap-server kafka:9092 --describe --topic campaign.created.json
```

### Modifying Topics

```bash
# Increase partitions (can only increase, not decrease)
kafka-topics --bootstrap-server kafka:9092 --alter \
  --topic campaign.created.json \
  --partitions 6

# Change config
kafka-configs --bootstrap-server kafka:9092 --alter \
  --entity-type topics \
  --entity-name campaign.created.json \
  --add-config retention.ms=2592000000
```

### Deleting Topics

```bash
# WARNING: This permanently deletes the topic and all its data
kafka-topics --bootstrap-server kafka:9092 --delete --topic campaign.created.json
```

## Current Topic Definitions

See `topics.yaml` for the complete list of defined topics with their configurations.

## Best Practices

1. **Never auto-create topics** in production - always pre-define
2. **Document topic purpose** in code comments or README
3. **Version topics** when schema changes (e.g., `campaign.created.v2.json`)
4. **Monitor topic metrics** (throughput, lag, size) regularly
5. **Set appropriate retention** to balance storage costs and data availability
6. **Use compression** to reduce network and storage usage
7. **Plan partitions** based on expected throughput and consumer parallelism
8. **Test topic configuration** in staging before production deployment

## Migration to Production

When moving to production, update the following in `topics.yaml`:

1. Increase `replication_factor` to 3
2. Increase `min.insync.replicas` to 2
3. Review retention policies based on business requirements
4. Re-assess partition counts based on production throughput
5. Consider adding ACLs for topic access control

