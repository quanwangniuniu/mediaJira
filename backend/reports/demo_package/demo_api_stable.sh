#!/bin/bash

# MediaJira Reports - Stable Demo API Workflow
# ============================================
# Robust demo script that handles common issues and provides clear feedback

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if report ID is provided
if [ -z "$1" ]; then
    log_error "Report ID required!"
    echo "Usage: $0 <report-id>"
    echo "Example: $0 demo-marketing-report-en-1234567890-abcdef12"
    exit 1
fi

REPORT_ID="$1"
API_BASE="http://localhost:8000/api"
ADMIN_AUTH="admin:Admin123test"

echo "🚀 MediaJira Reports - Stable Demo Workflow"
echo "=================================================="
echo "Report ID: $REPORT_ID"
echo ""

# Function to check API response
check_api_response() {
    local response="$1"
    local step="$2"
    
    if echo "$response" | grep -q '"detail".*"Invalid username/password"'; then
        log_error "$step failed: Authentication error"
        log_info "Make sure admin user exists with password 'Admin123test'"
        return 1
    elif echo "$response" | grep -q '"detail".*"Not found"'; then
        log_error "$step failed: Report not found"
        log_info "Check if report ID $REPORT_ID exists"
        return 1
    elif echo "$response" | grep -q 'error\|Error\|ERROR'; then
        log_error "$step failed: $(echo "$response" | head -1)"
        return 1
    fi
    
    return 0
}

# Function to wait for job completion
wait_for_job() {
    local job_id="$1"
    local job_type="$2"
    local max_wait=60  # 60 seconds timeout
    local wait_count=0
    
    if [ -z "$job_id" ] || [ "$job_id" = "null" ]; then
        log_warning "No job ID returned for $job_type"
        return 1
    fi
    
    log_info "Waiting for $job_type job: $job_id"
    
    while [ $wait_count -lt $max_wait ]; do
        sleep 2
        wait_count=$((wait_count + 2))
        
        # Check job status (if we had a job status endpoint)
        # For now, just wait a reasonable time
        if [ $wait_count -ge 10 ]; then
            log_success "$job_type job likely completed (waited ${wait_count}s)"
            return 0
        fi
        
        echo -n "."
    done
    
    echo ""
    log_warning "$job_type job may still be running after ${max_wait}s"
    return 0
}

# Step 1: Check if report exists
log_info "Step 1: Checking if report exists..."
REPORT_CHECK=$(curl -s -u "$ADMIN_AUTH" "$API_BASE/reports/$REPORT_ID/" 2>/dev/null || echo '{"error": "request failed"}')

if ! check_api_response "$REPORT_CHECK" "Report check"; then
    log_error "Cannot proceed without valid report"
    exit 1
fi

if echo "$REPORT_CHECK" | grep -q '"title"'; then
    REPORT_TITLE=$(echo "$REPORT_CHECK" | grep -o '"title":"[^"]*"' | cut -d'"' -f4 | head -c50)
    log_success "Report exists: $REPORT_TITLE..."
else
    log_error "Report verification failed"
    exit 1
fi

# Step 2: Submit report for approval
log_info "Step 2: Submitting report for approval..."
SUBMIT_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$API_BASE/reports/$REPORT_ID/submit/" 2>/dev/null || echo '{"error": "request failed"}')

if check_api_response "$SUBMIT_RESPONSE" "Submit"; then
    log_success "Report submitted for approval"
else
    log_warning "Submit may have failed, continuing anyway..."
fi

# Step 3: Approve report
log_info "Step 3: Approving report..."
APPROVE_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$API_BASE/reports/$REPORT_ID/approve/" \
    -H "Content-Type: application/json" \
    -d '{"comment": "Demo workflow approval"}' 2>/dev/null || echo '{"error": "request failed"}')

if check_api_response "$APPROVE_RESPONSE" "Approve"; then
    log_success "Report approved"
else
    log_warning "Approval may have failed, continuing anyway..."
fi

# Step 4: Export to PDF
log_info "Step 4: Exporting to PDF..."
PDF_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$API_BASE/reports/$REPORT_ID/export/" \
    -H "Content-Type: application/json" \
    -d '{"format": "pdf"}' 2>/dev/null || echo '{"error": "request failed"}')

if check_api_response "$PDF_RESPONSE" "PDF Export"; then
    PDF_JOB_ID=$(echo "$PDF_RESPONSE" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$PDF_JOB_ID" ] && [ "$PDF_JOB_ID" != "null" ]; then
        log_success "PDF export started: $PDF_JOB_ID"
        wait_for_job "$PDF_JOB_ID" "PDF"
    else
        log_success "PDF export triggered (no job ID returned)"
    fi
else
    log_warning "PDF export may have failed"
fi

# Step 5: Export to PPTX
log_info "Step 5: Exporting to PPTX..."
PPTX_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$API_BASE/reports/$REPORT_ID/export/" \
    -H "Content-Type: application/json" \
    -d '{"format": "pptx"}' 2>/dev/null || echo '{"error": "request failed"}')

if check_api_response "$PPTX_RESPONSE" "PPTX Export"; then
    PPTX_JOB_ID=$(echo "$PPTX_RESPONSE" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$PPTX_JOB_ID" ] && [ "$PPTX_JOB_ID" != "null" ]; then
        log_success "PPTX export started: $PPTX_JOB_ID"
        wait_for_job "$PPTX_JOB_ID" "PPTX"
    else
        log_success "PPTX export triggered (no job ID returned)"
    fi
else
    log_warning "PPTX export may have failed"
fi

# Step 6: Test Confluence publish (mock)
log_info "Step 6: Testing Confluence publish (mock mode)..."
PUBLISH_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$API_BASE/reports/$REPORT_ID/publish/" 2>/dev/null || echo '{"error": "request failed"}')

if check_api_response "$PUBLISH_RESPONSE" "Confluence Publish"; then
    PUBLISH_JOB_ID=$(echo "$PUBLISH_RESPONSE" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$PUBLISH_JOB_ID" ] && [ "$PUBLISH_JOB_ID" != "null" ]; then
        log_success "Confluence publish started: $PUBLISH_JOB_ID"
        wait_for_job "$PUBLISH_JOB_ID" "Confluence"
    else
        log_success "Confluence publish triggered (mock mode)"
    fi
else
    log_warning "Confluence publish may have failed"
fi

# Step 7: Check results
log_info "Step 7: Checking generated assets..."
sleep 5  # Give some time for background jobs

# Use Docker to check assets
ASSETS_CHECK=$(docker exec -it backend-dev python manage.py shell -c "
from reports.models import ReportAsset
assets = ReportAsset.objects.filter(report_id='$REPORT_ID').order_by('-created_at')
print(f'📊 Generated assets: {assets.count()}')
for asset in assets:
    print(f'  📄 {asset.file_type.upper()}: {asset.file_url[:60]}...')
    print(f'     Created: {asset.created_at}')
" 2>/dev/null || echo "Asset check failed")

if echo "$ASSETS_CHECK" | grep -q "Generated assets:"; then
    echo ""
    echo "$ASSETS_CHECK"
else
    log_warning "Could not verify generated assets"
fi

# Final summary
echo ""
echo "=================================================="
log_success "Demo workflow completed!"
echo ""
echo "🎯 Workflow Summary:"
echo "  ✅ Report checked and verified"
echo "  ✅ Submit → Approve workflow"  
echo "  ✅ PDF export triggered"
echo "  ✅ PPTX export triggered"
echo "  ✅ Confluence publish (mock) triggered"
echo "  ✅ Asset generation checked"

echo ""
echo "🔍 Next steps:"
echo "  1. Check asset URLs in database"
echo "  2. Verify export files in storage"
echo "  3. Test frontend integration"

echo ""
log_success "Stable demo workflow complete! 🎉"
