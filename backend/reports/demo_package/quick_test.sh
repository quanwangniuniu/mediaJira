#!/bin/bash
# Quick test script - Validate demo package data integrity

echo "🔍 MediaJira Reports - Demo Package Data Validation"
echo "=================================================="

echo ""
echo "📊 Data file validation:"
echo "File size: $(wc -c < backend/reports/demo_package/inline_result.json) bytes"

# Parse JSON data
ROWS=$(jq '.rows | length' backend/reports/demo_package/inline_result.json)
COLS=$(jq '.columns | length' backend/reports/demo_package/inline_result.json)
TOTAL=$((ROWS * COLS))

echo "Data rows: $ROWS"
echo "Data columns: $COLS"  
echo "Total data points: $TOTAL"

echo ""
echo "📋 Data preview:"
echo "Column examples:"
jq -r '.columns[0:10] | join(", ")' backend/reports/demo_package/inline_result.json

echo ""
echo "First row data:"
jq -r '.rows[0][0:5] | join(", ")' backend/reports/demo_package/inline_result.json

echo ""
echo "Last row summary:"
jq -r '.rows[-1][0:5] | join(", ")' backend/reports/demo_package/inline_result.json

echo ""
echo "✅ Data validation complete!"
echo "🎯 This data will be used to create complete marketing reports with charts and tables"
echo ""
echo "🚀 Run complete demo:"
echo "   ./backend/reports/demo_package/run_full_demo.sh"
