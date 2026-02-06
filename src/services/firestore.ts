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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Category,
  MenuItem,
  CategoryFormData,
  MenuItemFormData,
  BaseItem,
  ItemCategory,
  NutritionData,
  AllergenFlags,
} from '../types';
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
  const allergens = data.allergens as Record<string, boolean> | undefined;
  if (allergens && typeof allergens === 'object') {
    return { ...emptyAllergenFlags, ...allergens };
  }
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

// Transform Firestore doc (legacy items) to MenuItem
const legacyDocToMenuItem = (docId: string, data: Record<string, unknown>): MenuItem => {
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

// Transform base item + category info to MenuItem (view model)
const baseItemToMenuItem = (
  base: BaseItem,
  categoryId: string,
  categoryName: string
): MenuItem => ({
  id: base.id,
  name: base.name,
  categoryId,
  categoryName,
  isActive: base.isActive,
  nutrition: base.nutrition,
  allergens: base.allergens,
  servingSize: base.servingSize,
  createdAt: base.createdAt,
  updatedAt: base.updatedAt,
});

// ============ CATEGORIES ============

export async function getCategories(): Promise<Category[]> {
  const categoriesSnap = await getDocs(
    query(collection(db, 'categories'), orderBy('displayOrder', 'asc'))
  );

  const baseSnap = await getDocs(collection(db, 'base_items'));
  const useLegacy = baseSnap.empty;

  let countByCategory: Record<string, number> = {};
  if (useLegacy) {
    const itemsSnap = await getDocs(collection(db, 'items'));
    itemsSnap.docs.forEach((d) => {
      const cid = (d.data() as { categoryId?: string }).categoryId || '';
      countByCategory[cid] = (countByCategory[cid] || 0) + 1;
    });
  } else {
    const assignmentsSnap = await getDocs(collection(db, 'item_categories'));
    assignmentsSnap.docs.forEach((d) => {
      const cid = (d.data() as ItemCategory).categoryId;
      countByCategory[cid] = (countByCategory[cid] || 0) + 1;
    });
  }

  return categoriesSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      itemCount: countByCategory[d.id] ?? (data.itemCount as number) ?? 0,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Category;
  });
}

export async function getCategory(id: string): Promise<Category | null> {
  const docRef = doc(db, 'categories', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const assignmentsSnap = await getDocs(
    query(collection(db, 'item_categories'), where('categoryId', '==', id))
  );

  return {
    id: docSnap.id,
    ...docSnap.data(),
    itemCount: assignmentsSnap.size,
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
  const assignmentsSnap = await getDocs(
    query(collection(db, 'item_categories'), where('categoryId', '==', id))
  );
  if (assignmentsSnap.size > 0) {
    throw new Error('Cannot delete category with existing items. Remove item assignments first.');
  }
  await deleteDoc(doc(db, 'categories', id));
}

// ============ BASE ITEMS ============

async function getBaseItem(id: string): Promise<BaseItem | null> {
  const docRef = doc(db, 'base_items', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const data = docSnap.data() as Record<string, unknown>;
  const hasNestedNutrition = data.nutrition && typeof data.nutrition === 'object';

  return {
    id: docSnap.id,
    name: (data.name as string) || '',
    isActive: data.isActive !== false,
    nutrition: hasNestedNutrition
      ? { ...emptyNutrition, ...(data.nutrition as NutritionData) }
      : extractNutrition(data),
    allergens: extractAllergens(data),
    servingSize: data.servingSize as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// ============ MENU ITEMS (view model - base item + category context) ============

export async function getItems(): Promise<MenuItem[]> {
  const baseSnap = await getDocs(collection(db, 'base_items'));
  if (baseSnap.empty) {
    const legacySnap = await getDocs(
      query(collection(db, 'items'), orderBy('name', 'asc'))
    );
    if (!legacySnap.empty) {
      return legacySnap.docs.map((d) =>
        legacyDocToMenuItem(d.id, d.data() as Record<string, unknown>)
      );
    }
    return [];
  }

  const [assignmentsSnap, categoriesSnap] = await Promise.all([
    getDocs(collection(db, 'item_categories')),
    getDocs(collection(db, 'categories')),
  ]);

  const categoryMap = new Map(categoriesSnap.docs.map((d) => [d.id, d.data().name as string]));
  const assignmentsByItem = new Map<string, { categoryId: string; categoryName: string }[]>();

  assignmentsSnap.docs.forEach((d) => {
    const a = d.data() as ItemCategory;
    const name = categoryMap.get(a.categoryId) || '';
    if (!assignmentsByItem.has(a.itemId)) {
      assignmentsByItem.set(a.itemId, []);
    }
    assignmentsByItem.get(a.itemId)!.push({ categoryId: a.categoryId, categoryName: name });
  });

  const results: MenuItem[] = [];
  baseSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const hasNestedNutrition = data.nutrition && typeof data.nutrition === 'object';
    const base: BaseItem = {
      id: d.id,
      name: (data.name as string) || '',
      isActive: data.isActive !== false,
      nutrition: hasNestedNutrition
        ? { ...emptyNutrition, ...(data.nutrition as NutritionData) }
        : extractNutrition(data),
      allergens: extractAllergens(data),
      servingSize: data.servingSize as string | undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };

    const assignments = assignmentsByItem.get(d.id);
    if (assignments && assignments.length > 0) {
      const primary = assignments[0];
      results.push(baseItemToMenuItem(base, primary.categoryId, primary.categoryName));
    } else {
      results.push(baseItemToMenuItem(base, '', 'Uncategorized'));
    }
  });

  return results;
}

export async function getItemsByCategory(categoryId: string): Promise<MenuItem[]> {
  const baseSnap = await getDocs(collection(db, 'base_items'));
  if (baseSnap.empty) {
    const legacySnap = await getDocs(
      query(
        collection(db, 'items'),
        where('categoryId', '==', categoryId),
        orderBy('name', 'asc')
      )
    );
    if (!legacySnap.empty) {
      return legacySnap.docs.map((d) =>
        legacyDocToMenuItem(d.id, d.data() as Record<string, unknown>)
      );
    }
    return [];
  }

  const [assignmentsSnap, categorySnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'item_categories'),
        where('categoryId', '==', categoryId)
      )
    ),
    getDoc(doc(db, 'categories', categoryId)),
  ]);

  const categoryName = categorySnap.exists() ? (categorySnap.data()?.name as string) : '';
  const itemIds = assignmentsSnap.docs.map((d) => (d.data() as ItemCategory).itemId);

  if (itemIds.length === 0) return [];

  const results: MenuItem[] = [];
  for (const itemId of itemIds) {
    const base = await getBaseItem(itemId);
    if (base) {
      results.push(baseItemToMenuItem(base, categoryId, categoryName));
    }
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export async function getItem(id: string): Promise<MenuItem | null> {
  const baseSnap = await getDoc(doc(db, 'base_items', id));
  if (!baseSnap.exists()) {
    const legacySnap = await getDoc(doc(db, 'items', id));
    if (legacySnap.exists()) {
      return legacyDocToMenuItem(
        legacySnap.id,
        legacySnap.data() as Record<string, unknown>
      );
    }
    return null;
  }

  const base = await getBaseItem(id);
  if (!base) return null;

  const assignmentsSnap = await getDocs(
    query(collection(db, 'item_categories'), where('itemId', '==', id))
  );
  const categoryDoc = assignmentsSnap.docs[0];
  const categoryId = categoryDoc ? (categoryDoc.data() as ItemCategory).categoryId : '';
  const categorySnap = categoryId ? await getDoc(doc(db, 'categories', categoryId)) : null;
  const categoryName = categorySnap?.exists() ? (categorySnap.data()?.name as string) : '';

  return baseItemToMenuItem(base, categoryId, categoryName);
}

export async function createItem(data: MenuItemFormData): Promise<string> {
  const batch = writeBatch(db);

  const baseRef = doc(collection(db, 'base_items'));
  batch.set(baseRef, {
    name: data.name,
    isActive: data.isActive !== false,
    nutrition: data.nutrition || emptyNutrition,
    allergens: data.allergens || emptyAllergenFlags,
    servingSize: data.servingSize || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const assignmentRef = doc(collection(db, 'item_categories'));
  batch.set(assignmentRef, {
    itemId: baseRef.id,
    categoryId: data.categoryId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return baseRef.id;
}

export async function updateItem(
  id: string,
  data: Partial<MenuItemFormData>,
  options?: { fromCategoryId?: string }
): Promise<void> {
  const baseRef = doc(db, 'base_items', id);

  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (data.name !== undefined) updates.name = data.name;
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.nutrition !== undefined) updates.nutrition = data.nutrition;
  if (data.allergens !== undefined) updates.allergens = data.allergens;
  if (data.servingSize !== undefined) updates.servingSize = data.servingSize;

  if (data.categoryId !== undefined) {
    const assignmentsSnap = await getDocs(
      query(collection(db, 'item_categories'), where('itemId', '==', id))
    );
    const targetCat = options?.fromCategoryId;
    const existing = targetCat
      ? assignmentsSnap.docs.find((d) => (d.data() as ItemCategory).categoryId === targetCat)
      : assignmentsSnap.docs[0];
    const oldCategoryId = existing ? (existing.data() as ItemCategory).categoryId : null;

    if (oldCategoryId !== data.categoryId) {
      const batch = writeBatch(db);
      batch.update(baseRef, updates);

      if (existing) batch.delete(existing.ref);

      batch.set(doc(collection(db, 'item_categories')), {
        itemId: id,
        categoryId: data.categoryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return;
    }
  }

  await updateDoc(baseRef, updates);
}

export async function updateItemNutrition(id: string, nutrition: Partial<NutritionData>): Promise<void> {
  const base = await getBaseItem(id);
  if (!base) throw new Error('Item not found');

  await updateDoc(doc(db, 'base_items', id), {
    nutrition: { ...base.nutrition, ...nutrition },
    updatedAt: serverTimestamp(),
  });
}

export async function updateItemAllergens(id: string, allergens: Partial<AllergenFlags>): Promise<void> {
  const base = await getBaseItem(id);
  if (!base) throw new Error('Item not found');

  await updateDoc(doc(db, 'base_items', id), {
    allergens: { ...(base.allergens || emptyAllergenFlags), ...allergens },
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(id: string): Promise<void> {
  const assignmentsSnap = await getDocs(
    query(collection(db, 'item_categories'), where('itemId', '==', id))
  );

  const batch = writeBatch(db);
  batch.delete(doc(db, 'base_items', id));

  assignmentsSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

// ============ BULK OPERATIONS ============

export async function bulkCreateItems(items: MenuItemFormData[]): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Map<string, string>();

  const batchSize = 400;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchItems = items.slice(i, i + batchSize);

    for (const item of batchItems) {
      const key = `${(item.name || '').toLowerCase()}|${JSON.stringify(item.nutrition || {})}`;
      const existingId = seen.get(key);
      if (existingId) {
        const assignmentRef = doc(collection(db, 'item_categories'));
        batch.set(assignmentRef, {
          itemId: existingId,
          categoryId: item.categoryId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        continue;
      }

      const baseRef = doc(collection(db, 'base_items'));
      batch.set(baseRef, {
        name: item.name,
        isActive: item.isActive !== false,
        nutrition: { ...emptyNutrition, ...(item.nutrition || {}) },
        allergens: item.allergens || emptyAllergenFlags,
        servingSize: item.servingSize || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ids.push(baseRef.id);
      seen.set(key, baseRef.id);

      const assignmentRef = doc(collection(db, 'item_categories'));
      batch.set(assignmentRef, {
        itemId: baseRef.id,
        categoryId: item.categoryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  return ids;
}

// ============ MIGRATION (one-time: items -> base_items + item_categories) ============

export async function migrateFromLegacyItems(): Promise<{ baseItems: number; assignments: number }> {
  const itemsSnap = await getDocs(
    query(collection(db, 'items'), orderBy('name', 'asc'))
  );

  if (itemsSnap.empty) {
    return { baseItems: 0, assignments: 0 };
  }

  const seen = new Map<string, string>();
  let baseCount = 0;
  let assignmentCount = 0;
  const batchSize = 400;

  for (let i = 0; i < itemsSnap.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const docs = itemsSnap.docs.slice(i, i + batchSize);

    for (const d of docs) {
      const data = d.data() as Record<string, unknown>;
      const hasNestedNutrition = data.nutrition && typeof data.nutrition === 'object';
      const nutrition = hasNestedNutrition
        ? { ...emptyNutrition, ...(data.nutrition as NutritionData) }
        : extractNutrition(data);
      const allergens = extractAllergens(data);

      const key = `${(data.name as string || '').toLowerCase()}|${JSON.stringify(nutrition)}`;
      let baseId = seen.get(key);

      if (!baseId) {
        const baseRef = doc(collection(db, 'base_items'));
        batch.set(baseRef, {
          name: data.name || '',
          isActive: data.isActive !== false,
          nutrition,
          allergens,
          servingSize: data.servingSize || null,
          createdAt: data.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        baseId = baseRef.id;
        seen.set(key, baseId);
        baseCount++;
      }

      const assignmentRef = doc(collection(db, 'item_categories'));
      batch.set(assignmentRef, {
        itemId: baseId,
        categoryId: data.categoryId || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      assignmentCount++;
    }

    await batch.commit();
  }

  return { baseItems: baseCount, assignments: assignmentCount };
}

export async function hasLegacyItems(): Promise<boolean> {
  const snap = await getDocs(collection(db, 'items'));
  return !snap.empty;
}

export async function hasBaseItems(): Promise<boolean> {
  const snap = await getDocs(collection(db, 'base_items'));
  return !snap.empty;
}

// ============ UTILITY ============

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
