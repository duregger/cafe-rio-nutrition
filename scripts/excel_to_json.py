#!/usr/bin/env python3
"""
Convert Cafe Rio Excel nutrition data to JSON format for import.

Usage:
    python3 scripts/excel_to_json.py /path/to/excel_file.xls

Output:
    Creates cafe_rio_nutrition.json in the same directory as the script
"""

import pandas as pd
import json
import sys
import os
from pathlib import Path

# Sheets to skip (not menu items)
SKIP_SHEETS = ['Index']

# Optional: Sheets to exclude from import (test items)
EXCLUDE_SHEETS = ['Test Menu 2025']

# Column mapping from Excel to our schema
NUTRITION_COLUMNS = {
    'Calories ': 'calories',
    'Calories from Fat ': 'caloriesFromFat',
    'Total Fat (g)': 'totalFat',
    'Saturated Fat (g)': 'saturatedFat',
    'Trans Fat (g)': 'transFat',
    'Polyunsaturated Fat (g)': 'polyunsaturatedFat',
    'Monounsaturated Fat (g)': 'monounsaturatedFat',
    'Cholesterol (mg)': 'cholesterol',
    'Sodium (mg)': 'sodium',
    'Potassium (mg)': 'potassium',
    'Total Carbohydrate (g)': 'totalCarbs',
    'Dietary Fiber (g)': 'dietaryFiber',
    'Total Sugars (g)': 'totalSugars',
    'Added Sugars (g)': 'addedSugars',
    'Protein (g)': 'protein',
}


def clean_numeric(value):
    """Convert value to number, handling NaN and strings."""
    if pd.isna(value):
        return 0
    try:
        return round(float(value), 1)
    except (ValueError, TypeError):
        return 0


def parse_sheet(df, category_name):
    """Parse a single sheet into menu items."""
    items = []
    
    # The first column contains item names
    name_col = df.columns[0]
    
    for _, row in df.iterrows():
        item_name = row[name_col]
        
        # Skip empty rows or header rows
        if pd.isna(item_name) or item_name == category_name or item_name == '0':
            continue
        
        # Skip if name looks like a number (usually row markers)
        try:
            float(item_name)
            continue
        except (ValueError, TypeError):
            pass
        
        # Build nutrition object
        nutrition = {}
        for excel_col, json_key in NUTRITION_COLUMNS.items():
            if excel_col in df.columns:
                nutrition[json_key] = clean_numeric(row[excel_col])
            else:
                nutrition[json_key] = 0
        
        items.append({
            'name': str(item_name).strip(),
            'category': category_name,
            'nutrition': nutrition,
        })
    
    return items


def convert_excel_to_json(excel_path, output_path=None):
    """Convert Excel file to JSON format."""
    print(f"Reading Excel file: {excel_path}")
    
    excel_file = pd.ExcelFile(excel_path)
    all_items = []
    categories = []
    
    for sheet_name in excel_file.sheet_names:
        # Skip non-data sheets
        if sheet_name in SKIP_SHEETS:
            print(f"  Skipping: {sheet_name}")
            continue
        
        # Optionally skip test menu
        if sheet_name in EXCLUDE_SHEETS:
            print(f"  Excluding: {sheet_name} (test items)")
            continue
        
        print(f"  Processing: {sheet_name}")
        
        # Read sheet with header at row 0
        df = pd.read_excel(excel_file, sheet_name=sheet_name, header=0)
        
        # Skip rows until we find actual data (usually around row 10)
        df = df.dropna(how='all')
        
        # Parse items from this sheet
        items = parse_sheet(df, sheet_name)
        
        if items:
            categories.append(sheet_name)
            all_items.extend(items)
            print(f"    Found {len(items)} items")
    
    # Create output
    output = {
        'categories': categories,
        'items': all_items,
        'metadata': {
            'source': os.path.basename(excel_path),
            'totalCategories': len(categories),
            'totalItems': len(all_items),
        }
    }
    
    # Write JSON
    if output_path is None:
        script_dir = Path(__file__).parent
        output_path = script_dir / 'cafe_rio_nutrition.json'
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nOutput written to: {output_path}")
    print(f"Total: {len(all_items)} items in {len(categories)} categories")
    
    return output


def main():
    if len(sys.argv) < 2:
        # Default path
        default_path = "/Users/samduregger/Downloads/Cafe Rio Summary Traditional round 12-15-25.xls"
        if os.path.exists(default_path):
            excel_path = default_path
        else:
            print("Usage: python3 excel_to_json.py /path/to/excel_file.xls")
            sys.exit(1)
    else:
        excel_path = sys.argv[1]
    
    if not os.path.exists(excel_path):
        print(f"Error: File not found: {excel_path}")
        sys.exit(1)
    
    convert_excel_to_json(excel_path)


if __name__ == '__main__':
    main()
