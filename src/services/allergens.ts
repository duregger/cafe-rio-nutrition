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
import type { 
  AllergenItem, 
  AllergenCategory, 
  AllergenItemFormData, 
  AllergenCategoryFormData,
  AllergenFlags,
} from '../types';
import { emptyAllergenFlags } from '../types';

// Helper to convert Firestore timestamp to Date
const toDate = (timestamp: unknown): Date => {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  return new Date();
};

// Helper to extract allergen flags from flat or nested document structure
const extractAllergens = (data: Record<string, unknown>): AllergenFlags => {
  // Check if allergens are already nested
  if (data.allergens && typeof data.allergens === 'object') {
    return { ...emptyAllergenFlags, ...(data.allergens as AllergenFlags) };
  }
  // Flat structure - extract individual fields
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

// Helper to transform Firestore document to AllergenItem
const docToAllergenItem = (docId: string, data: Record<string, unknown>): AllergenItem => ({
  id: docId,
  name: (data.name as string) || '',
  categoryId: (data.categoryId as string) || '',
  categoryName: (data.categoryName as string) || '',
  isActive: data.isActive !== false,
  allergens: extractAllergens(data),
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

// ============ ALLERGEN CATEGORIES ============

export async function getAllergenCategories(): Promise<AllergenCategory[]> {
  const q = query(collection(db, 'allergenCategories'), orderBy('displayOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as AllergenCategory[];
}

export async function getAllergenCategory(id: string): Promise<AllergenCategory | null> {
  const docRef = doc(db, 'allergenCategories', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: toDate(docSnap.data().createdAt),
    updatedAt: toDate(docSnap.data().updatedAt),
  } as AllergenCategory;
}

export async function createAllergenCategory(data: AllergenCategoryFormData): Promise<string> {
  const docRef = await addDoc(collection(db, 'allergenCategories'), {
    ...data,
    itemCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateAllergenCategory(id: string, data: Partial<AllergenCategoryFormData>): Promise<void> {
  const docRef = doc(db, 'allergenCategories', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAllergenCategory(id: string): Promise<void> {
  const items = await getAllergenItemsByCategory(id);
  if (items.length > 0) {
    throw new Error('Cannot delete category with existing items. Delete or move items first.');
  }
  const docRef = doc(db, 'allergenCategories', id);
  await deleteDoc(docRef);
}

// ============ ALLERGEN ITEMS ============

export async function getAllergenItems(): Promise<AllergenItem[]> {
  const q = query(collection(db, 'allergenItems'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => docToAllergenItem(d.id, d.data() as Record<string, unknown>));
}

export async function getActiveAllergenItems(): Promise<AllergenItem[]> {
  const q = query(
    collection(db, 'allergenItems'),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => docToAllergenItem(d.id, d.data() as Record<string, unknown>));
}

export async function getAllergenItemsByCategory(categoryId: string): Promise<AllergenItem[]> {
  const q = query(
    collection(db, 'allergenItems'),
    where('categoryId', '==', categoryId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => docToAllergenItem(d.id, d.data() as Record<string, unknown>));
}

export async function getAllergenItem(id: string): Promise<AllergenItem | null> {
  const docRef = doc(db, 'allergenItems', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docToAllergenItem(docSnap.id, docSnap.data() as Record<string, unknown>);
}

export async function createAllergenItem(data: AllergenItemFormData): Promise<string> {
  const batch = writeBatch(db);
  
  const itemRef = doc(collection(db, 'allergenItems'));
  batch.set(itemRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  const categoryRef = doc(db, 'allergenCategories', data.categoryId);
  batch.update(categoryRef, {
    itemCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
  return itemRef.id;
}

export async function updateAllergenItem(id: string, data: Partial<AllergenItemFormData>): Promise<void> {
  const docRef = doc(db, 'allergenItems', id);
  
  if (data.categoryId) {
    const existingItem = await getAllergenItem(id);
    if (existingItem && existingItem.categoryId !== data.categoryId) {
      const batch = writeBatch(db);
      
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      const oldCategoryRef = doc(db, 'allergenCategories', existingItem.categoryId);
      batch.update(oldCategoryRef, {
        itemCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      
      const newCategoryRef = doc(db, 'allergenCategories', data.categoryId);
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

export async function updateAllergenItemFlags(id: string, allergens: Partial<AllergenFlags>): Promise<void> {
  const docRef = doc(db, 'allergenItems', id);
  const item = await getAllergenItem(id);
  if (!item) throw new Error('Item not found');
  
  await updateDoc(docRef, {
    allergens: { ...item.allergens, ...allergens },
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAllergenItem(id: string): Promise<void> {
  const item = await getAllergenItem(id);
  if (!item) throw new Error('Item not found');
  
  const batch = writeBatch(db);
  
  const itemRef = doc(db, 'allergenItems', id);
  batch.delete(itemRef);
  
  const categoryRef = doc(db, 'allergenCategories', item.categoryId);
  batch.update(categoryRef, {
    itemCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
}

// ============ BULK OPERATIONS ============

export async function bulkCreateAllergenItems(items: AllergenItemFormData[]): Promise<string[]> {
  const ids: string[] = [];
  const categoryUpdates: Record<string, number> = {};
  
  const batchSize = 500;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchItems = items.slice(i, i + batchSize);
    
    for (const item of batchItems) {
      const itemRef = doc(collection(db, 'allergenItems'));
      batch.set(itemRef, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ids.push(itemRef.id);
      categoryUpdates[item.categoryId] = (categoryUpdates[item.categoryId] || 0) + 1;
    }
    
    await batch.commit();
  }
  
  const countBatch = writeBatch(db);
  for (const [categoryId, count] of Object.entries(categoryUpdates)) {
    const categoryRef = doc(db, 'allergenCategories', categoryId);
    countBatch.update(categoryRef, {
      itemCount: increment(count),
      updatedAt: serverTimestamp(),
    });
  }
  await countBatch.commit();
  
  return ids;
}
