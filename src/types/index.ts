// Nutrition data for a menu item
export interface NutritionData {
  calories: number;
  caloriesFromFat: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  polyunsaturatedFat: number;
  monounsaturatedFat: number;
  cholesterol: number;
  sodium: number;
  potassium: number;
  totalCarbs: number;
  dietaryFiber: number;
  totalSugars: number;
  addedSugars: number;
  protein: number;
}

// Empty nutrition data template
export const emptyNutrition: NutritionData = {
  calories: 0,
  caloriesFromFat: 0,
  totalFat: 0,
  saturatedFat: 0,
  transFat: 0,
  polyunsaturatedFat: 0,
  monounsaturatedFat: 0,
  cholesterol: 0,
  sodium: 0,
  potassium: 0,
  totalCarbs: 0,
  dietaryFiber: 0,
  totalSugars: 0,
  addedSugars: 0,
  protein: 0,
};

// Nutrition field metadata for display
export interface NutritionField {
  key: keyof NutritionData;
  label: string;
  unit: string;
  dailyValue?: number; // FDA daily value for percentage calculation
}

export const nutritionFields: NutritionField[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', dailyValue: 2000 },
  { key: 'caloriesFromFat', label: 'Calories from Fat', unit: 'kcal' },
  { key: 'totalFat', label: 'Total Fat', unit: 'g', dailyValue: 78 },
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', dailyValue: 20 },
  { key: 'transFat', label: 'Trans Fat', unit: 'g' },
  { key: 'polyunsaturatedFat', label: 'Polyunsaturated Fat', unit: 'g' },
  { key: 'monounsaturatedFat', label: 'Monounsaturated Fat', unit: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', dailyValue: 300 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', dailyValue: 2300 },
  { key: 'potassium', label: 'Potassium', unit: 'mg', dailyValue: 4700 },
  { key: 'totalCarbs', label: 'Total Carbohydrate', unit: 'g', dailyValue: 275 },
  { key: 'dietaryFiber', label: 'Dietary Fiber', unit: 'g', dailyValue: 28 },
  { key: 'totalSugars', label: 'Total Sugars', unit: 'g' },
  { key: 'addedSugars', label: 'Added Sugars', unit: 'g', dailyValue: 50 },
  { key: 'protein', label: 'Protein', unit: 'g', dailyValue: 50 },
];

// Category
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Menu Item
export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  nutrition: NutritionData;
  allergens?: AllergenFlags;
  servingSize?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User
export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

// Saved Meal
export interface SavedMeal {
  id: string;
  userId: string;
  name: string;
  items: { itemId: string; quantity: number }[];
  totals: NutritionData;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types for creating/editing
export type CategoryFormData = Omit<Category, 'id' | 'itemCount' | 'createdAt' | 'updatedAt'>;
export type MenuItemFormData = Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>;

// ============ ALLERGENS ============

// Allergen flags for a menu item
export interface AllergenFlags {
  egg: boolean;
  fish: boolean;
  milk: boolean;
  peanuts: boolean;
  sesame: boolean;
  shellfish: boolean;
  soy: boolean;
  treeNuts: boolean;
  wheat: boolean;
  gluten: boolean;
  vegan: boolean;
  vegetarian: boolean;
}

// Empty allergen flags template
export const emptyAllergenFlags: AllergenFlags = {
  egg: false,
  fish: false,
  milk: false,
  peanuts: false,
  sesame: false,
  shellfish: false,
  soy: false,
  treeNuts: false,
  wheat: false,
  gluten: false,
  vegan: false,
  vegetarian: false,
};

// Allergen type metadata
export interface AllergenType {
  key: keyof AllergenFlags;
  label: string;
  icon: string;
  isLifestyle?: boolean; // vegan, vegetarian are lifestyle not allergens
}

export const allergenTypes: AllergenType[] = [
  { key: 'egg', label: 'Egg', icon: '🥚' },
  { key: 'fish', label: 'Fish', icon: '🐟' },
  { key: 'milk', label: 'Milk', icon: '🥛' },
  { key: 'peanuts', label: 'Peanuts', icon: '🥜' },
  { key: 'sesame', label: 'Sesame', icon: '⚪' },
  { key: 'shellfish', label: 'Shellfish', icon: '🦐' },
  { key: 'soy', label: 'Soy', icon: '🫘' },
  { key: 'treeNuts', label: 'Tree Nuts', icon: '🌰' },
  { key: 'wheat', label: 'Wheat', icon: '🌾' },
  { key: 'gluten', label: 'Gluten', icon: '🍞' },
  { key: 'vegan', label: 'Vegan', icon: '🌱', isLifestyle: true },
  { key: 'vegetarian', label: 'Vegetarian', icon: '🥬', isLifestyle: true },
];

// Allergen item (menu item with allergen info)
export interface AllergenItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  allergens: AllergenFlags;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Allergen category
export interface AllergenCategory {
  id: string;
  name: string;
  displayOrder: number;
  itemCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Form types
export type AllergenItemFormData = Omit<AllergenItem, 'id' | 'createdAt' | 'updatedAt'>;
export type AllergenCategoryFormData = Omit<AllergenCategory, 'id' | 'itemCount' | 'createdAt' | 'updatedAt'>;
