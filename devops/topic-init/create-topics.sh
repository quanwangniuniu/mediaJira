#!/bin/bash
# Script to create Kafka topics from topics.yaml definition
# Usage: ./create-topics.sh [bootstrap-server]
# 
# If bootstrap-server is not provided, defaults to:
# - INTERNAL: kafka:9092 (for containers)
# - EXTERNAL: localhost:29092 (for host/CI)
#
# This script uses Python to parse YAML file for better reliability.
# Requires: python3, pyyaml (pip install pyyaml)

set -e

# Default bootstrap server
BOOTSTRAP_SERVER="${1:-kafka:9092}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Creating Kafka topics from topics.yaml...${NC}"
echo -e "${YELLOW}Bootstrap server: ${BOOTSTRAP_SERVER}${NC}"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    # Use Python script (recommended - parses YAML properly)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "${SCRIPT_DIR}/create-topics.py" ]; then
        echo -e "${BLUE}Using Python script to parse YAML...${NC}"
        python3 "${SCRIPT_DIR}/create-topics.py" --bootstrap-server "${BOOTSTRAP_SERVER}" --yaml-file "${SCRIPT_DIR}/topics.yaml"
        exit $?
    fi
fi

# Fallback to manual topic creation (if Python not available)
echo -e "${YELLOW}Python not available, using manual topic creation...${NC}"
echo -e "${YELLOW}Note: For complete topic creation, use create-topics.py script${NC}"
echo ""

# Check if kafka-topics command is available
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

# Core topics (essential for application)
echo -e "${BLUE}Creating core topics...${NC}"

# Campaign topics
create_topic "campaign.created.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "campaign.updated.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "campaign.deleted.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "campaign.status_changed.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Asset topics
create_topic "asset.created.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "asset.updated.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "asset.deleted.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "asset.status_changed.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Task topics
create_topic "task.created.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "task.updated.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "task.status_changed.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "task.deleted.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Retrospective topics
create_topic "retrospective.created.json" 2 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "retrospective.updated.json" 2 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "retrospective.completed.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Budget approval topics
create_topic "budget_approval.request_created.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "budget_approval.request_approved.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "budget_approval.request_rejected.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Reports topics
create_topic "reports.report_created.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "reports.report_updated.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "reports.report_published.json" 2 1 "retention.ms=5184000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Metric upload topics
create_topic "metric_upload.uploaded.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "metric_upload.processed.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Optimization topics
create_topic "optimization.experiment_created.json" 2 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "optimization.experiment_completed.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Core domain topics
create_topic "core.project_created.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "core.project_updated.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "core.project_deleted.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "core.organization_created.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "core.organization_updated.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Teams topics
create_topic "teams.team_created.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "teams.team_updated.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "teams.member_added.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "teams.member_removed.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Authentication topics
create_topic "authentication.user_created.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "authentication.user_updated.json" 3 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "authentication.user_logged_in.json" 3 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Access control topics
create_topic "access_control.permission_granted.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "access_control.permission_revoked.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "access_control.role_assigned.json" 2 1 "retention.ms=2592000000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

# Workflows topics
create_topic "workflows.workflow_triggered.json" 2 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"
create_topic "workflows.workflow_completed.json" 2 1 "retention.ms=604800000,cleanup.policy=delete,compression.type=snappy,min.insync.replicas=1"

echo -e "${GREEN}All topics created successfully!${NC}"
echo ""
echo "To verify topics, run:"
echo "  kafka-topics --bootstrap-server ${BOOTSTRAP_SERVER} --list"
echo ""
echo "To describe a topic, run:"
echo "  kafka-topics --bootstrap-server ${BOOTSTRAP_SERVER} --describe --topic <topic-name>"
