import { useState, useMemo, useEffect } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Button, Tabs, Empty, Statistic, Spin, message } from 'antd';
import { PlusOutlined, MinusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { MenuItem, NutritionData, Category } from '../types';
import { emptyNutrition } from '../types';
import { getCategories, getItems, getItemsByCategory } from '../services/firestore';

const { Title } = Typography;

export default function Calculator() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [categoriesData, itemsData] = await Promise.all([
          getCategories(),
          activeCategory === 'all' ? getItems() : getItemsByCategory(activeCategory),
        ]);
        setCategories(categoriesData);
        setItems(itemsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load menu data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeCategory]);

  const totals = useMemo<NutritionData>(() => {
    return selectedItems.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.nutrition.calories || 0),
        caloriesFromFat: acc.caloriesFromFat + (item.nutrition.caloriesFromFat || 0),
        totalFat: acc.totalFat + (item.nutrition.totalFat || 0),
        saturatedFat: acc.saturatedFat + (item.nutrition.saturatedFat || 0),
        transFat: acc.transFat + (item.nutrition.transFat || 0),
        polyunsaturatedFat: acc.polyunsaturatedFat + (item.nutrition.polyunsaturatedFat || 0),
        monounsaturatedFat: acc.monounsaturatedFat + (item.nutrition.monounsaturatedFat || 0),
        cholesterol: acc.cholesterol + (item.nutrition.cholesterol || 0),
        sodium: acc.sodium + (item.nutrition.sodium || 0),
        potassium: acc.potassium + (item.nutrition.potassium || 0),
        totalCarbs: acc.totalCarbs + (item.nutrition.totalCarbs || 0),
        dietaryFiber: acc.dietaryFiber + (item.nutrition.dietaryFiber || 0),
        totalSugars: acc.totalSugars + (item.nutrition.totalSugars || 0),
        addedSugars: acc.addedSugars + (item.nutrition.addedSugars || 0),
        protein: acc.protein + (item.nutrition.protein || 0),
      }),
      { ...emptyNutrition }
    );
  }, [selectedItems]);

  const addItem = (item: MenuItem) => {
    setSelectedItems([...selectedItems, item]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedItems([]);
  };

  type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

  // Desktop columns
  const columns = [
    {
      title: 'Item',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      responsive: ['lg'] as Breakpoint[],
      render: (category: string) => (
        <Tag color="green">{category}</Tag>
      ),
    },
    {
      title: 'Calories',
      dataIndex: ['nutrition', 'calories'],
      key: 'calories',
      width: 80,
      sorter: (a: MenuItem, b: MenuItem) => (a.nutrition.calories || 0) - (b.nutrition.calories || 0),
    },
    {
      title: 'Protein',
      dataIndex: ['nutrition', 'protein'],
      key: 'protein',
      width: 70,
      responsive: ['md'] as Breakpoint[],
      sorter: (a: MenuItem, b: MenuItem) => (a.nutrition.protein || 0) - (b.nutrition.protein || 0),
      render: (v: number) => `${v || 0}g`,
    },
    {
      title: 'Carbs',
      dataIndex: ['nutrition', 'totalCarbs'],
      key: 'totalCarbs',
      width: 70,
      responsive: ['md'] as Breakpoint[],
      render: (v: number) => `${v || 0}g`,
    },
    {
      title: 'Fat',
      dataIndex: ['nutrition', 'totalFat'],
      key: 'totalFat',
      width: 60,
      responsive: ['lg'] as Breakpoint[],
      render: (v: number) => `${v || 0}g`,
    },
    {
      title: '',
      key: 'action',
      width: 70,
      render: (_: unknown, record: MenuItem) => (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => addItem(record)}
        />
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: 'All Items' },
    ...categories.map(cat => ({
      key: cat.id,
      label: `${cat.name} (${cat.itemCount})`,
    })),
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <Title level={2} className="!text-xl md:!text-2xl lg:!text-3xl !mb-2">Nutrition Calculator</Title>

      {/* Mobile: Your Meal Summary (sticky on top) */}
      <div className="lg:hidden">
        <Card 
          size="small"
          title={
            <div className="flex items-center justify-between">
              <span>Your Meal ({selectedItems.length} items)</span>
              {selectedItems.length > 0 && (
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={clearAll}
                  size="small"
                >
                  Clear
                </Button>
              )}
            </div>
          }
          style={{ backgroundColor: '#F9E4CA' }}
        >
          <div className="flex flex-wrap gap-4 justify-center">
            <Statistic 
              title="Calories" 
              value={totals.calories} 
              className="[&_.ant-statistic-content-value]:text-[#F93A26] [&_.ant-statistic-content-value]:!text-lg"
            />
            <Statistic 
              title="Protein" 
              value={totals.protein} 
              suffix="g"
              className="[&_.ant-statistic-content-value]:!text-lg"
            />
            <Statistic 
              title="Carbs" 
              value={totals.totalCarbs} 
              suffix="g"
              className="[&_.ant-statistic-content-value]:!text-lg"
            />
            <Statistic 
              title="Fat" 
              value={totals.totalFat} 
              suffix="g"
              className="[&_.ant-statistic-content-value]:!text-lg"
            />
          </div>
          {selectedItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {selectedItems.map((item, index) => (
                <Tag 
                  key={`${item.id}-${index}`}
                  closable
                  onClose={() => removeItem(index)}
                  className="!m-0"
                >
                  {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
                </Tag>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Row gutter={[16, 16]}>
        {/* Menu Items Section */}
        <Col xs={24} lg={16} style={{ minWidth: 0 }}>
          <Card 
            title="Menu Items" 
            className="h-full"
            size="small"
            styles={{ body: { padding: '8px' } }}
          >
            <Tabs
              activeKey={activeCategory}
              onChange={setActiveCategory}
              items={tabItems}
              className="mb-2 md:mb-4"
              size="small"
              tabBarStyle={{ marginBottom: 8 }}
            />
            <Spin spinning={loading}>
              <Table
                dataSource={items}
                columns={columns}
                rowKey="id"
                pagination={{ 
                  pageSize: 100, 
                  showSizeChanger: true, 
                  pageSizeOptions: ['50', '100', '200', '344'],
                  size: 'small',
                  simple: true,
                }}
                size="small"
                scroll={{ x: 400 }}
              />
            </Spin>
          </Card>
        </Col>

        {/* Desktop: Selected Items & Totals Section */}
        <Col xs={24} lg={8} className="hidden lg:block">
          <Card 
            title="Your Meal" 
            extra={
              selectedItems.length > 0 && (
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={clearAll}
                  size="small"
                >
                  Clear All
                </Button>
              )
            }
            className="mb-4"
          >
            {selectedItems.length === 0 ? (
              <Empty description="Add items to build your meal" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedItems.map((item, index) => (
                  <div 
                    key={`${item.id}-${index}`}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm truncate flex-1">{item.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {item.nutrition.calories || 0} cal
                      </span>
                      <Button
                        type="text"
                        danger
                        icon={<MinusOutlined />}
                        size="small"
                        onClick={() => removeItem(index)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Nutrition Totals */}
          <Card title="Nutrition Totals" style={{ backgroundColor: '#F9E4CA' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic 
                  title="Calories" 
                  value={totals.calories} 
                  className="[&_.ant-statistic-content-value]:text-[#F93A26]"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Protein" 
                  value={totals.protein} 
                  suffix="g"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Carbs" 
                  value={totals.totalCarbs} 
                  suffix="g"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Fat" 
                  value={totals.totalFat} 
                  suffix="g"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Fiber" 
                  value={totals.dietaryFiber} 
                  suffix="g"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Sodium" 
                  value={totals.sodium} 
                  suffix="mg"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
