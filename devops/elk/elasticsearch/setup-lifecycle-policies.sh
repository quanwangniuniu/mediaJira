#!/bin/bash

# Setup lifecycle policies for log retention (7 days)
# This script should be run after Elasticsearch is up and healthy

echo "Setting up Elasticsearch Index Lifecycle Management policies..."

# Wait for Elasticsearch to be ready
echo "Waiting for Elasticsearch to be ready..."
until curl -f http://localhost:9200/_cluster/health; do
  echo "Elasticsearch is not ready yet. Waiting..."
  sleep 5
done

echo "Elasticsearch is ready. Creating ILM policies..."

# Create Django logs policy
curl -X PUT "localhost:9200/_ilm/policy/django-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "delete": {
        "min_age": "7d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'

if [ $? -eq 0 ]; then
  echo "✓ Django logs policy created successfully"
else
  echo "✗ Failed to create Django logs policy"
fi

# Create NextJS logs policy
curl -X PUT "localhost:9200/_ilm/policy/nextjs-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "delete": {
        "min_age": "7d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'

if [ $? -eq 0 ]; then
  echo "✓ NextJS logs policy created successfully"
else
  echo "✗ Failed to create NextJS logs policy"
fi

echo "ILM policies setup complete!"
echo ""
echo "To verify policies, run:"
echo "  curl http://localhost:9200/_ilm/policy/django-logs-policy?pretty"
echo "  curl http://localhost:9200/_ilm/policy/nextjs-logs-policy?pretty"
