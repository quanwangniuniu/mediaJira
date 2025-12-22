#!/bin/bash
# Script to create Kafka topics from topics.yaml definition
# Usage: ./create-topics.sh [bootstrap-server]
# 
# If bootstrap-server is not provided, defaults to:
# - INTERNAL: kafka:9092 (for containers)
# - EXTERNAL: localhost:29092 (for host/CI)

set -e

# Default bootstrap server
BOOTSTRAP_SERVER="${1:-kafka:9092}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating Kafka topics from topics.yaml...${NC}"
echo -e "${YELLOW}Bootstrap server: ${BOOTSTRAP_SERVER}${NC}"

# Check if kafka-topics command is available (from kafka container)
if ! command -v kafka-topics &> /dev/null; then
    echo -e "${RED}Error: kafka-topics command not found${NC}"
    echo "This script should be run from within the kafka container or with kafka-topics in PATH"
    echo "To run from host: docker exec -it kafka kafka-topics --bootstrap-server ${BOOTSTRAP_SERVER} ..."
    exit 1
fi

# Function to create a topic
create_topic() {
    local name=$1
    local partitions=$2
    local replication_factor=$3
    local config_options=$4

    echo -e "${YELLOW}Creating topic: ${name}${NC}"
    
    # Check if topic already exists
    if kafka-topics --bootstrap-server "${BOOTSTRAP_SERVER}" --list | grep -q "^${name}$"; then
        echo -e "${YELLOW}Topic ${name} already exists, skipping...${NC}"
        return
    fi

    # Build the command
    local cmd="kafka-topics --bootstrap-server ${BOOTSTRAP_SERVER} --create --topic ${name} --partitions ${partitions} --replication-factor ${replication_factor}"

    # Add config options if provided
    if [ -n "$config_options" ]; then
        cmd="${cmd} --config ${config_options}"
    fi

    # Execute command
    if eval "$cmd"; then
        echo -e "${GREEN}✓ Topic ${name} created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create topic ${name}${NC}"
        return 1
    fi
}

# Parse topics.yaml and create topics
# Note: This is a simplified parser. For production, consider using yq or a Python script
# This script expects a specific YAML format from topics.yaml

# Campaign topics
create_topic "campaign.created.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "campaign.updated.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "campaign.deleted.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Asset topics
create_topic "asset.created.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "asset.updated.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Retrospective topics
create_topic "retrospective.completed.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

echo -e "${GREEN}All topics created successfully!${NC}"
echo ""
echo "To verify topics, run:"
echo "  kafka-topics --bootstrap-server ${BOOTSTRAP_SERVER} --list"
echo ""
echo "To describe a topic, run:"
echo "  kafka-topics --bootstrap-server ${BOOTSTRAP_SERVER} --describe --topic <topic-name>"

