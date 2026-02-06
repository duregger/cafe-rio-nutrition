import { useState, useEffect, useMemo } from 'react';
import { Typography, Table, Spin, Input, Card, Collapse } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { MenuItem } from '../types';
import { getItems } from '../services/firestore';

const { Title } = Typography;

// Customer-facing categories (curated subset)
const customerCategories = [
  'Tortillas',
  'Beans & Rice', 
  'Meats',
  'Sauces & Dressings',
  'Toppings & Specials',
  'Desserts & Drinks',
  'Other',
];

// Map our database categories to customer categories
const categoryMapping: Record<string, string> = {
  'Tortilla': 'Tortillas',
  'Tortillas': 'Tortillas',
  'Rice': 'Beans & Rice',
  'Beans': 'Beans & Rice',
  'Beans & Rice': 'Beans & Rice',
  'Protein': 'Meats',
  'Extra Protein': 'Meats',
  'Enchilada Style': 'Meats',
  'Kids Meals': 'Meats',
  'Bowl Builds': 'Meats',
  'Bowls - Build Your Own': 'Meats',
  'Sauce': 'Sauces & Dressings',
  'Dressing': 'Sauces & Dressings',
  'Sauces & Dressings': 'Sauces & Dressings',
  'Toppings': 'Toppings & Specials',
  'Cheese': 'Toppings & Specials',
  'Lettuce': 'Toppings & Specials',
  'Sides': 'Toppings & Specials',
  'Add-Ins': 'Toppings & Specials',
  'Custom - ADD': 'Toppings & Specials',
  'Custom - EXTRA': 'Toppings & Specials',
  'Custom - on the SIDE': 'Toppings & Specials',
  'Toppings & Specials': 'Toppings & Specials',
  'Dessert': 'Desserts & Drinks',
  'Beverages - 20 oz': 'Desserts & Drinks',
  'Beverages - 32 oz': 'Desserts & Drinks',
  'Desserts & Drinks': 'Desserts & Drinks',
  'Appetizers': 'Toppings & Specials',
};

export default function NutritionInfo() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const itemsData = await getItems();
        setItems(itemsData.filter(item => item.isActive));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter and group items
  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    
    // Initialize groups
    customerCategories.forEach(cat => {
      groups[cat] = [];
    });

    // Filter and categorize items
    items.forEach(item => {
      // Apply search filter
      if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) {
        return;
      }

      // Map to customer category (fallback to Other for unmapped)
      const customerCategory = categoryMapping[item.categoryName] || 'Other';
      if (groups[customerCategory]) {
        groups[customerCategory].push(item);
      }
    });

    return groups;
  }, [items, searchText]);

  // Allergen cell renderer
  const renderAllergenCell = (value: boolean | undefined) => {
    return value ? (
      <span className="text-red-600 font-bold">✓</span>
    ) : null;
  };

  // GF cell renderer
  const renderGFCell = (_: unknown, record: MenuItem) => {
    const isGlutenFree = record.allergens && !record.allergens.gluten && !record.allergens.wheat;
    return isGlutenFree ? (
      <span className="text-green-700 font-bold text-xs">GF</span>
    ) : null;
  };

  // Vegetarian cell renderer
  const renderVegCell = (_: unknown, record: MenuItem) => {
    return record.allergens?.vegetarian ? (
      <span className="text-green-700 font-bold text-xs">V</span>
    ) : null;
  };

  // Desktop columns - full view
  const desktopColumns = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 180,
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    // Nutrition columns
    {
      title: <div className="text-center text-xs font-semibold">Calories</div>,
      dataIndex: ['nutrition', 'calories'],
      key: 'calories',
      width: 60,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Fat (g)</div>,
      dataIndex: ['nutrition', 'totalFat'],
      key: 'totalFat',
      width: 50,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Sat Fat (g)</div>,
      dataIndex: ['nutrition', 'saturatedFat'],
      key: 'saturatedFat',
      width: 65,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Cholesterol (mg)</div>,
      dataIndex: ['nutrition', 'cholesterol'],
      key: 'cholesterol',
      width: 80,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Sodium (mg)</div>,
      dataIndex: ['nutrition', 'sodium'],
      key: 'sodium',
      width: 70,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Carbs (g)</div>,
      dataIndex: ['nutrition', 'totalCarbs'],
      key: 'totalCarbs',
      width: 60,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Fiber (g)</div>,
      dataIndex: ['nutrition', 'dietaryFiber'],
      key: 'dietaryFiber',
      width: 55,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Sugar (g)</div>,
      dataIndex: ['nutrition', 'totalSugars'],
      key: 'totalSugars',
      width: 55,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    {
      title: <div className="text-center text-xs font-semibold">Protein (g)</div>,
      dataIndex: ['nutrition', 'protein'],
      key: 'protein',
      width: 60,
      align: 'center' as const,
      render: (v: number) => <span className="text-xs">{v || 0}</span>,
    },
    // Allergen columns with emojis and full words
    {
      title: (
        <div className="text-center">
          <div>🥚</div>
          <div className="text-xs font-semibold">Egg</div>
        </div>
      ),
      dataIndex: ['allergens', 'egg'],
      key: 'egg',
      width: 55,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>⚪</div>
          <div className="text-xs font-semibold">Sesame</div>
        </div>
      ),
      dataIndex: ['allergens', 'sesame'],
      key: 'sesame',
      width: 60,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🥛</div>
          <div className="text-xs font-semibold">Milk</div>
        </div>
      ),
      dataIndex: ['allergens', 'milk'],
      key: 'milk',
      width: 50,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🥜</div>
          <div className="text-xs font-semibold">Peanuts</div>
        </div>
      ),
      dataIndex: ['allergens', 'peanuts'],
      key: 'peanuts',
      width: 65,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🐟</div>
          <div className="text-xs font-semibold">Fish</div>
        </div>
      ),
      dataIndex: ['allergens', 'fish'],
      key: 'fish',
      width: 50,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🦐</div>
          <div className="text-xs font-semibold">Shellfish</div>
        </div>
      ),
      dataIndex: ['allergens', 'shellfish'],
      key: 'shellfish',
      width: 65,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🫘</div>
          <div className="text-xs font-semibold">Soy</div>
        </div>
      ),
      dataIndex: ['allergens', 'soy'],
      key: 'soy',
      width: 50,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🌰</div>
          <div className="text-xs font-semibold">Tree Nuts</div>
        </div>
      ),
      dataIndex: ['allergens', 'treeNuts'],
      key: 'treeNuts',
      width: 70,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🌾</div>
          <div className="text-xs font-semibold">Wheat</div>
        </div>
      ),
      dataIndex: ['allergens', 'wheat'],
      key: 'wheat',
      width: 55,
      align: 'center' as const,
      render: renderAllergenCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🍞</div>
          <div className="text-xs font-semibold text-green-700">Gluten Free</div>
        </div>
      ),
      key: 'gf',
      width: 70,
      align: 'center' as const,
      render: renderGFCell,
    },
    {
      title: (
        <div className="text-center">
          <div>🥬</div>
          <div className="text-xs font-semibold text-green-700">Vegetarian</div>
        </div>
      ),
      key: 'veg',
      width: 75,
      align: 'center' as const,
      render: renderVegCell,
    },
  ];

  // Mobile card view for each item
  const renderMobileItem = (item: MenuItem) => {
    const allergensList = [];
    if (item.allergens?.egg) allergensList.push('🥚 Egg');
    if (item.allergens?.sesame) allergensList.push('⚪ Sesame');
    if (item.allergens?.milk) allergensList.push('🥛 Milk');
    if (item.allergens?.peanuts) allergensList.push('🥜 Peanuts');
    if (item.allergens?.fish) allergensList.push('🐟 Fish');
    if (item.allergens?.shellfish) allergensList.push('🦐 Shellfish');
    if (item.allergens?.soy) allergensList.push('🫘 Soy');
    if (item.allergens?.treeNuts) allergensList.push('🌰 Tree Nuts');
    if (item.allergens?.wheat) allergensList.push('🌾 Wheat');

    const isGlutenFree = item.allergens && !item.allergens.gluten && !item.allergens.wheat;
    const isVegetarian = item.allergens?.vegetarian;

    return (
      <Card 
        key={item.id} 
        size="small" 
        className="mb-2"
        styles={{ body: { padding: '12px' } }}
      >
        <div className="font-medium text-sm mb-2">{item.name}</div>
        
        {/* Nutrition Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="text-[#F93A26] font-bold">{item.nutrition.calories || 0}</div>
            <div className="text-gray-500">cal</div>
          </div>
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-semibold">{item.nutrition.protein || 0}g</div>
            <div className="text-gray-500">protein</div>
          </div>
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-semibold">{item.nutrition.totalCarbs || 0}g</div>
            <div className="text-gray-500">carbs</div>
          </div>
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-semibold">{item.nutrition.totalFat || 0}g</div>
            <div className="text-gray-500">fat</div>
          </div>
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-semibold">{item.nutrition.sodium || 0}mg</div>
            <div className="text-gray-500">sodium</div>
          </div>
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-semibold">{item.nutrition.dietaryFiber || 0}g</div>
            <div className="text-gray-500">fiber</div>
          </div>
        </div>

        {/* Allergens & Tags */}
        <div className="flex flex-wrap gap-1 items-center">
          {isGlutenFree && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
              🍞 GF
            </span>
          )}
          {isVegetarian && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
              🥬 V
            </span>
          )}
          {allergensList.length > 0 && (
            <span className="text-xs text-gray-500">
              Contains: {allergensList.join(', ')}
            </span>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-white">
      {/* Header */}
      <div className="text-center mb-4 md:mb-6">
        <Title level={2} className="!mb-2 !text-green-700 !text-xl md:!text-2xl lg:!text-3xl">
          Nutritional & Allergen Info
        </Title>
      </div>

      {/* Disclaimer - Collapsible on mobile */}
      <div className="hidden md:block text-xs text-gray-600 mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="mb-2">
          The following information has been put together utilizing our food manufacturers information, 
          the United States Department of Agriculture and Genesis SQL Nutritional Analysis Program from 
          ESHA Research in Salem, Oregon. Please be aware, our menu items are prepared from scratch and 
          may come in contact with other food products during normal kitchen procedures. This may include 
          shared cooking/preparation surfaces and common fryers.
        </p>
        <div className="flex flex-wrap gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-bold">✓</span>
            <span>= Contains Allergen</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-700 font-bold">GF</span>
            <span>= Gluten Friendly*</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-700 font-bold">V</span>
            <span>= Vegetarian**</span>
          </div>
        </div>
        <p className="mt-3 text-xs">
          *These ingredients do not contain gluten. They are not certified gluten free and may be manufactured in a plant with gluten ingredients.
        </p>
        <p className="text-xs">
          **Ingredients that do not contain beef, pork, poultry, fish or shellfish but may contain eggs, dairy or honey.
        </p>
      </div>

      {/* Mobile Disclaimer */}
      <div className="md:hidden mb-4">
        <Collapse 
          size="small"
          items={[{
            key: '1',
            label: <span className="text-xs">View Disclaimer & Legend</span>,
            children: (
              <div className="text-xs text-gray-600">
                <p className="mb-2">
                  The following information has been put together utilizing our food manufacturers information, 
                  the United States Department of Agriculture and Genesis SQL Nutritional Analysis Program.
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-red-600 font-bold">✓</span>
                    <span>= Contains Allergen</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-700 font-bold">GF</span>
                    <span>= Gluten Friendly</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-700 font-bold">V</span>
                    <span>= Vegetarian</span>
                  </div>
                </div>
              </div>
            ),
          }]}
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search menu items..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="max-w-full md:max-w-md"
          allowClear
          size="middle"
        />
      </div>

      {/* Desktop: Data Tables by Category */}
      <div className="hidden lg:block space-y-6">
        {customerCategories.map(categoryName => {
          const categoryItems = groupedItems[categoryName] || [];
          if (categoryItems.length === 0) return null;

          return (
            <div key={categoryName}>
              {/* Category Header */}
              <div className="bg-green-600 text-white px-4 py-2 rounded-t-lg font-bold">
                {categoryName}
              </div>
              {/* Category Table */}
              <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-x-auto">
                <Table
                  dataSource={categoryItems}
                  columns={desktopColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 1500 }}
                  className="nutrition-table"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet: Simplified Table */}
      <div className="hidden md:block lg:hidden space-y-4">
        {customerCategories.map(categoryName => {
          const categoryItems = groupedItems[categoryName] || [];
          if (categoryItems.length === 0) return null;

          return (
            <div key={categoryName}>
              <div className="bg-green-600 text-white px-3 py-2 rounded-t-lg font-bold text-sm">
                {categoryName}
              </div>
              <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-x-auto">
                <Table
                  dataSource={categoryItems}
                  columns={[
                    {
                      title: 'Item',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string) => <span className="text-sm font-medium">{name}</span>,
                    },
                    {
                      title: 'Cal',
                      dataIndex: ['nutrition', 'calories'],
                      key: 'calories',
                      width: 50,
                      align: 'center' as const,
                      render: (v: number) => <span className="text-xs">{v || 0}</span>,
                    },
                    {
                      title: 'Prot',
                      dataIndex: ['nutrition', 'protein'],
                      key: 'protein',
                      width: 50,
                      align: 'center' as const,
                      render: (v: number) => <span className="text-xs">{v || 0}g</span>,
                    },
                    {
                      title: 'Carbs',
                      dataIndex: ['nutrition', 'totalCarbs'],
                      key: 'totalCarbs',
                      width: 50,
                      align: 'center' as const,
                      render: (v: number) => <span className="text-xs">{v || 0}g</span>,
                    },
                    {
                      title: 'Fat',
                      dataIndex: ['nutrition', 'totalFat'],
                      key: 'totalFat',
                      width: 50,
                      align: 'center' as const,
                      render: (v: number) => <span className="text-xs">{v || 0}g</span>,
                    },
                    {
                      title: '🥛',
                      dataIndex: ['allergens', 'milk'],
                      key: 'milk',
                      width: 35,
                      align: 'center' as const,
                      render: renderAllergenCell,
                    },
                    {
                      title: '🌾',
                      dataIndex: ['allergens', 'wheat'],
                      key: 'wheat',
                      width: 35,
                      align: 'center' as const,
                      render: renderAllergenCell,
                    },
                    {
                      title: 'GF',
                      key: 'gf',
                      width: 35,
                      align: 'center' as const,
                      render: renderGFCell,
                    },
                    {
                      title: 'V',
                      key: 'veg',
                      width: 35,
                      align: 'center' as const,
                      render: renderVegCell,
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 500 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden space-y-4">
        {customerCategories.map(categoryName => {
          const categoryItems = groupedItems[categoryName] || [];
          if (categoryItems.length === 0) return null;

          return (
            <div key={categoryName}>
              <div className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm mb-2">
                {categoryName} ({categoryItems.length})
              </div>
              {categoryItems.map(item => renderMobileItem(item))}
            </div>
          );
        })}
      </div>

      {/* Allergy Warning */}
      <div className="mt-6 p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-gray-700">
        <p className="font-bold mb-2">Allergy Warning:</p>
        <p>
          Individual foods may come in contact with one another during preparation. Although efforts 
          are made to avoid cross-contact of allergens, Cafe Rio does not guarantee that cross-contact 
          with allergens will not occur. Before placing your order, please inform Cafe Rio employees 
          if you or anyone in your party has a food allergy.
        </p>
        <p className="mt-2 hidden md:block">
          We cook our tortilla chips, tortilla strips and coconut shrimp in a common fryer oil. This means 
          we cannot guarantee that your menu item is free of common allergens when these ingredients are present.
        </p>
        <p className="mt-2 italic text-xs">
          * Animal-based enzyme may be used in the production of these cheeses.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 md:mt-8 text-gray-400 text-xs md:text-sm">
        Last updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
