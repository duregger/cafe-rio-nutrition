import { useState, useEffect, useMemo } from 'react';
import { 
  Typography, 
  Table, 
  Checkbox, 
  Card, 
  Spin, 
  Input, 
  Tag,
  Alert,
  Select,
  Collapse,
} from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import type { AllergenItem, AllergenCategory, AllergenFlags } from '../types';
import { allergenTypes, emptyAllergenFlags } from '../types';
import { getCategories, getItems } from '../services/firestore';

const { Title, Text } = Typography;

export default function AllergensPublic() {
  const [items, setItems] = useState<AllergenItem[]>([]);
  const [categories, setCategories] = useState<AllergenCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [excludeAllergens, setExcludeAllergens] = useState<(keyof AllergenFlags)[]>([]);
  const [showOnlyVegan, setShowOnlyVegan] = useState(false);
  const [showOnlyVegetarian, setShowOnlyVegetarian] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [categoriesData, itemsData] = await Promise.all([
          getCategories(),
          getItems(),
        ]);
        setCategories(categoriesData.filter(c => c.isActive) as AllergenCategory[]);
        setItems(itemsData.filter(i => i.isActive).map(i => ({ ...i, allergens: i.allergens ?? emptyAllergenFlags })) as AllergenItem[]);
      } catch (error) {
        console.error('Error loading allergen data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter items based on search, category, and allergen filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }
      
      // Exclude items with selected allergens
      for (const allergen of excludeAllergens) {
        if (item.allergens[allergen]) {
          return false;
        }
      }
      
      // Vegan filter
      if (showOnlyVegan && !item.allergens.vegan) {
        return false;
      }
      
      // Vegetarian filter
      if (showOnlyVegetarian && !item.allergens.vegetarian) {
        return false;
      }
      
      return true;
    });
  }, [items, searchText, selectedCategory, excludeAllergens, showOnlyVegan, showOnlyVegetarian]);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<string, AllergenItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.categoryName]) {
        groups[item.categoryName] = [];
      }
      groups[item.categoryName].push(item);
    }
    return groups;
  }, [filteredItems]);

  const renderAllergenCell = (hasAllergen: boolean) => {
    return hasAllergen ? (
      <span className="text-red-600 font-bold text-lg">✓</span>
    ) : (
      <span className="text-gray-300">-</span>
    );
  };

  // Desktop columns
  const columns = [
    {
      title: 'Menu Item',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 250,
    },
    ...allergenTypes.filter(a => !a.isLifestyle).map(allergen => ({
      title: (
        <div className="text-center">
          <div className="text-lg">{allergen.icon}</div>
          <div className="text-xs font-normal">{allergen.label}</div>
        </div>
      ),
      dataIndex: ['allergens', allergen.key],
      key: allergen.key,
      width: 80,
      align: 'center' as const,
      render: (value: boolean) => renderAllergenCell(value),
    })),
    {
      title: (
        <div className="text-center">
          <div className="text-lg">🌱</div>
          <div className="text-xs font-normal">Vegan</div>
        </div>
      ),
      dataIndex: ['allergens', 'vegan'],
      key: 'vegan',
      width: 80,
      align: 'center' as const,
      render: (value: boolean) => value ? (
        <span className="text-green-600 font-bold text-lg">✓</span>
      ) : (
        <span className="text-gray-300">-</span>
      ),
    },
    {
      title: (
        <div className="text-center">
          <div className="text-lg">🥬</div>
          <div className="text-xs font-normal">Vegetarian</div>
        </div>
      ),
      dataIndex: ['allergens', 'vegetarian'],
      key: 'vegetarian',
      width: 80,
      align: 'center' as const,
      render: (value: boolean) => value ? (
        <span className="text-green-600 font-bold text-lg">✓</span>
      ) : (
        <span className="text-gray-300">-</span>
      ),
    },
  ];

  // Mobile card view
  const renderMobileItem = (item: AllergenItem) => {
    const allergensList = allergenTypes
      .filter(a => !a.isLifestyle && item.allergens[a.key])
      .map(a => `${a.icon} ${a.label}`);

    return (
      <Card 
        key={item.id} 
        size="small" 
        className="mb-2"
        styles={{ body: { padding: '12px' } }}
      >
        <div className="font-medium text-sm mb-2">{item.name}</div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {item.allergens.vegan && (
            <Tag color="green" className="!m-0">🌱 Vegan</Tag>
          )}
          {item.allergens.vegetarian && (
            <Tag color="green" className="!m-0">🥬 Vegetarian</Tag>
          )}
        </div>
        
        {/* Allergens */}
        {allergensList.length > 0 ? (
          <div className="text-xs text-gray-600">
            <span className="text-red-600 font-medium">Contains: </span>
            {allergensList.join(', ')}
          </div>
        ) : (
          <div className="text-xs text-green-600">No common allergens</div>
        )}
      </Card>
    );
  };

  const allergenFilters = allergenTypes.filter(a => !a.isLifestyle);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4 md:mb-8">
        <Title level={2} className="!mb-2 !text-xl md:!text-2xl lg:!text-3xl">
          Allergen & Dietary Information
        </Title>
        <Text className="text-gray-500 text-sm md:text-base">
          Find menu items that fit your dietary needs
        </Text>
      </div>

      {/* Filters - Desktop */}
      <Card className="mb-4 md:mb-6 hidden md:block">
        <div className="space-y-4">
          {/* Search and Category */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search menu items..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="md:w-64"
              allowClear
            />
            <Select
              placeholder="All Categories"
              value={selectedCategory}
              onChange={setSelectedCategory}
              className="md:w-48"
            >
              <Select.Option value="all">All Categories</Select.Option>
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </div>

          {/* Allergen Exclusion Filters */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FilterOutlined className="text-gray-400" />
              <Text strong>Exclude items containing:</Text>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergenFilters.map(allergen => (
                <Tag
                  key={allergen.key}
                  className={`cursor-pointer px-3 py-1 ${
                    excludeAllergens.includes(allergen.key)
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => {
                    if (excludeAllergens.includes(allergen.key)) {
                      setExcludeAllergens(excludeAllergens.filter(a => a !== allergen.key));
                    } else {
                      setExcludeAllergens([...excludeAllergens, allergen.key]);
                    }
                  }}
                >
                  <span className="mr-1">{allergen.icon}</span>
                  {allergen.label}
                </Tag>
              ))}
            </div>
          </div>

          {/* Lifestyle Filters */}
          <div className="flex flex-wrap gap-4">
            <Checkbox
              checked={showOnlyVegan}
              onChange={e => setShowOnlyVegan(e.target.checked)}
            >
              <span className="mr-1">🌱</span> Show only Vegan
            </Checkbox>
            <Checkbox
              checked={showOnlyVegetarian}
              onChange={e => setShowOnlyVegetarian(e.target.checked)}
            >
              <span className="mr-1">🥬</span> Show only Vegetarian
            </Checkbox>
          </div>
        </div>
      </Card>

      {/* Filters - Mobile */}
      <div className="md:hidden mb-4 space-y-3">
        <Input
          placeholder="Search menu items..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
        />
        <Select
          placeholder="All Categories"
          value={selectedCategory}
          onChange={setSelectedCategory}
          className="w-full"
        >
          <Select.Option value="all">All Categories</Select.Option>
          {categories.map(c => (
            <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
          ))}
        </Select>
        
        <Collapse 
          size="small"
          items={[{
            key: '1',
            label: <span className="text-xs">Filter by allergens & dietary preferences</span>,
            children: (
              <div className="space-y-3">
                <div>
                  <Text className="text-xs text-gray-500 mb-2 block">Exclude allergens:</Text>
                  <div className="flex flex-wrap gap-1">
                    {allergenFilters.map(allergen => (
                      <Tag
                        key={allergen.key}
                        className={`cursor-pointer text-xs ${
                          excludeAllergens.includes(allergen.key)
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => {
                          if (excludeAllergens.includes(allergen.key)) {
                            setExcludeAllergens(excludeAllergens.filter(a => a !== allergen.key));
                          } else {
                            setExcludeAllergens([...excludeAllergens, allergen.key]);
                          }
                        }}
                      >
                        {allergen.icon} {allergen.label}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Checkbox
                    checked={showOnlyVegan}
                    onChange={e => setShowOnlyVegan(e.target.checked)}
                  >
                    <span className="text-sm">🌱 Only Vegan</span>
                  </Checkbox>
                  <Checkbox
                    checked={showOnlyVegetarian}
                    onChange={e => setShowOnlyVegetarian(e.target.checked)}
                  >
                    <span className="text-sm">🥬 Only Vegetarian</span>
                  </Checkbox>
                </div>
              </div>
            ),
          }]}
        />
      </div>

      {/* Results Summary */}
      <div className="mb-3 md:mb-4">
        <Text className="text-gray-500 text-sm">
          Showing {filteredItems.length} of {items.length} items
        </Text>
      </div>

      {/* Desktop: Data Table */}
      <div className="hidden lg:block">
        {selectedCategory === 'all' ? (
          // Grouped by category
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
              <Card key={categoryName} title={categoryName} size="small">
                <Table
                  dataSource={categoryItems}
                  columns={columns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 1200 }}
                />
              </Card>
            ))}
          </div>
        ) : (
          // Single table for selected category
          <Card>
            <Table
              dataSource={filteredItems}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 50 }}
              size="small"
              scroll={{ x: 1200 }}
            />
          </Card>
        )}
      </div>

      {/* Tablet: Simplified Table */}
      <div className="hidden md:block lg:hidden">
        {selectedCategory === 'all' ? (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
              <Card key={categoryName} title={categoryName} size="small">
                <Table
                  dataSource={categoryItems}
                  columns={[
                    {
                      title: 'Item',
                      dataIndex: 'name',
                      key: 'name',
                    },
                    {
                      title: '🥛',
                      dataIndex: ['allergens', 'milk'],
                      key: 'milk',
                      width: 40,
                      align: 'center' as const,
                      render: renderAllergenCell,
                    },
                    {
                      title: '🌾',
                      dataIndex: ['allergens', 'wheat'],
                      key: 'wheat',
                      width: 40,
                      align: 'center' as const,
                      render: renderAllergenCell,
                    },
                    {
                      title: '🥜',
                      dataIndex: ['allergens', 'peanuts'],
                      key: 'peanuts',
                      width: 40,
                      align: 'center' as const,
                      render: renderAllergenCell,
                    },
                    {
                      title: '🫘',
                      dataIndex: ['allergens', 'soy'],
                      key: 'soy',
                      width: 40,
                      align: 'center' as const,
                      render: renderAllergenCell,
                    },
                    {
                      title: '🌱',
                      dataIndex: ['allergens', 'vegan'],
                      key: 'vegan',
                      width: 40,
                      align: 'center' as const,
                      render: (v: boolean) => v ? <span className="text-green-600 font-bold">✓</span> : null,
                    },
                    {
                      title: '🥬',
                      dataIndex: ['allergens', 'vegetarian'],
                      key: 'vegetarian',
                      width: 40,
                      align: 'center' as const,
                      render: (v: boolean) => v ? <span className="text-green-600 font-bold">✓</span> : null,
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 500 }}
                />
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table
              dataSource={filteredItems}
              columns={[
                {
                  title: 'Item',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: '🥛',
                  dataIndex: ['allergens', 'milk'],
                  key: 'milk',
                  width: 40,
                  align: 'center' as const,
                  render: renderAllergenCell,
                },
                {
                  title: '🌾',
                  dataIndex: ['allergens', 'wheat'],
                  key: 'wheat',
                  width: 40,
                  align: 'center' as const,
                  render: renderAllergenCell,
                },
                {
                  title: '🥜',
                  dataIndex: ['allergens', 'peanuts'],
                  key: 'peanuts',
                  width: 40,
                  align: 'center' as const,
                  render: renderAllergenCell,
                },
                {
                  title: '🫘',
                  dataIndex: ['allergens', 'soy'],
                  key: 'soy',
                  width: 40,
                  align: 'center' as const,
                  render: renderAllergenCell,
                },
                {
                  title: '🌱',
                  dataIndex: ['allergens', 'vegan'],
                  key: 'vegan',
                  width: 40,
                  align: 'center' as const,
                  render: (v: boolean) => v ? <span className="text-green-600 font-bold">✓</span> : null,
                },
                {
                  title: '🥬',
                  dataIndex: ['allergens', 'vegetarian'],
                  key: 'vegetarian',
                  width: 40,
                  align: 'center' as const,
                  render: (v: boolean) => v ? <span className="text-green-600 font-bold">✓</span> : null,
                },
              ]}
              rowKey="id"
              pagination={{ pageSize: 50 }}
              size="small"
              scroll={{ x: 500 }}
            />
          </Card>
        )}
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden">
        {selectedCategory === 'all' ? (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
              <div key={categoryName}>
                <div className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm mb-2">
                  {categoryName} ({categoryItems.length})
                </div>
                {categoryItems.map(item => renderMobileItem(item))}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filteredItems.map(item => renderMobileItem(item))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <Alert
        title="Important Notice"
        description="This information is provided as a guide. Menu items may vary by location. Please inform your server of any allergies before ordering. Cross-contamination may occur during food preparation."
        type="warning"
        className="mt-4 md:mt-6"
        showIcon
      />

      {/* Footer */}
      <div className="text-center mt-6 md:mt-8 text-gray-400 text-xs md:text-sm">
        Last updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
