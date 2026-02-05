#!/usr/bin/env python3
"""
Convert Cafe Rio Allergens Excel to JSON format for import.

Usage:
    python3 scripts/allergens_to_json.py /path/to/allergens.xls

Output:
    Creates cafe_rio_allergens.json in the same directory as the script
"""

import pandas as pd
import json
import sys
import os
from pathlib import Path

# Allergen/lifestyle column mapping
ALLERGEN_COLUMNS = {
    1: 'egg',
    2: 'fish', 
    3: 'milk',
    4: 'peanuts',
    5: 'sesame',
    6: 'shellfish',
    7: 'soy',
    8: 'treeNuts',
    9: 'wheat',
    10: 'gluten',
    11: 'vegan',
    12: 'vegetarian',
}

# Categories to exclude
EXCLUDE_CATEGORIES = ['Test Menu 2025']


def is_category_row(row):
    """Check if row is a category header (has name but all allergen columns are NaN)."""
    if pd.isna(row[0]):
        return False
    # Check if all allergen columns are NaN
    for col in range(1, 13):
        if pd.notna(row[col]):
            return False
    return True


def parse_allergens(df):
    """Parse the allergens dataframe into structured data."""
    items = []
    categories = []
    current_category = None
    
    for idx, row in df.iterrows():
        # Skip header rows
        if idx < 7:
            continue
            
        item_name = row[0]
        
        # Skip empty rows
        if pd.isna(item_name):
            continue
        
        item_name = str(item_name).strip()
        
        # Check if this is a category header
        if is_category_row(row):
            if item_name not in EXCLUDE_CATEGORIES:
                current_category = item_name
                if current_category not in categories:
                    categories.append(current_category)
            else:
                current_category = None  # Skip excluded categories
            continue
        
        # Skip items if we're in an excluded category
        if current_category is None:
            continue
        
        # Parse allergen flags
        allergens = {}
        for col_idx, allergen_key in ALLERGEN_COLUMNS.items():
            value = row[col_idx] if col_idx < len(row) else None
            # "X" means contains/applies, empty means doesn't
            allergens[allergen_key] = pd.notna(value) and str(value).strip().upper() == 'X'
        
        items.append({
            'name': item_name,
            'category': current_category,
            'allergens': allergens,
        })
    
    return categories, items


def convert_allergens_to_json(excel_path, output_path=None):
    """Convert Excel file to JSON format."""
    print(f"Reading Excel file: {excel_path}")
    
    df = pd.read_excel(excel_path, sheet_name='Per Menu Group', header=None)
    
    categories, items = parse_allergens(df)
    
    print(f"Found {len(categories)} categories")
    print(f"Found {len(items)} items")
    
    # Print category summary
    print("\nCategories:")
    for cat in categories:
        count = len([i for i in items if i['category'] == cat])
        print(f"  - {cat}: {count} items")
    
    # Create output
    output = {
        'categories': categories,
        'items': items,
        'allergenTypes': [
            {'key': 'egg', 'label': 'Egg', 'icon': '🥚'},
            {'key': 'fish', 'label': 'Fish', 'icon': '🐟'},
            {'key': 'milk', 'label': 'Milk', 'icon': '🥛'},
            {'key': 'peanuts', 'label': 'Peanuts', 'icon': '🥜'},
            {'key': 'sesame', 'label': 'Sesame', 'icon': '⚪'},
            {'key': 'shellfish', 'label': 'Shellfish', 'icon': '🦐'},
            {'key': 'soy', 'label': 'Soy', 'icon': '🫘'},
            {'key': 'treeNuts', 'label': 'Tree Nuts', 'icon': '🌰'},
            {'key': 'wheat', 'label': 'Wheat', 'icon': '🌾'},
            {'key': 'gluten', 'label': 'Gluten', 'icon': '🍞'},
            {'key': 'vegan', 'label': 'Vegan', 'icon': '🌱'},
            {'key': 'vegetarian', 'label': 'Vegetarian', 'icon': '🥬'},
        ],
        'metadata': {
            'source': os.path.basename(excel_path),
            'totalCategories': len(categories),
            'totalItems': len(items),
        }
    }
    
    # Write JSON
    if output_path is None:
        script_dir = Path(__file__).parent
        output_path = script_dir / 'cafe_rio_allergens.json'
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nOutput written to: {output_path}")
    
    return output


def main():
    if len(sys.argv) < 2:
        # Default path
        default_path = "/Users/samduregger/Downloads/Cafe Rio Allergens 12-15-25 (1).xls"
        if os.path.exists(default_path):
            excel_path = default_path
        else:
            print("Usage: python3 allergens_to_json.py /path/to/allergens.xls")
            sys.exit(1)
    else:
        excel_path = sys.argv[1]
    
    if not os.path.exists(excel_path):
        print(f"Error: File not found: {excel_path}")
        sys.exit(1)
    
    convert_allergens_to_json(excel_path)


if __name__ == '__main__':
    main()
