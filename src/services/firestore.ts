import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Category, MenuItem, CategoryFormData, MenuItemFormData, NutritionData, AllergenFlags } from '../types';
import { emptyNutrition, emptyAllergenFlags } from '../types';

// Helper to convert Firestore timestamp to Date
const toDate = (timestamp: unknown): Date => {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  return new Date();
};

// Helper to extract nutrition data from flat document structure
const extractNutrition = (data: Record<string, unknown>): NutritionData => ({
  calories: (data.calories as number) || 0,
  caloriesFromFat: (data.caloriesFromFat as number) || 0,
  totalFat: (data.totalFat as number) || 0,
  saturatedFat: (data.saturatedFat as number) || 0,
  transFat: (data.transFat as number) || 0,
  polyunsaturatedFat: (data.polyunsaturatedFat as number) || 0,
  monounsaturatedFat: (data.monounsaturatedFat as number) || 0,
  cholesterol: (data.cholesterol as number) || 0,
  sodium: (data.sodium as number) || 0,
  potassium: (data.potassium as number) || 0,
  totalCarbs: (data.totalCarbs as number) || 0,
  dietaryFiber: (data.dietaryFiber as number) || 0,
  totalSugars: (data.totalSugars as number) || 0,
  addedSugars: (data.addedSugars as number) || 0,
  protein: (data.protein as number) || 0,
});

// Helper to extract allergen data from flat or nested document structure
const extractAllergens = (data: Record<string, unknown>): AllergenFlags => {
  // Check if allergens are nested or flat
  const allergens = data.allergens as Record<string, boolean> | undefined;
  if (allergens && typeof allergens === 'object') {
    return { ...emptyAllergenFlags, ...allergens };
  }
  // Flat structure
  return {
    egg: (data.egg as boolean) || false,
    fish: (data.fish as boolean) || false,
    milk: (data.milk as boolean) || false,
    peanuts: (data.peanuts as boolean) || false,
    sesame: (data.sesame as boolean) || false,
    shellfish: (data.shellfish as boolean) || false,
    soy: (data.soy as boolean) || false,
    treeNuts: (data.treeNuts as boolean) || false,
    wheat: (data.wheat as boolean) || false,
    gluten: (data.gluten as boolean) || false,
    vegan: (data.vegan as boolean) || false,
    vegetarian: (data.vegetarian as boolean) || false,
  };
};

// Helper to transform Firestore document to MenuItem
const docToMenuItem = (docId: string, data: Record<string, unknown>): MenuItem => {
  // Check if nutrition is already nested or flat
  const hasNestedNutrition = data.nutrition && typeof data.nutrition === 'object';
  
  return {
    id: docId,
    name: (data.name as string) || '',
    categoryId: (data.categoryId as string) || '',
    categoryName: (data.categoryName as string) || '',
    isActive: data.isActive !== false,
    nutrition: hasNestedNutrition 
      ? { ...emptyNutrition, ...(data.nutrition as NutritionData) }
      : extractNutrition(data),
    allergens: extractAllergens(data),
    servingSize: data.servingSize as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

// ============ CATEGORIES ============

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, 'categories'), orderBy('displayOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as Category[];
}

export async function getCategory(id: string): Promise<Category | null> {
  const docRef = doc(db, 'categories', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: toDate(docSnap.data().createdAt),
    updatedAt: toDate(docSnap.data().updatedAt),
  } as Category;
}

export async function createCategory(data: CategoryFormData): Promise<string> {
  const docRef = await addDoc(collection(db, 'categories'), {
    ...data,
    itemCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<void> {
  const docRef = doc(db, 'categories', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  // First, check if category has items
  const items = await getItemsByCategory(id);
  if (items.length > 0) {
    throw new Error('Cannot delete category with existing items. Delete or move items first.');
  }
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
}

// ============ MENU ITEMS ============

export async function getItems(): Promise<MenuItem[]> {
  const q = query(collection(db, 'items'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToMenuItem(doc.id, doc.data() as Record<string, unknown>));
}

export async function getItemsByCategory(categoryId: string): Promise<MenuItem[]> {
  const q = query(
    collection(db, 'items'),
    where('categoryId', '==', categoryId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToMenuItem(doc.id, doc.data() as Record<string, unknown>));
}

export async function getItem(id: string): Promise<MenuItem | null> {
  const docRef = doc(db, 'items', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docToMenuItem(docSnap.id, docSnap.data() as Record<string, unknown>);
}

export async function createItem(data: MenuItemFormData): Promise<string> {
  const batch = writeBatch(db);
  
  // Create the item
  const itemRef = doc(collection(db, 'items'));
  batch.set(itemRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Increment category item count
  const categoryRef = doc(db, 'categories', data.categoryId);
  batch.update(categoryRef, {
    itemCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
  return itemRef.id;
}

export async function updateItem(id: string, data: Partial<MenuItemFormData>): Promise<void> {
  const docRef = doc(db, 'items', id);
  
  // If category is changing, update counts
  if (data.categoryId) {
    const existingItem = await getItem(id);
    if (existingItem && existingItem.categoryId !== data.categoryId) {
      const batch = writeBatch(db);
      
      // Update the item
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      // Decrement old category count
      const oldCategoryRef = doc(db, 'categories', existingItem.categoryId);
      batch.update(oldCategoryRef, {
        itemCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      
      // Increment new category count
      const newCategoryRef = doc(db, 'categories', data.categoryId);
      batch.update(newCategoryRef, {
        itemCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      return;
    }
  }
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateItemNutrition(id: string, nutrition: Partial<NutritionData>): Promise<void> {
  const docRef = doc(db, 'items', id);
  const item = await getItem(id);
  if (!item) throw new Error('Item not found');
  
  await updateDoc(docRef, {
    nutrition: { ...item.nutrition, ...nutrition },
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(id: string): Promise<void> {
  const item = await getItem(id);
  if (!item) throw new Error('Item not found');
  
  const batch = writeBatch(db);
  
  // Delete the item
  const itemRef = doc(db, 'items', id);
  batch.delete(itemRef);
  
  // Decrement category count
  const categoryRef = doc(db, 'categories', item.categoryId);
  batch.update(categoryRef, {
    itemCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
}

// ============ BULK OPERATIONS ============

export async function bulkCreateItems(items: MenuItemFormData[]): Promise<string[]> {
  const ids: string[] = [];
  const categoryUpdates: Record<string, number> = {};
  
  // Process in batches of 500 (Firestore limit)
  const batchSize = 500;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchItems = items.slice(i, i + batchSize);
    
    for (const item of batchItems) {
      const itemRef = doc(collection(db, 'items'));
      batch.set(itemRef, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ids.push(itemRef.id);
      
      // Track category counts
      categoryUpdates[item.categoryId] = (categoryUpdates[item.categoryId] || 0) + 1;
    }
    
    await batch.commit();
  }
  
  // Update category counts
  const countBatch = writeBatch(db);
  for (const [categoryId, count] of Object.entries(categoryUpdates)) {
    const categoryRef = doc(db, 'categories', categoryId);
    countBatch.update(categoryRef, {
      itemCount: increment(count),
      updatedAt: serverTimestamp(),
    });
  }
  await countBatch.commit();
  
  return ids;
}

// ============ UTILITY ============

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
