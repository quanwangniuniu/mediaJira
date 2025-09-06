#!/bin/bash
# MediaJira Reports - One-click demo script
# Purpose: Complete demo of Template → Report → Submit → Approve → Export → Publish workflow

set -e  # Exit immediately on error

# Configuration
API_BASE="http://localhost:8000/api"
USER="admin"
PASS="Admin123test"
AUTH=(-u "$USER:$PASS")

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

function log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function wait_for_job() {
    local job_id="$1"
    local max_wait="${2:-60}"
    local waited=0
    
    log_info "Waiting for task completion: $job_id"
    
    while [ $waited -lt $max_wait ]; do
        status=$(curl -s "${AUTH[@]}" "$API_BASE/jobs/$job_id/" | jq -r '.status // "unknown"')
        
        case "$status" in
            "succeeded")
                log_success "Task completed: $job_id"
                return 0
                ;;
            "failed")
                log_error "Task failed: $job_id"
                curl -s "${AUTH[@]}" "$API_BASE/jobs/$job_id/" | jq '.'
                return 1
                ;;
            "queued"|"running")
                echo -n "."
                sleep 2
                waited=$((waited + 2))
                ;;
            *)
                log_warning "Unknown status: $status"
                sleep 2
                waited=$((waited + 2))
                ;;
        esac
    done
    
    log_error "Task timeout: $job_id"
    return 1
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    log_error "curl command not found, please install curl"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq command not found, please install jq"
    exit 1
fi

# Check API availability
if ! curl -s --connect-timeout 5 "$API_BASE/health/" > /dev/null; then
    log_error "API service unavailable: $API_BASE"
    exit 1
fi

echo -e "${BLUE}"
echo "=============================================="
echo "    MediaJira Reports - Complete Demo Workflow"
echo "=============================================="
echo -e "${NC}"

log_info "One-click demo script ready, please run specific functions..."
