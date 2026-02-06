# Cafe Rio Nutrition Data Audit

**Date:** February 6, 2025  
**Source:** `public/data/cafe_rio_nutrition.json` and `public/data/cafe_rio_allergens.json`

---

## Summary

| Metric | Value |
|--------|-------|
| **Total items** | 344 |
| **Unique item names** | 242 |
| **Names with multiple entries** | 56 |
| **Redundant entries** (same name + same nutrition in different categories) | 34 item names |
| **Intentional duplicates** (same name, different nutrition, e.g. 20oz vs 32oz) | 22 item names |
| **Extra rows** (could be deduplicated) | ~102 |

---

## Duplication Patterns

### 1. **Custom categories mirror base items**

Many items appear in both a "base" category and one or more "Custom" categories:

| Item | Base Category | Also In |
|------|---------------|---------|
| 6" Flour Tortilla - 1 ea | Add-Ins | Custom - EXTRA |
| Elotes - 2 oz | Add-Ins | Custom - ADD, Custom - EXTRA, Custom - on the SIDE |
| Guacamole - 1 scoop | Add-Ins | Custom - ADD, Custom - EXTRA, Custom - on the SIDE, Toppings |
| Queso - 2 fl oz | Add-Ins | Custom - ADD, Custom - EXTRA, Custom - on the SIDE |
| Roasted Seasonal Veg - 2 oz | Add-Ins | Custom - ADD, Custom - EXTRA, Custom - on the SIDE, Extra Protein, Protein |
| Black Beans - 4 oz | Beans | Custom - ADD |
| Avocado Corn Salsa - 2 fl oz | Toppings | Custom - ADD, Custom - EXTRA, Custom - on the SIDE |
| Chile Lime Tortilla Strips - 1 oz | Toppings | Custom - ADD, Custom - EXTRA, Custom - on the SIDE |

**Same nutrition** in every case — these are the same physical item, just listed under different category contexts (e.g. "add to bowl" vs "extra" vs "on the side").

### 2. **Beverages: 20 oz vs 32 oz**

22 beverage items appear in both `Beverages - 20 oz` and `Beverages - 32 oz` with **different nutrition** (portion size). These are intentional and correct.

### 3. **Category structure**

- **Custom - ADD** (29 items): Items you can add to a build
- **Custom - EXTRA** (25 items): Same items, "extra" portion context
- **Custom - on the SIDE** (22 items): Same items, "side" context
- **Bowls - Build Your Own** (57 items): Pre-built bowl combinations
- **Protein** (32), **Extra Protein** (27): Base proteins vs add-on proteins

---

## Items Per Category

| Category | Count |
|---------|-------|
| Bowls - Build Your Own | 57 |
| Protein | 32 |
| Custom - ADD | 29 |
| Extra Protein | 27 |
| Custom - EXTRA | 25 |
| Toppings | 23 |
| Custom - on the SIDE | 22 |
| Beverages - 20 oz | 21 |
| Beverages - 32 oz | 21 |
| Appetizers | 13 |
| Tortilla | 11 |
| Enchilada Style | 10 |
| Dressing | 9 |
| Sauce | 8 |
| Kids Meals | 7 |
| Beans | 6 |
| Bowl Builds | 6 |
| Add-Ins | 5 |
| Lettuce | 4 |
| Cheese | 2 |
| Dessert | 2 |
| Rice | 2 |
| Sides | 2 |

---

## Nutrition vs Allergens Sync

- Nutrition and allergen JSON files have **matching item counts** (344 each)
- All nutrition items have corresponding allergen data
- No orphaned records

---

## Recommendations

1. **Consider consolidating Custom categories**  
   If the app treats "Add", "Extra", and "on the SIDE" as the same item with different UX context, you could:
   - Keep one canonical entry per item (e.g. in Add-Ins, Toppings, Protein)
   - Use a `displayContexts` or `availableAs` field to indicate where it appears (add/extra/side)

2. **Deduplicate for Calculator/Nutrition display**  
   When showing the item picker, group by unique item name to avoid showing "Guacamole - 1 scoop" 5 times. The category filter could still show which categories include that item.

3. **Beverages**  
   Keep 20 oz and 32 oz as separate entries — they have different nutrition values.

4. **Data model option**  
   A normalized structure could be:
   - `base_items`: Unique items with nutrition (242 records)
   - `category_assignments`: Many-to-many (item ↔ category, with optional context like "add" vs "extra")
