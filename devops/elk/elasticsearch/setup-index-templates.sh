#!/bin/bash

# Setup Elasticsearch index templates for Django and NextJS logs
# This script should be run from the host machine after Elasticsearch is up and healthy

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELASTICSEARCH_DIR="$SCRIPT_DIR"
ELASTICSEARCH_HOST="${ELASTICSEARCH_HOST:-http://localhost:9200}"

echo "Setting up Elasticsearch Index Templates..."
echo "Elasticsearch host: $ELASTICSEARCH_HOST"

# Wait for Elasticsearch to be ready
echo "Waiting for Elasticsearch to be ready..."
until curl -f "$ELASTICSEARCH_HOST/_cluster/health" > /dev/null 2>&1; do
  echo "Elasticsearch is not ready yet. Waiting..."
  sleep 5
done

echo "Elasticsearch is ready. Loading index templates..."

# Load Django logs template
echo "Loading Django logs template..."
TEMPLATE_NAME="django-logs-template"
TEMPLATE_FILE="$ELASTICSEARCH_DIR/django-logs-template.json"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "✗ Template file not found: $TEMPLATE_FILE"
  exit 1
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$ELASTICSEARCH_HOST/_index_template/$TEMPLATE_NAME" \
  -H 'Content-Type: application/json' \
  -d @"$TEMPLATE_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✓ Django logs template loaded successfully"
else
  echo "✗ Failed to load Django logs template (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

# Load NextJS logs template
echo "Loading NextJS logs template..."
TEMPLATE_NAME="nextjs-logs-template"
TEMPLATE_FILE="$ELASTICSEARCH_DIR/nextjs-logs-template.json"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "✗ Template file not found: $TEMPLATE_FILE"
  exit 1
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$ELASTICSEARCH_HOST/_index_template/$TEMPLATE_NAME" \
  -H 'Content-Type: application/json' \
  -d @"$TEMPLATE_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✓ NextJS logs template loaded successfully"
else
  echo "✗ Failed to load NextJS logs template (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

echo ""
echo "Index templates setup complete!"
echo ""
echo "To verify templates, run:"
echo "  curl $ELASTICSEARCH_HOST/_index_template/django-logs-template?pretty"
echo "  curl $ELASTICSEARCH_HOST/_index_template/nextjs-logs-template?pretty"

