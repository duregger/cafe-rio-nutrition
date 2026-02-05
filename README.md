# Cafe Rio Nutrition Calculator

A React + Tailwind CSS web application for calculating nutritional information from Cafe Rio menu items. Features a full admin interface for managing categories and items, plus REST API endpoints for external integration.

## Features

- **Nutrition Calculator**: Build your meal and see complete nutritional breakdown
- **Admin Interface**: Full CRUD for categories, items, and nutrition data
- **REST API**: External access to menu data for integration with other platforms
- **User Authentication**: Firebase Auth with email/password and Google sign-in
- **Saved Meals**: Authenticated users can save their meal combinations

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Ant Design, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Hosting, Cloud Functions)
- **API**: Express.js on Cloud Functions

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore, Auth, and Functions enabled

### Installation

```bash
# Install dependencies
npm install

# Install functions dependencies
cd functions && npm install && cd ..

# Start development server
npm run dev
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore, Authentication (Email/Password + Google), and Hosting
3. Update `src/config/firebase.ts` with your project credentials
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`

## Project Structure

```
cafe-rio-nutrition/
├── src/
│   ├── components/       # Reusable UI components
│   ├── config/           # Firebase configuration
│   ├── contexts/         # React contexts (Auth)
│   ├── pages/            # Page components
│   │   ├── admin/        # Admin panel pages
│   │   ├── Calculator.tsx
│   │   ├── Home.tsx
│   │   └── Login.tsx
│   ├── services/         # Firestore operations
│   └── types/            # TypeScript interfaces
├── functions/            # Cloud Functions (API)
├── scripts/              # Data import scripts
└── firebase.json         # Firebase configuration
```

## Admin Panel

Access the admin panel at `/admin/categories` to:

- **Categories**: Create, edit, delete, and reorder menu categories
- **Items**: Manage menu items with full nutrition data editing
- **Import**: Bulk import items from JSON files

## API Endpoints

Base URL: `https://us-central1-cafe-rio-nutrition.cloudfunctions.net/api`

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List all categories |
| GET | `/categories/:id` | Get single category |
| GET | `/items` | List all items |
| GET | `/items/:id` | Get single item |
| GET | `/items?categoryId=xxx` | Filter items by category |
| GET | `/health` | Health check |

### Protected Endpoints (Admin Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/categories` | Create category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| POST | `/items` | Create item |
| PUT | `/items/:id` | Update item |
| DELETE | `/items/:id` | Delete item |
| POST | `/items/bulk` | Bulk create items |

### Authentication

Protected endpoints require one of:
- Firebase Auth token: `Authorization: Bearer <token>`
- API key: `X-API-Key: <key>`

### Example Responses

```json
// GET /items?categoryId=protein
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "name": "Fire-Grilled Chicken - 4 oz",
      "categoryId": "protein",
      "categoryName": "Protein",
      "nutrition": {
        "calories": 170,
        "protein": 29,
        "totalFat": 6,
        "totalCarbs": 1,
        "sodium": 950
      },
      "servingSize": "4 oz",
      "isActive": true
    }
  ],
  "count": 32
}
```

## Data Import

### From Excel

1. Place your Excel file in the Downloads folder
2. Run the conversion script:
   ```bash
   python3 scripts/excel_to_json.py /path/to/your/file.xls
   ```
3. Upload the generated JSON via the Admin Import page

### JSON Format

```json
{
  "categories": ["Protein", "Rice", "Beans"],
  "items": [
    {
      "name": "Fire-Grilled Chicken - 4 oz",
      "category": "Protein",
      "nutrition": {
        "calories": 170,
        "protein": 29,
        "totalFat": 6,
        "saturatedFat": 1,
        "transFat": 0,
        "cholesterol": 95,
        "sodium": 950,
        "totalCarbs": 1,
        "dietaryFiber": 0,
        "totalSugars": 1,
        "addedSugars": 0
      }
    }
  ]
}
```

## Deployment

```bash
# Build the frontend
npm run build

# Deploy everything
firebase deploy

# Or deploy individually
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

## Development

```bash
# Run frontend dev server
npm run dev

# Run Firebase emulators (includes Functions)
firebase emulators:start

# Type checking
npm run build
```

## License

MIT
