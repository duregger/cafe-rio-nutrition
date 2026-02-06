const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Allowed email domain
const ALLOWED_DOMAIN = 'caferio.com';

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// ============ AUTHENTICATION MIDDLEWARE ============

/**
 * Verify Firebase Auth token or API key
 * Only allows @caferio.com accounts
 */
const authenticate = async (req, res, next) => {
  // Check for API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    try {
      const keyDoc = await db.collection('apiKeys')
        .where('key', '==', apiKey)
        .where('isActive', '==', true)
        .limit(1)
        .get();
      
      if (!keyDoc.empty) {
        const keyData = keyDoc.docs[0].data();
        const expiresAt = keyData.expiresAt?.toDate?.() ?? keyData.expiresAt;
        if (expiresAt && new Date() > new Date(expiresAt)) {
          // Key expired - reject
        } else {
          req.apiKey = keyData;
          return next();
        }
      }
    } catch (error) {
      console.error('API key verification error:', error);
    }
  }

  // Check for Firebase Auth token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Verify email domain
      const email = decodedToken.email;
      if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return res.status(403).json({ 
          success: false, 
          error: `Access restricted to @${ALLOWED_DOMAIN} accounts only` 
        });
      }
      
      req.user = decodedToken;
      return next();
    } catch (error) {
      console.error('Token verification error:', error);
    }
  }

  res.status(401).json({ success: false, error: 'Unauthorized' });
};

/**
 * Check if user is admin
 */
const requireAdmin = async (req, res, next) => {
  if (req.apiKey) {
    // API keys are trusted
    return next();
  }

  if (req.user) {
    // Check user role in Firestore
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (userDoc.exists && userDoc.data().role === 'admin') {
        return next();
      }
    } catch (error) {
      console.error('Admin check error:', error);
    }
  }

  res.status(403).json({ success: false, error: 'Admin access required' });
};

// ============ CATEGORY ENDPOINTS ============

// GET /categories - List all categories
app.get('/categories', async (req, res) => {
  try {
    const snapshot = await db.collection('categories')
      .orderBy('displayOrder', 'asc')
      .get();
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// GET /categories/:id - Get single category
app.get('/categories/:id', async (req, res) => {
  try {
    const doc = await db.collection('categories').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      },
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category' });
  }
});

// POST /categories - Create category (requires admin)
app.post('/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, displayOrder, isActive } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Name and slug are required' });
    }

    const docRef = await db.collection('categories').add({
      name,
      slug,
      description: description || '',
      displayOrder: displayOrder || 0,
      isActive: isActive !== false,
      itemCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true, data: { id: docRef.id } });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// PUT /categories/:id - Update category (requires admin)
app.put('/categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, displayOrder, isActive } = req.body;
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.collection('categories').doc(req.params.id).update(updateData);
    res.json({ success: true, message: 'Category updated' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// DELETE /categories/:id - Delete category (requires admin)
app.delete('/categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Check if category has items
    const items = await db.collection('items')
      .where('categoryId', '==', req.params.id)
      .limit(1)
      .get();

    if (!items.empty) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing items',
      });
    }

    await db.collection('categories').doc(req.params.id).delete();
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// ============ ITEM ENDPOINTS ============

// GET /items - List all items (with optional category filter)
app.get('/items', async (req, res) => {
  try {
    let query = db.collection('items');

    // Filter by category if provided
    if (req.query.categoryId) {
      query = query.where('categoryId', '==', req.query.categoryId);
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query = query.where('isActive', '==', req.query.isActive === 'true');
    }

    const snapshot = await query.orderBy('name', 'asc').get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch items' });
  }
});

// GET /items/:id - Get single item
app.get('/items/:id', async (req, res) => {
  try {
    const doc = await db.collection('items').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      },
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch item' });
  }
});

// POST /items - Create item (requires admin)
app.post('/items', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, categoryId, categoryName, nutrition, servingSize, isActive } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ success: false, error: 'Name and categoryId are required' });
    }

    const batch = db.batch();

    // Create item
    const itemRef = db.collection('items').doc();
    batch.set(itemRef, {
      name,
      categoryId,
      categoryName: categoryName || '',
      nutrition: nutrition || {},
      servingSize: servingSize || '',
      isActive: isActive !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update category item count
    const categoryRef = db.collection('categories').doc(categoryId);
    batch.update(categoryRef, {
      itemCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.status(201).json({ success: true, data: { id: itemRef.id } });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ success: false, error: 'Failed to create item' });
  }
});

// PUT /items/:id - Update item (requires admin)
app.put('/items/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, categoryId, categoryName, nutrition, servingSize, isActive } = req.body;
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (name !== undefined) updateData.name = name;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (categoryName !== undefined) updateData.categoryName = categoryName;
    if (nutrition !== undefined) updateData.nutrition = nutrition;
    if (servingSize !== undefined) updateData.servingSize = servingSize;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle category change (update item counts)
    if (categoryId !== undefined) {
      const existingDoc = await db.collection('items').doc(req.params.id).get();
      if (existingDoc.exists && existingDoc.data().categoryId !== categoryId) {
        const batch = db.batch();
        
        // Update item
        batch.update(db.collection('items').doc(req.params.id), updateData);
        
        // Decrement old category
        batch.update(db.collection('categories').doc(existingDoc.data().categoryId), {
          itemCount: admin.firestore.FieldValue.increment(-1),
        });
        
        // Increment new category
        batch.update(db.collection('categories').doc(categoryId), {
          itemCount: admin.firestore.FieldValue.increment(1),
        });
        
        await batch.commit();
        return res.json({ success: true, message: 'Item updated' });
      }
    }

    await db.collection('items').doc(req.params.id).update(updateData);
    res.json({ success: true, message: 'Item updated' });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
});

// DELETE /items/:id - Delete item (requires admin)
app.delete('/items/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const doc = await db.collection('items').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const batch = db.batch();
    
    // Delete item
    batch.delete(db.collection('items').doc(req.params.id));
    
    // Decrement category count
    batch.update(db.collection('categories').doc(doc.data().categoryId), {
      itemCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete item' });
  }
});

// POST /items/bulk - Bulk create items (requires admin)
app.post('/items/bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    const categoryUpdates = {};
    const createdIds = [];

    // Process in batches of 500
    const batchSize = 500;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = db.batch();
      const batchItems = items.slice(i, i + batchSize);

      for (const item of batchItems) {
        const itemRef = db.collection('items').doc();
        batch.set(itemRef, {
          name: item.name,
          categoryId: item.categoryId,
          categoryName: item.categoryName || '',
          nutrition: item.nutrition || {},
          servingSize: item.servingSize || '',
          isActive: item.isActive !== false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        createdIds.push(itemRef.id);
        categoryUpdates[item.categoryId] = (categoryUpdates[item.categoryId] || 0) + 1;
      }

      await batch.commit();
    }

    // Update category counts
    const countBatch = db.batch();
    for (const [categoryId, count] of Object.entries(categoryUpdates)) {
      countBatch.update(db.collection('categories').doc(categoryId), {
        itemCount: admin.firestore.FieldValue.increment(count),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await countBatch.commit();

    res.status(201).json({
      success: true,
      data: { ids: createdIds },
      message: `Created ${createdIds.length} items`,
    });
  } catch (error) {
    console.error('Error bulk creating items:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk create items' });
  }
});

// ============ ALLERGEN CATEGORY ENDPOINTS ============

// GET /allergen-categories - List all allergen categories
app.get('/allergen-categories', async (req, res) => {
  try {
    const snapshot = await db.collection('allergenCategories')
      .orderBy('displayOrder', 'asc')
      .get();
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching allergen categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch allergen categories' });
  }
});

// POST /allergen-categories - Create allergen category (requires admin)
app.post('/allergen-categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, displayOrder, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const docRef = await db.collection('allergenCategories').add({
      name,
      displayOrder: displayOrder || 0,
      isActive: isActive !== false,
      itemCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true, data: { id: docRef.id } });
  } catch (error) {
    console.error('Error creating allergen category:', error);
    res.status(500).json({ success: false, error: 'Failed to create allergen category' });
  }
});

// PUT /allergen-categories/:id - Update allergen category (requires admin)
app.put('/allergen-categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, displayOrder, isActive } = req.body;
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (name !== undefined) updateData.name = name;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.collection('allergenCategories').doc(req.params.id).update(updateData);
    res.json({ success: true, message: 'Allergen category updated' });
  } catch (error) {
    console.error('Error updating allergen category:', error);
    res.status(500).json({ success: false, error: 'Failed to update allergen category' });
  }
});

// DELETE /allergen-categories/:id - Delete allergen category (requires admin)
app.delete('/allergen-categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const items = await db.collection('allergenItems')
      .where('categoryId', '==', req.params.id)
      .limit(1)
      .get();

    if (!items.empty) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing items',
      });
    }

    await db.collection('allergenCategories').doc(req.params.id).delete();
    res.json({ success: true, message: 'Allergen category deleted' });
  } catch (error) {
    console.error('Error deleting allergen category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete allergen category' });
  }
});

// ============ ALLERGEN ITEM ENDPOINTS ============

// GET /allergen-items - List all allergen items (with optional filters)
app.get('/allergen-items', async (req, res) => {
  try {
    let query = db.collection('allergenItems');

    if (req.query.categoryId) {
      query = query.where('categoryId', '==', req.query.categoryId);
    }

    if (req.query.isActive !== undefined) {
      query = query.where('isActive', '==', req.query.isActive === 'true');
    }

    const snapshot = await query.orderBy('name', 'asc').get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('Error fetching allergen items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch allergen items' });
  }
});

// GET /allergen-items/:id - Get single allergen item
app.get('/allergen-items/:id', async (req, res) => {
  try {
    const doc = await db.collection('allergenItems').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Allergen item not found' });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      },
    });
  } catch (error) {
    console.error('Error fetching allergen item:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch allergen item' });
  }
});

// POST /allergen-items - Create allergen item (requires admin)
app.post('/allergen-items', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, categoryId, categoryName, allergens, isActive } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ success: false, error: 'Name and categoryId are required' });
    }

    const batch = db.batch();

    const itemRef = db.collection('allergenItems').doc();
    batch.set(itemRef, {
      name,
      categoryId,
      categoryName: categoryName || '',
      allergens: allergens || {},
      isActive: isActive !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const categoryRef = db.collection('allergenCategories').doc(categoryId);
    batch.update(categoryRef, {
      itemCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.status(201).json({ success: true, data: { id: itemRef.id } });
  } catch (error) {
    console.error('Error creating allergen item:', error);
    res.status(500).json({ success: false, error: 'Failed to create allergen item' });
  }
});

// PUT /allergen-items/:id - Update allergen item (requires admin)
app.put('/allergen-items/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, categoryId, categoryName, allergens, isActive } = req.body;
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (name !== undefined) updateData.name = name;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (categoryName !== undefined) updateData.categoryName = categoryName;
    if (allergens !== undefined) updateData.allergens = allergens;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle category change
    if (categoryId !== undefined) {
      const existingDoc = await db.collection('allergenItems').doc(req.params.id).get();
      if (existingDoc.exists && existingDoc.data().categoryId !== categoryId) {
        const batch = db.batch();
        
        batch.update(db.collection('allergenItems').doc(req.params.id), updateData);
        batch.update(db.collection('allergenCategories').doc(existingDoc.data().categoryId), {
          itemCount: admin.firestore.FieldValue.increment(-1),
        });
        batch.update(db.collection('allergenCategories').doc(categoryId), {
          itemCount: admin.firestore.FieldValue.increment(1),
        });
        
        await batch.commit();
        return res.json({ success: true, message: 'Allergen item updated' });
      }
    }

    await db.collection('allergenItems').doc(req.params.id).update(updateData);
    res.json({ success: true, message: 'Allergen item updated' });
  } catch (error) {
    console.error('Error updating allergen item:', error);
    res.status(500).json({ success: false, error: 'Failed to update allergen item' });
  }
});

// DELETE /allergen-items/:id - Delete allergen item (requires admin)
app.delete('/allergen-items/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const doc = await db.collection('allergenItems').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Allergen item not found' });
    }

    const batch = db.batch();
    batch.delete(db.collection('allergenItems').doc(req.params.id));
    batch.update(db.collection('allergenCategories').doc(doc.data().categoryId), {
      itemCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.json({ success: true, message: 'Allergen item deleted' });
  } catch (error) {
    console.error('Error deleting allergen item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete allergen item' });
  }
});

// POST /allergen-items/bulk - Bulk create allergen items (requires admin)
app.post('/allergen-items/bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    const categoryUpdates = {};
    const createdIds = [];

    const batchSize = 500;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = db.batch();
      const batchItems = items.slice(i, i + batchSize);

      for (const item of batchItems) {
        const itemRef = db.collection('allergenItems').doc();
        batch.set(itemRef, {
          name: item.name,
          categoryId: item.categoryId,
          categoryName: item.categoryName || '',
          allergens: item.allergens || {},
          isActive: item.isActive !== false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        createdIds.push(itemRef.id);
        categoryUpdates[item.categoryId] = (categoryUpdates[item.categoryId] || 0) + 1;
      }

      await batch.commit();
    }

    const countBatch = db.batch();
    for (const [categoryId, count] of Object.entries(categoryUpdates)) {
      countBatch.update(db.collection('allergenCategories').doc(categoryId), {
        itemCount: admin.firestore.FieldValue.increment(count),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await countBatch.commit();

    res.status(201).json({
      success: true,
      data: { ids: createdIds },
      message: `Created ${createdIds.length} allergen items`,
    });
  } catch (error) {
    console.error('Error bulk creating allergen items:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk create allergen items' });
  }
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

// Export the Express app as a Cloud Function (2nd gen)
exports.api = onRequest({ cors: true }, app);
