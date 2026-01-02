# ELK Stack Setup and Usage Guide

## Overview

This guide covers the setup, configuration, and usage of the EFK (Elasticsearch, Filebeat, Kibana) stack for centralized logging in the local development environment. The stack aggregates logs from both Django (backend) and NextJS (frontend) applications using structured JSON logging.

## Architecture

```
Docker Containers (backend-dev, frontend-dev)
    ↓ (JSON structured logs)
Filebeat (lightweight shipper)
    ↓ (direct indexing)
Elasticsearch (indexed with templates)
    ↑
Kibana (visualization & dashboards)
```

**Key Design Decisions:**
- **JSON Logging at Source**: Django (using python-json-logger) and Next.js (using pino) output structured JSON logs
- **Filebeat as Shipper**: Lightweight Filebeat container watches Docker logs and forwards them directly to Elasticsearch
- **No Logstash**: Since logs are already structured JSON, we skip the heavy Logstash processing layer to save RAM

## Prerequisites

- Docker and Docker Compose installed
- At least 3GB of free RAM for the stack (reduced from 4GB by removing Logstash)
- Ports available: 9200 (Elasticsearch), 5601 (Kibana)

## Quick Start

1. **Start EFK services**:
   ```bash
   docker compose -f docker-compose.dev.yml up -d elasticsearch kibana filebeat
   ```

2. **Verify services are running**:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

3. **Check Elasticsearch health**:
   ```bash
   curl http://localhost:9200/_cluster/health
   ```

4. **Access Kibana**:
   Open http://localhost:5601 in your browser

## Initial Setup

### 1. Configure Index Lifecycle Policies

First, set up 7-day log retention policies. You can do this in two ways:

**Option A: Run the setup script (recommended)--Change to run in container**

```bash
# Wait for Elasticsearch to be ready (about 30-60 seconds)
sleep 30

# Run from host machine (Windows PowerShell)
cd mediaJira
.\devops\elk\elasticsearch\setup-lifecycle-policies.sh

# Or run from host machine (Linux/WSL/Git Bash)
cd mediaJira
chmod +x devops/elk/elasticsearch/setup-lifecycle-policies.sh
./devops/elk/elasticsearch/setup-lifecycle-policies.sh
```

**2. Load Index Templates

After the ILM policies are created, load the index templates that define the field mappings for Django and NextJS logs:

**Option A: Run the setup script (recommended)--Change to run in container**

```bash
# Run from host machine (Linux/WSL/Git Bash)
cd mediaJira
chmod +x devops/elk/elasticsearch/setup-index-templates.sh
./devops/elk/elasticsearch/setup-index-templates.sh

# For Windows PowerShell, use Git Bash or WSL, or use Option B (manual loading) instead
```



**Verify templates are loaded:**

```bash
# Check Django template
curl http://localhost:9200/_index_template/django-logs-template?pretty

# Check NextJS template
curl http://localhost:9200/_index_template/nextjs-logs-template?pretty
```

The templates will automatically apply when Filebeat creates indices matching the patterns (`django-logs-*` and `nextjs-logs-*`).



### 4. Create Index Patterns in Kibana

1. Go to Kibana → Stack Management → Index Patterns (or Data Views in newer versions)
2. Click "Create index pattern"
3. Create index pattern: `django-logs-*`
   - Time field: `@timestamp`
   - Click "Create index pattern"
4. Create index pattern: `nextjs-logs-*`
   - Time field: `@timestamp`
   - Click "Create index pattern"

### 5. Verify Log Ingestion

1. Generate some logs by using your application
2. Go to Kibana → Discover
3. Select one of the index patterns
4. You should see logs appearing

## Query Examples

### Basic Queries

**Find all errors**:
```
log_level: ERROR
```

**Find errors in Django backend**:
```
log_level: ERROR AND application: "django-backend"
```

**Find logs from specific container**:
```
container.name: "backend-dev"
```

**Time range queries**:
```
@timestamp: >=now-1h
@timestamp: >=now-1d
@timestamp: [2024-01-01 TO 2024-01-02]
```

**Search by message content**:
```
log_message: "database connection"
```

### Advanced Queries

**Find slow requests (NextJS)**:
```
application: "nextjs-frontend" AND response_time_ms: >1000
```

**Find errors with stack traces**:
```
log_level: ERROR AND _exists_: error_stack
```

**Filter by HTTP status code**:
```
http_status: >=500
```

**Search by request ID**:
```
request_id: "abc-123-def"
```

**Combine multiple conditions**:
```
(log_level: ERROR OR log_level: WARN) AND application: "django-backend" AND @timestamp: >=now-1h
```

## Dashboard Creation Guide

### Application Logs Dashboard

1. Go to Kibana → Dashboard → Create dashboard
2. Add visualizations:

**Log Level Distribution**:
- Type: Pie chart
- Index pattern: `django-logs-*` or `nextjs-logs-*`
- Aggregation: Terms on `log_level` field
- Size: Top 10
- Title: "Log Level Distribution"

**Logs Over Time**:
- Type: Line chart
- X-axis: Date histogram on `@timestamp` (15 minute interval)
- Y-axis: Count
- Split series: Terms on `log_level` (optional, for color coding)
- Title: "Logs Over Time"

**Recent Logs Table**:
- Type: Data table
- Columns: `@timestamp`, `log_level`, `logger_name`, `log_message`
- Sort by `@timestamp` descending
- Show top 50
- Title: "Recent Logs"

**Error Count**:
- Type: Metric
- Aggregation: Count
- Filter: `log_level: ERROR`
- Time range: Last 24 hours
- Title: "Error Count (24h)"

### Error Tracking Dashboard

1. Create new dashboard: "Error Tracking"

**Error Timeline**:
- Type: Area chart
- Filter: `log_level: ERROR`
- X-axis: Date histogram on `@timestamp` (1 hour interval)
- Y-axis: Count
- Title: "Error Timeline"

**Top Error Messages**:
- Type: Data table
- Filter: `log_level: ERROR`
- Aggregation: Terms on `log_message.keyword`
- Size: Top 20
- Metric: Count
- Title: "Top Error Messages"

**Error by Application**:
- Type: Pie chart
- Filter: `log_level: ERROR`
- Aggregation: Terms on `application`
- Size: Top 10
- Title: "Errors by Application"

**Error Stack Traces**:
- Type: Data table
- Filter: `log_level: ERROR AND _exists_: error_stack`
- Columns: `@timestamp`, `application`, `error_type`, `error_stack`
- Sort by `@timestamp` descending
- Title: "Error Stack Traces"

### Performance Metrics Dashboard

1. Create new dashboard: "Performance Metrics"

**Response Time Distribution (NextJS)**:
- Type: Histogram
- Index pattern: `nextjs-logs-*`
- Filter: `_exists_: response_time_ms`
- Field: `response_time_ms`
- Interval: 100ms
- Title: "Response Time Distribution"

**Average Response Time Over Time**:
- Type: Line chart
- X-axis: Date histogram on `@timestamp` (15 minute interval)
- Y-axis: Average of `response_time_ms`
- Filter: `_exists_: response_time_ms`
- Title: "Average Response Time"

**Slow Requests**:
- Type: Data table
- Filter: `response_time_ms: >1000`
- Columns: `@timestamp`, `http_method`, `http_url`, `response_time_ms`, `http_status`
- Sort by `response_time_ms` descending
- Title: "Slow Requests (>1s)"

**HTTP Status Codes**:
- Type: Pie chart
- Filter: `_exists_: http_status`
- Aggregation: Terms on `http_status`
- Size: Top 10
- Title: "HTTP Status Code Distribution"

## Monitoring and Maintenance

### Check Elasticsearch Status

```bash
# Cluster health
curl http://localhost:9200/_cluster/health?pretty

# Index status
curl http://localhost:9200/_cat/indices?v

# Disk usage
curl http://localhost:9200/_cat/allocation?v

# ILM policy status
curl http://localhost:9200/_ilm/policy/django-logs-policy?pretty
curl http://localhost:9200/_ilm/policy/nextjs-logs-policy?pretty
```

### View Service Logs

```bash
# Filebeat logs
docker compose -f docker-compose.dev.yml logs filebeat

# Elasticsearch logs
docker compose -f docker-compose.dev.yml logs elasticsearch

# Kibana logs
docker compose -f docker-compose.dev.yml logs kibana
```

### Manual Index Cleanup (if needed)

```bash
# List indices
curl http://localhost:9200/_cat/indices?v

# Delete old index manually (if ILM policy didn't work)
curl -X DELETE "localhost:9200/django-logs-2024-01-01"
```

## Troubleshooting

### Elasticsearch won't start

- Check if port 9200 is already in use
- Increase Docker memory limit (Docker Desktop → Settings → Resources)
- Check Elasticsearch logs: `docker compose logs elasticsearch`
- Ensure at least 2GB of memory is available

### No logs appearing in Kibana

1. Verify Filebeat is running: `docker compose ps filebeat`
2. Check Filebeat logs: `docker compose logs filebeat`
3. Verify indices exist: `curl http://localhost:9200/_cat/indices?v`
4. Check if containers are generating logs: `docker compose logs backend-dev | head -20`
5. Verify logs are in JSON format: `docker compose logs backend-dev | head -5` (should see JSON structure)

### High memory usage

- Reduce Elasticsearch heap: Edit `ES_JAVA_OPTS` in docker-compose.dev.yml
- Reduce retention period (edit ILM policies)
- Clean up old indices manually
- Check for memory leaks in applications

### Logs not parsing correctly

1. Check log format matches expected structure (should be JSON)
2. View raw logs in Kibana: Discover → Select index → View document
3. Check Filebeat configuration in `devops/elk/filebeat/filebeat.yml`
4. Verify logs are being decoded properly - check the `json` field in Elasticsearch documents

### Filebeat not collecting logs

1. Verify Docker socket is accessible: `ls -la /var/run/docker.sock`
2. Check container log paths: `ls -la /var/lib/docker/containers/`
3. Verify Filebeat has root permissions (user: root in docker-compose)
4. Check Filebeat logs for errors

## Resource Limits

For local development, the following resource limits are configured:

- **Elasticsearch**: 2GB heap (ES_JAVA_OPTS), 3GB total memory
- **Kibana**: 512MB total memory
- **Filebeat**: 256MB total memory
- **Total**: ~3.75GB RAM (reduced from ~4GB by removing Logstash)

Adjust these limits in `docker-compose.dev.yml` if needed based on your system resources.

## Log Format Details

### Django Logs

Django uses `json-log-formatter` which produces JSON logs with the following structure:
- `asctime`: Timestamp
- `levelname`: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `name`: Logger name
- `message`: Log message
- `process`: Process ID
- `thread`: Thread ID
- `exc_info`: Exception information (if error)

### NextJS Logs

NextJS uses Pino logger which produces JSON logs with:
- `time`: Unix timestamp in milliseconds
- `level`: Numeric level (10=TRACE, 20=DEBUG, 30=INFO, 40=WARN, 50=ERROR, 60=FATAL)
- `msg`: Log message
- `pid`: Process ID
- `hostname`: Hostname
- `err`: Error object (if error) with `type`, `message`, `stack`
- `req`: Request object (if HTTP request) with `method`, `url`, `statusCode`
- `responseTime`: Response time in milliseconds

## Production Considerations

⚠️ **This setup is for local development only**. For production:

1. Enable Elasticsearch security (`xpack.security.enabled=true`)
2. Configure Kibana authentication
3. Use SSL/TLS for all connections
4. Set up proper backup and retention policies
5. Use dedicated Elasticsearch cluster (not single-node)
6. Configure proper resource limits based on log volume
7. Set up monitoring and alerting
8. Use persistent volumes with proper backup strategy
9. Implement log sampling for high-volume environments
10. Use dedicated log aggregation infrastructure

## Additional Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Filebeat Documentation](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)
- [Filebeat Elasticsearch Output](https://www.elastic.co/guide/en/beats/filebeat/current/elasticsearch-output.html)

