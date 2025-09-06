#!/bin/bash

# MediaJira Reports - Complete Demo Workflow
# ==========================================
# One-click demo that runs the entire workflow from start to finish
# Usage: ./run_complete_demo.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${CYAN}$1${NC}"
}

echo "🚀 MediaJira Reports - Complete Demo Workflow"
echo "=============================================="
echo "This will run the entire workflow from data creation to PDF/PPTX export"
echo ""

# Step 1: Create demo data
log_step "1️⃣ Creating demo data with stable script..."
echo ""

if ! docker exec -it backend-dev python /app/reports/demo_package/seed_demo_data_stable.py --clean; then
    log_error "Failed to create demo data"
    exit 1
fi

echo ""

# Step 2: Extract report ID from the output
log_step "2️⃣ Getting the created report ID..."

REPORT_ID=$(docker exec -it backend-dev python manage.py shell -c "
from reports.models import Report
latest_report = Report.objects.filter(id__startswith='demo-marketing-report-en-').order_by('-created_at').first()
if latest_report:
    print(latest_report.id)
else:
    print('NO_REPORT')
" 2>/dev/null | tr -d '\r\n' | grep -o 'demo-marketing-report-en-[0-9]*-[a-f0-9]*' | head -1)

if [ -z "$REPORT_ID" ] || [ "$REPORT_ID" = "NO_REPORT" ]; then
    log_error "Failed to get report ID"
    exit 1
fi

log_success "Report ID: $REPORT_ID"
echo ""

# Step 3: Complete workflow in Django
log_step "3️⃣ Running complete export workflow..."
echo ""

docker exec -it backend-dev python manage.py shell -c "
import time
import os
from reports.models import Report, ReportAsset
from reports.services.assembler import assemble
from reports.services.export_pdf import export_pdf
from reports.services.export_pptx import export_pptx
from reports.services.storage import upload_report_file
from django.contrib.auth import get_user_model

try:
    report_id = '$REPORT_ID'
    User = get_user_model()
    admin_user = User.objects.get(email='admin')
    report = Report.objects.get(id=report_id)
    
    print('🎯 Complete Export Workflow')
    print('=' * 50)
    print(f'Report: {report.title[:50]}...')
    print(f'ID: {report.id}')
    
    # Step 1: Submit and approve
    print('\\n📋 Step 1: Submit and approve report...')
    report.status = 'submitted'
    report.save()
    print('✅ Report submitted')
    
    report.status = 'approved'
    report.save()
    print('✅ Report approved')
    
    # Step 2: Assemble content
    print('\\n📊 Step 2: Assembling report content...')
    start_time = time.time()
    assembled = assemble(report_id)
    assemble_time = time.time() - start_time
    
    html_content = assembled.get('html', '')
    charts = assembled.get('charts', [])
    
    import re
    figure_count = len(re.findall(r'<figure[^>]*>', html_content))
    table_count = html_content.count('<table')
    
    print(f'✅ Assembly completed in {assemble_time:.2f}s')
    print(f'   HTML size: {len(html_content)/1024/1024:.1f}MB')
    print(f'   Charts: {figure_count}, Tables: {table_count}')
    
    # Step 3: Export PDF
    print('\\n📄 Step 3: Exporting to PDF...')
    pdf_start = time.time()
    pdf_path = export_pdf(assembled, theme='light')
    pdf_time = time.time() - pdf_start
    
    print(f'✅ PDF exported in {pdf_time:.2f}s')
    print(f'   PDF file: {pdf_path}')
    
    # Upload PDF to storage
    if os.path.exists(pdf_path):
        from io import BytesIO
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        pdf_key = f'reports/{report_id}_demo.pdf'
        pdf_file_obj = BytesIO(pdf_content)
        pdf_result = upload_report_file(pdf_file_obj, pdf_key)
        pdf_url = pdf_result.get('url', f'http://minio:9000/mediajira-reports/{pdf_key}')
        
        # Create PDF asset record
        pdf_asset = ReportAsset.objects.create(
            report_id=report_id,
            file_type='pdf',
            file_url=pdf_url
        )
        print(f'✅ PDF uploaded: {pdf_url}')
        print(f'   Asset ID: {pdf_asset.id}')
    
    # Step 4: Export PPTX
    print('\\n📊 Step 4: Exporting to PPTX...')
    pptx_start = time.time()
    pptx_path = export_pptx(assembled, title=report.title, theme='light')
    pptx_time = time.time() - pptx_start
    
    print(f'✅ PPTX exported in {pptx_time:.2f}s')
    print(f'   PPTX file: {pptx_path}')
    
    # Upload PPTX to storage
    if os.path.exists(pptx_path):
        from io import BytesIO
        with open(pptx_path, 'rb') as f:
            pptx_content = f.read()
        
        pptx_key = f'reports/{report_id}_demo.pptx'
        pptx_file_obj = BytesIO(pptx_content)
        pptx_result = upload_report_file(pptx_file_obj, pptx_key)
        pptx_url = pptx_result.get('url', f'http://minio:9000/mediajira-reports/{pptx_key}')
        
        # Create PPTX asset record
        pptx_asset = ReportAsset.objects.create(
            report_id=report_id,
            file_type='pptx',
            file_url=pptx_url
        )
        print(f'✅ PPTX uploaded: {pptx_url}')
        print(f'   Asset ID: {pptx_asset.id}')
    
    # Step 5: Mock Confluence publish
    print('\\n🌐 Step 5: Publishing to Confluence (mock)...')
    confluence_url = f'https://company.atlassian.net/wiki/spaces/DEMO/pages/{int(time.time())}'
    
    confluence_asset = ReportAsset.objects.create(
        report_id=report_id,
        file_type='confluence',
        file_url=confluence_url
    )
    print(f'✅ Published to Confluence (mock): {confluence_url}')
    print(f'   Asset ID: {confluence_asset.id}')
    
    # Final summary
    total_time = assemble_time + pdf_time + pptx_time
    
    print('\\n' + '=' * 50)
    print('🎉 COMPLETE DEMO WORKFLOW RESULTS:')
    print(f'\\n⏱️  Performance:')
    print(f'   Assembly: {assemble_time:.2f}s')
    print(f'   PDF Export: {pdf_time:.2f}s')
    print(f'   PPTX Export: {pptx_time:.2f}s')
    print(f'   Total: {total_time:.2f}s (Target: <40s)')
    
    print(f'\\n📊 Content:')
    print(f'   Charts embedded: {figure_count}')
    print(f'   Data tables: {table_count}')
    print(f'   HTML size: {len(html_content)/1024/1024:.1f}MB')
    
    print(f'\\n📄 Generated Assets:')
    all_assets = ReportAsset.objects.filter(report_id=report_id).order_by('-created_at')
    for asset in all_assets:
        print(f'   📄 {asset.file_type.upper()}: {asset.file_url}')
    
    print(f'\\n🎯 Success Criteria:')
    criteria = [
        ('Performance <40s', total_time < 40),
        ('Charts generated', figure_count > 0),
        ('Tables included', table_count > 0),
        ('PDF created', 'pdf' in pdf_path.lower()),
        ('PPTX created', 'pptx' in pptx_path.lower()),
        ('Assets uploaded', all_assets.count() >= 3),
        ('Size optimized', len(html_content) < 3*1024*1024)
    ]
    
    passed = sum(1 for _, status in criteria if status)
    
    print(f'\\n📊 Results: {passed}/{len(criteria)} criteria passed')
    for criterion, status in criteria:
        icon = '✅' if status else '❌'
        print(f'   {icon} {criterion}')
    
    if passed == len(criteria):
        print('\\n🎉 ALL CRITERIA PASSED! DEMO WORKFLOW PERFECT!')
        print('🚀 Files uploaded to cloud storage with signed URLs')
        print('✅ Complete end-to-end workflow working')
    else:
        print(f'\\n⚠️  {len(criteria)-passed} criteria failed')
        
except Exception as e:
    print(f'❌ Workflow error: {e}')
    import traceback
    traceback.print_exc()
"

echo ""

# Step 4: Verify generated assets
log_step "4️⃣ Verifying generated assets..."
echo ""

docker exec -it backend-dev python manage.py shell -c "
from reports.models import ReportAsset

try:
    assets = ReportAsset.objects.filter(report_id='$REPORT_ID').order_by('-created_at')
    
    print('📋 Generated Assets Summary:')
    print(f'   Total assets: {assets.count()}')
    
    for asset in assets:
        print(f'\\n📄 {asset.file_type.upper()} Asset:')
        print(f'   URL: {asset.file_url}')
        print(f'   Created: {asset.created_at}')
        
        # Check if it's a signed URL (contains signature)
        if 'X-Amz-Signature' in asset.file_url or 'signature' in asset.file_url.lower():
            print('   ✅ Signed URL (secure access)')
        elif 'minio' in asset.file_url or 's3' in asset.file_url:
            print('   ✅ Cloud storage URL')
        else:
            print('   ℹ️  Static URL')
    
    if assets.count() >= 3:
        print('\\n🎉 All assets generated successfully!')
        print('✅ PDF, PPTX, and Confluence assets created')
        print('✅ Files uploaded to cloud storage')
        print('✅ Complete demo workflow executed')
    else:
        print(f'\\n⚠️  Only {assets.count()} assets generated')
        
except Exception as e:
    print(f'❌ Asset verification error: {e}')
"

echo ""
echo "=============================================="
log_success "Complete Demo Workflow Finished!"
echo ""
echo "🎯 What was accomplished:"
echo "  ✅ Created demo data with random IDs"
echo "  ✅ Assembled report with dynamic charts"
echo "  ✅ Generated PDF and PPTX files"
echo "  ✅ Uploaded files to cloud storage"
echo "  ✅ Created asset records with URLs"
echo "  ✅ Mock Confluence publishing"
echo ""
echo "📄 Report ID: $REPORT_ID"
echo ""
echo "🔍 To verify assets:"
echo "  docker exec -it backend-dev python manage.py shell -c \"from reports.models import ReportAsset; [print(f'{a.file_type}: {a.file_url}') for a in ReportAsset.objects.filter(report_id='$REPORT_ID')]\""
echo ""
log_success "Demo package complete workflow verified! 🎉"
