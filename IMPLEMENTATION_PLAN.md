# Cafe Rio Nutrition Calculator - Implementation Plan

## Project Overview
A React + Tailwind CSS web application for calculating nutritional information from Cafe Rio menu items, using Firebase for database, authentication, and hosting.

**Additional Requirements:**
- Full CRUD admin interface for managing categories, items, and nutrition data
- REST API endpoints for external website integration
- Ability to add/edit/delete categories, items, and individual nutrition fields

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Public Site   │   Admin Panel   │   Nutrition Calculator  │
│   (read-only)   │   (full CRUD)   │   (meal builder)        │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Cloud Functions (API)                  │
│  GET /categories    POST /items    PUT /items/:id   etc.    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firestore Database                        │
│   /categories    /items    /users    /savedMeals            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Source Analysis

### Excel File Structure
**File:** `Cafe Rio Summary Traditional round 12-15-25.xls`

**25 Sheets (Categories):**
1. Index (metadata - skip)
2. Add-Ins
3. Appetizers
4. Beans
5. Beverages - 20 oz
6. Beverages - 32 oz
7. Bowl Builds
8. Bowls - Build Your Own
9. Cheese
10. Custom - ADD
11. Custom - EXTRA
12. Custom - on the SIDE
13. Dessert
14. Dressing
15. Enchilada Style
16. Extra Protein
17. Kids Meals
18. Lettuce
19. Protein
20. Rice
21. Sauce
22. Sides
23. Test Menu 2025 (consider excluding)
24. Toppings
25. Tortilla

### Nutrition Columns (16 fields per item)
| Column | Field | Unit |
|--------|-------|------|
| 0 | Item Name | - |
| 1 | Calories | kcal |
| 2 | Calories from Fat | kcal |
| 3 | Total Fat | g |
| 4 | Saturated Fat | g |
| 5 | Trans Fat | g |
| 6 | Polyunsaturated Fat | g |
| 7 | Monounsaturated Fat | g |
| 8 | Cholesterol | mg |
| 9 | Sodium | mg |
| 10 | Potassium | mg |
| 11 | Total Carbohydrate | g |
| 12 | Dietary Fiber | g |
| 13 | Total Sugars | g |
| 14 | Added Sugars | g |
| 15 | Protein | g |

### Data Notes
- Header row is at row 0
- Data starts at row 11 (rows 1-10 appear to be empty/formatting)
- Some values are NaN (null) - need to handle gracefully
- Some items have size variations (e.g., "4 oz", "8 oz")

---

## Implementation Phases

### Phase 1: Data Processing & Firebase Setup
- [ ] **1.1** Create Python script to parse Excel and generate JSON
- [ ] **1.2** Clean and normalize data (handle NaN, standardize names)
- [ ] **1.3** Create Firestore data structure/schema
- [ ] **1.4** Write upload script to populate Firestore
- [ ] **1.5** Set up Firebase security rules

### Phase 2: Core Application Structure
- [x] **2.1** Complete React project setup
- [x] **2.2** Set up React Router with routes
- [x] **2.3** Configure Ant Design theme (Cafe Rio green #16a34a)
- [x] **2.4** Create shared Layout component
- [x] **2.5** Set up Firebase Auth context

### Phase 3: Admin Interface (CRUD)
- [ ] **3.1** Create admin layout with sidebar navigation
- [ ] **3.2** Build Categories management page
  - List all categories
  - Add new category
  - Edit category (name, display order)
  - Delete category (with confirmation)
- [ ] **3.3** Build Items management page
  - List items by category
  - Add new item to category
  - Edit item details and nutrition data
  - Delete item
  - Bulk import/export
- [ ] **3.4** Build Nutrition Fields editor
  - Inline editing of all 16 nutrition fields
  - Validation (numeric, ranges)
  - Add custom fields (future-proofing)
- [ ] **3.5** Admin authentication/authorization
  - Role-based access (admin vs user)
  - Protected admin routes

### Phase 4: API Endpoints (Cloud Functions)
- [ ] **4.1** Set up Firebase Cloud Functions project
- [ ] **4.2** Create REST API endpoints:
  - `GET /api/categories` - List all categories
  - `GET /api/categories/:id` - Get single category
  - `POST /api/categories` - Create category
  - `PUT /api/categories/:id` - Update category
  - `DELETE /api/categories/:id` - Delete category
  - `GET /api/items` - List all items (with filters)
  - `GET /api/items/:id` - Get single item
  - `POST /api/items` - Create item
  - `PUT /api/items/:id` - Update item
  - `DELETE /api/items/:id` - Delete item
  - `GET /api/items/category/:categoryId` - Items by category
- [ ] **4.3** API authentication (API keys or Firebase Auth tokens)
- [ ] **4.4** Rate limiting and CORS configuration
- [ ] **4.5** API documentation

### Phase 5: Data Layer & Services
- [ ] **5.1** Create TypeScript interfaces for nutrition data
- [ ] **5.2** Build Firestore service/hooks for CRUD operations
- [ ] **5.3** Implement optimistic updates for better UX
- [ ] **5.4** Add loading states and error handling
- [ ] **5.5** Real-time sync for admin updates

### Phase 6: Calculator Features (Public)
- [ ] **6.1** Build category-based menu browser
- [ ] **6.2** Create item selection mechanism (add/remove)
- [ ] **6.3** Implement real-time nutrition totals calculation
- [ ] **6.4** Add nutrition breakdown display (macros, detailed view)
- [ ] **6.5** Create meal summary card

### Phase 7: User Features (Auth Required)
- [ ] **7.1** Implement Email/Password authentication
- [ ] **7.2** Add Google Sign-In
- [ ] **7.3** Create saved meals feature (Firestore)
- [ ] **7.4** Add meal history/favorites

### Phase 8: UI/UX Polish
- [ ] **8.1** Mobile-responsive design
- [ ] **8.2** Search/filter functionality
- [ ] **8.3** Sorting options (calories, protein, etc.)
- [ ] **8.4** Visual nutrition indicators (progress bars, charts)
- [ ] **8.5** Daily value percentages

### Phase 9: Deployment
- [ ] **9.1** Configure Firebase Hosting
- [ ] **9.2** Deploy Cloud Functions
- [ ] **9.3** Set up CI/CD pipeline
- [ ] **9.4** Configure custom domain (optional)

---

## Firebase Data Structure

### Firestore Collections

```
/categories/{categoryId}
  - id: string
  - name: string
  - slug: string (URL-friendly)
  - description: string (optional)
  - displayOrder: number
  - isActive: boolean
  - itemCount: number
  - createdAt: timestamp
  - updatedAt: timestamp

/items/{itemId}
  - id: string
  - name: string
  - categoryId: string (reference)
  - categoryName: string (denormalized for queries)
  - isActive: boolean
  - nutrition: {
      calories: number
      caloriesFromFat: number
      totalFat: number
      saturatedFat: number
      transFat: number
      polyunsaturatedFat: number
      monounsaturatedFat: number
      cholesterol: number
      sodium: number
      potassium: number
      totalCarbs: number
      dietaryFiber: number
      totalSugars: number
      addedSugars: number
      protein: number
    }
  - servingSize: string (optional, e.g., "4 oz")
  - createdAt: timestamp
  - updatedAt: timestamp

/users/{userId}
  - email: string
  - displayName: string
  - role: 'user' | 'admin'
  - createdAt: timestamp

/users/{userId}/savedMeals/{mealId}
  - id: string
  - name: string
  - items: array<{itemId, quantity}>
  - totals: object (calculated nutrition)
  - createdAt: timestamp
  - updatedAt: timestamp

/apiKeys/{keyId} (for external API access)
  - key: string (hashed)
  - name: string
  - permissions: array<string>
  - isActive: boolean
  - createdAt: timestamp
  - lastUsed: timestamp
```

---

## API Endpoints Documentation

Base URL: `https://us-central1-cafe-rio-nutrition.cloudfunctions.net/api`

### Authentication
All write operations require either:
- Firebase Auth token in `Authorization: Bearer <token>` header
- API key in `X-API-Key: <key>` header

### Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/categories` | List all categories | No |
| GET | `/categories/:id` | Get single category | No |
| POST | `/categories` | Create category | Admin |
| PUT | `/categories/:id` | Update category | Admin |
| DELETE | `/categories/:id` | Delete category | Admin |

### Items

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/items` | List all items | No |
| GET | `/items/:id` | Get single item | No |
| GET | `/items?categoryId=xxx` | Filter by category | No |
| POST | `/items` | Create item | Admin |
| PUT | `/items/:id` | Update item | Admin |
| DELETE | `/items/:id` | Delete item | Admin |
| POST | `/items/bulk` | Bulk create/update | Admin |

### Example Responses

```json
// GET /categories
{
  "success": true,
  "data": [
    {
      "id": "protein",
      "name": "Protein",
      "displayOrder": 1,
      "itemCount": 34,
      "isActive": true
    }
  ]
}

// GET /items/:id
{
  "success": true,
  "data": {
    "id": "fire-grilled-chicken-4oz",
    "name": "Fire-Grilled Chicken - 4 oz",
    "categoryId": "protein",
    "categoryName": "Protein",
    "nutrition": {
      "calories": 170,
      "protein": 29,
      "totalFat": 6,
      ...
    }
  }
}
```

---

## UI Category Grouping (Suggested)

For better UX, group the 25 sheets into logical sections:

| UI Section | Excel Sheets |
|------------|--------------|
| **Build Your Meal** | Tortilla, Protein, Rice, Beans, Cheese, Lettuce |
| **Toppings & Extras** | Toppings, Sauce, Dressing, Add-Ins |
| **Customizations** | Custom - ADD, Custom - EXTRA, Custom - on the SIDE, Extra Protein |
| **Bowls** | Bowl Builds, Bowls - Build Your Own |
| **Appetizers & Sides** | Appetizers, Sides |
| **Beverages** | Beverages - 20 oz, Beverages - 32 oz |
| **Desserts** | Dessert |
| **Kids** | Kids Meals |
| **Special** | Enchilada Style |

---

## Technical Decisions

### Why These Choices?

| Decision | Reasoning |
|----------|-----------|
| **Vite** | Fast build times, modern React setup |
| **TypeScript** | Type safety for nutrition data |
| **Ant Design** | Comprehensive component library, tables, forms |
| **Tailwind CSS** | Utility-first for custom styling alongside Ant Design |
| **Firestore** | Real-time sync, offline support, scales well |
| **Firebase Auth** | Easy integration, multiple providers |
| **Firebase Hosting** | Zero-config deployment, CDN, SSL |

---

## Questions to Resolve

1. **Should "Test Menu 2025" items be included?** (Might be unreleased items)
2. **How to handle size variations?** (Show as separate items vs. dropdown)
3. **Should we show all 16 nutrition fields or a subset?**
4. **Any dietary restriction filters needed?** (vegetarian, gluten-free indicators)
5. **Offline functionality priority?** (Service worker, IndexedDB caching)

---

## Next Steps

1. Review and approve this plan
2. Start with Phase 1: Data processing script
3. Proceed sequentially through phases

---

*Last Updated: February 5, 2026*
