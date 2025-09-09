#!/usr/bin/env python3
"""
Convert full CSV data to JSON with all records
"""
import csv
import json

def convert_csv_to_json():
    csv_file = '/Users/yuweizhang/Downloads/Report 30-03-2025 - 30-03-2025.csv'
    json_file = '/Users/yuweizhang/mediaJira/test_package/test_data_full.json'
    
    data = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Convert numeric fields to numbers where possible
            converted_row = {}
            for key, value in row.items():
                if value == '-' or value == '':
                    converted_row[key] = 0 if key in ['Clicks', 'Cost', 'Revenue', 'Sales', 'Leads'] else value
                elif key in ['Clicks', 'Cost', 'Hard Costs', 'Total Revenue', 'Revenue', 'Recurring Revenue', 
                           'Profit', 'Net Profit', 'ROI', 'ROAS', 'Sales', 'Calls', 'Refund', 'Refund Count',
                           'Leads', 'New Leads', 'Cost per Lead', 'Cost per New Lead', 'Unique Sales',
                           'Cost per Unique Sale', 'Average Order Value', 'Unique Customers Revenue',
                           'Qualified Calls', 'Unqualified Calls', 'Unique Customers', 'Cost per Unique Customer',
                           'Carts', 'ATC Events', 'Purchased Carts', 'Cart Conversion Rate', 'Cost per ATC',
                           'Customers', 'Recurring Customers', 'Total Customers']:
                    try:
                        converted_row[key] = float(value) if '.' in str(value) else int(value)
                    except (ValueError, TypeError):
                        converted_row[key] = 0
                else:
                    converted_row[key] = value
            
            data.append(converted_row)
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Conversion completed!")
    print(f"   Input file: {csv_file}")
    print(f"   Output file: {json_file}")
    print(f"   Total records: {len(data)}")
    
    # Show statistics
    total_cost = sum(row.get('Cost', 0) for row in data)
    total_revenue = sum(row.get('Total Revenue', 0) for row in data)
    active_campaigns = len([row for row in data if row.get('Status') == 'ACTIVE'])
    total_leads = sum(row.get('Leads', 0) for row in data)
    
    print(f"   Total Cost: ${total_cost:,.2f}")
    print(f"   Total Revenue: ${total_revenue:,.2f}")
    print(f"   Active Campaigns: {active_campaigns}")
    print(f"   Total Leads: {total_leads}")

if __name__ == '__main__':
    convert_csv_to_json()