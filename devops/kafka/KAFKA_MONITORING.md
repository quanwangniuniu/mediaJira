# Kafka Monitoring Guide

This guide describes how to monitor Kafka brokers and consumers in the MediaJira setup.

## Overview

Kafka observability is implemented through:
- **JMX Metrics**: Broker metrics exported via JMX Prometheus Java Agent
- **Kafka Exporter**: Consumer lag and offset metrics
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and alerting

## Metrics Sources

### 1. Kafka Broker Metrics (JMX)

Kafka brokers expose metrics via JMX on port `9999`. These are scraped by Prometheus using the JMX Prometheus Java Agent.

**Endpoint**: `http://kafka:9999/metrics`

**Key Metrics**:
- `kafka_server_brokertopicmetrics_messages_in_total` - Messages received per topic
- `kafka_server_brokertopicmetrics_bytes_in_total` - Bytes received per topic
- `kafka_server_brokertopicmetrics_bytes_out_total` - Bytes sent per topic
- `kafka_network_requestmetrics_requests_total` - Request rates by type
- `kafka_server_replicamanager_underreplicatedpartitions` - Under-replicated partitions
- `kafka_controller_activecontrollercount` - Active controller count (KRaft)
- `kafka_server_raft_metrics_current_state_info` - Raft state (KRaft)

### 2. Consumer Lag Metrics (Kafka Exporter)

The Kafka Exporter exposes consumer group lag and offset metrics.

**Endpoint**: `http://kafka-exporter:9308/metrics`

**Key Metrics**:
- `kafka_consumer_lag` - Lag per consumer group, topic, and partition
- `kafka_consumer_lag_sum` - Sum of lag per consumer group and topic
- `kafka_consumer_current_offset` - Current consumer offset
- `kafka_consumer_log_end_offset` - Log end offset

## Prometheus Configuration

Prometheus is configured to scrape both metric sources:

```yaml
scrape_configs:
  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka:9999']  # JMX metrics
  
  - job_name: 'kafka-exporter'
    static_configs:
      - targets: ['kafka-exporter:9308']  # Consumer lag metrics
```

**Access Prometheus**: http://localhost:9090

## Grafana Dashboards

Two pre-configured dashboards are available:

### 1. Kafka Broker Overview

**Location**: `devops/grafana/kafka-dashboard.json`

**Panels**:
- Broker Status (UP/DOWN)
- Messages In Per Second (by topic)
- Bytes In/Out Per Second (by topic)
- Request Rate (all request types)
- Request Error Rate
- Partition Count
- Under Replicated Partitions
- Active Controller Count (KRaft)
- Disk Usage
- Request Handler Pool Utilization

**To Import**:
1. Open Grafana: http://localhost:3001
2. Go to Dashboards → Import
3. Upload `kafka-dashboard.json` or paste its contents
4. Select Prometheus as data source

### 2. Kafka Consumer Lag

**Location**: `devops/grafana/kafka-consumer-lag-dashboard.json`

**Panels**:
- Consumer Lag by Group and Topic (graph)
- Consumer Lag by Partition (table)
- Total Consumer Lag (stat)
- Consumer Groups Count (stat)
- Consumer Lag Rate of Change
- Consumer Lag Distribution (pie chart)
- Max/Average Lag
- Consumer Offset vs Log End Offset

**To Import**:
1. Open Grafana: http://localhost:3001
2. Go to Dashboards → Import
3. Upload `kafka-consumer-lag-dashboard.json` or paste its contents
4. Select Prometheus as data source

## Key Metrics to Monitor

### Broker Health

**Critical Metrics**:
- `kafka_server_replicamanager_underreplicatedpartitions` should be **0**
- `kafka_controller_activecontrollercount` should be **1** (KRaft mode)
- Request error rates should be **low** (< 1% of total requests)

**Warning Signs**:
- Under-replicated partitions > 0
- High error rates
- Request handler pool utilization > 80%
- Disk usage approaching limits

### Throughput

**Metrics to Track**:
- `kafka_server_brokertopicmetrics_messages_in_total` - Message ingestion rate
- `kafka_server_brokertopicmetrics_bytes_in_total` - Data ingestion rate
- `kafka_network_requestmetrics_requests_total` - Request throughput

**Alert Thresholds**:
- Monitor for sudden drops (possible connectivity issues)
- Monitor for sudden spikes (possible load issues)

### Consumer Lag

**Critical Metric**: `kafka_consumer_lag`

**Alert Thresholds**:
- **Warning**: Lag > 1,000 messages
- **Critical**: Lag > 10,000 messages
- **Emergency**: Lag > 100,000 messages

**Actions**:
- If lag is increasing: Scale consumers or optimize processing
- If lag is constant: Consumer may be stuck
- If lag is decreasing: Consumer is catching up (normal)

## Querying Metrics

### Prometheus Queries

**Top topics by message rate**:
```promql
topk(10, sum(rate(kafka_server_brokertopicmetrics_messages_in_total[5m])) by (topic))
```

**Total consumer lag**:
```promql
sum(kafka_consumer_lag_sum)
```

**Consumer lag by group**:
```promql
sum(kafka_consumer_lag_sum) by (consumer_group)
```

**Request error rate**:
```promql
sum(rate(kafka_network_requestmetrics_requests_total{request=~"Produce|Fetch"}[5m])) by (request)
```

**Under-replicated partitions**:
```promql
kafka_server_replicamanager_underreplicatedpartitions
```

## Setting Up Alerts

### Example Alert Rules

Add to Prometheus alerting rules:

```yaml
groups:
  - name: kafka_alerts
    rules:
      - alert: KafkaUnderReplicatedPartitions
        expr: kafka_server_replicamanager_underreplicatedpartitions > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kafka has under-replicated partitions"
      
      - alert: KafkaConsumerLagHigh
        expr: sum(kafka_consumer_lag_sum) > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka consumer lag is high"
      
      - alert: KafkaRequestErrorRateHigh
        expr: |
          sum(rate(kafka_network_requestmetrics_requests_total{request=~"Produce|Fetch"}[5m])) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka request error rate is high"
```

## Troubleshooting

### Metrics Not Appearing

1. **Check Kafka JMX port**:
   ```bash
   docker exec kafka netstat -tuln | grep 9999
   ```

2. **Check Kafka Exporter**:
   ```bash
   docker exec kafka-exporter wget -qO- http://localhost:9308/metrics | head -20
   ```

3. **Check Prometheus targets**:
   - Go to http://localhost:9090/targets
   - Verify both `kafka` and `kafka-exporter` targets are UP

4. **Check Grafana data source**:
   - Verify Prometheus data source is configured correctly
   - Test the connection in Grafana

### High Consumer Lag

1. **Identify the consumer group**:
   ```bash
   docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
   ```

2. **Check lag for specific group**:
   ```bash
   docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
     --group my-consumer-group --describe
   ```

3. **Actions**:
   - Increase number of consumers in the group
   - Optimize message processing (reduce processing time)
   - Check for errors in consumer logs
   - Consider increasing partitions if throughput is the issue

### Missing Consumer Lag Metrics

If consumer lag metrics are not appearing:

1. **Verify consumer groups exist**:
   ```bash
   docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
   ```

2. **Verify Kafka Exporter is running**:
   ```bash
   docker ps | grep kafka-exporter
   ```

3. **Check Kafka Exporter logs**:
   ```bash
   docker logs kafka-exporter
   ```

## Best Practices

1. **Monitor Regularly**: Check dashboards daily for trends
2. **Set Up Alerts**: Configure alerts for critical metrics
3. **Baseline Metrics**: Understand normal ranges for your workload
4. **Track Trends**: Watch for gradual degradation over time
5. **Correlate Metrics**: Combine broker and consumer metrics for full picture
6. **Document Issues**: Keep notes on metric patterns during incidents

## Additional Resources

- [Kafka Metrics Documentation](https://kafka.apache.org/documentation/#monitoring)
- [JMX Prometheus Exporter](https://github.com/prometheus/jmx_exporter)
- [Kafka Exporter](https://github.com/danielqsj/kafka_exporter)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Documentation](https://grafana.com/docs/grafana/latest/dashboards/)

