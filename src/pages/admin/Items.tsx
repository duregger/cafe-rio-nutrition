import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Space,
  message,
  Popconfirm,
  Typography,
  Card,
  Tabs,
  Tag,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { MenuItem, Category, MenuItemFormData, NutritionData } from '../../types';
import { nutritionFields, emptyNutrition } from '../../types';
import {
  getCategories,
  getItems,
  getItemsByCategory,
  createItem,
  updateItem,
  deleteItem,
} from '../../services/firestore';
import AdminLayout from './AdminLayout';

const { Title } = Typography;

export default function Items() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesData, itemsData] = await Promise.all([
        getCategories(),
        selectedCategory === 'all' 
          ? getItems() 
          : getItemsByCategory(selectedCategory),
      ]);
      setCategories(categoriesData);
      setItems(itemsData);
    } catch (error) {
      message.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      nutrition: emptyNutrition,
      categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    });
    setModalOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      categoryId: item.categoryId,
      servingSize: item.servingSize,
      isActive: item.isActive,
      nutrition: item.nutrition,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      message.success('Item deleted');
      fetchData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete item');
    }
  };

  const handleSubmit = async (values: MenuItemFormData & { nutrition: NutritionData }) => {
    try {
      const category = categories.find(c => c.id === values.categoryId);
      const data: MenuItemFormData = {
        ...values,
        categoryName: category?.name || '',
      };

      if (editingItem) {
        await updateItem(editingItem.id, data);
        message.success('Item updated');
      } else {
        await createItem(data);
        message.success('Item created');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('Failed to save item');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: MenuItem, b: MenuItem) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (name: string) => <Tag color="green">{name}</Tag>,
      filters: categories.map(c => ({ text: c.name, value: c.id })),
      onFilter: (value: unknown, record: MenuItem) => record.categoryId === value,
    },
    {
      title: 'Serving',
      dataIndex: 'servingSize',
      key: 'servingSize',
      width: 100,
    },
    {
      title: 'Calories',
      dataIndex: ['nutrition', 'calories'],
      key: 'calories',
      width: 90,
      sorter: (a: MenuItem, b: MenuItem) => a.nutrition.calories - b.nutrition.calories,
    },
    {
      title: 'Protein',
      dataIndex: ['nutrition', 'protein'],
      key: 'protein',
      width: 80,
      render: (val: number) => `${val}g`,
    },
    {
      title: 'Carbs',
      dataIndex: ['nutrition', 'totalCarbs'],
      key: 'totalCarbs',
      width: 80,
      render: (val: number) => `${val}g`,
    },
    {
      title: 'Fat',
      dataIndex: ['nutrition', 'totalFat'],
      key: 'totalFat',
      width: 80,
      render: (val: number) => `${val}g`,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (isActive: boolean) => (
        <span className={isActive ? 'text-green-600' : 'text-red-500'}>
          {isActive ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: MenuItem) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete item?"
            description="This cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const categoryTabs = [
    { key: 'all', label: `All Items (${items.length})` },
    ...categories.map(c => ({
      key: c.id,
      label: `${c.name} (${c.itemCount})`,
    })),
  ];

  // Group nutrition fields for the form
  const nutritionGroups = [
    {
      key: 'calories',
      label: 'Calories',
      fields: nutritionFields.filter(f => f.key.includes('calories')),
    },
    {
      key: 'fats',
      label: 'Fats',
      fields: nutritionFields.filter(f => 
        f.key.includes('Fat') || f.key === 'cholesterol'
      ),
    },
    {
      key: 'carbs',
      label: 'Carbohydrates',
      fields: nutritionFields.filter(f => 
        f.key.includes('Carbs') || f.key.includes('Fiber') || f.key.includes('Sugar')
      ),
    },
    {
      key: 'other',
      label: 'Other',
      fields: nutritionFields.filter(f => 
        f.key === 'sodium' || f.key === 'potassium' || f.key === 'protein'
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Title level={3} className="!mb-0">Menu Items</Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Item
            </Button>
          </Space>
        </div>

        <Card>
          <Tabs
            activeKey={selectedCategory}
            onChange={setSelectedCategory}
            items={categoryTabs}
            className="mb-4"
          />
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            size="middle"
            scroll={{ x: 900 }}
          />
        </Card>

        <Modal
          title={editingItem ? 'Edit Item' : 'Add Item'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={700}
          destroyOnHidden
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="mt-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="name"
                label="Item Name"
                rules={[{ required: true, message: 'Please enter a name' }]}
                className="col-span-2"
              >
                <Input placeholder="e.g., Fire-Grilled Chicken - 4 oz" />
              </Form.Item>

              <Form.Item
                name="categoryId"
                label="Category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select placeholder="Select category">
                  {categories.map(c => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="servingSize" label="Serving Size">
                <Input placeholder="e.g., 4 oz" />
              </Form.Item>

              <Form.Item 
                name="isActive" 
                label="Active" 
                valuePropName="checked"
                className="col-span-2"
              >
                <Switch />
              </Form.Item>
            </div>

            <Collapse 
              defaultActiveKey={['calories', 'fats', 'carbs', 'other']}
              className="mb-4"
              items={nutritionGroups.map(group => ({
                key: group.key,
                label: group.label,
                children: (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {group.fields.map(field => (
                      <Form.Item
                        key={field.key}
                        name={['nutrition', field.key]}
                        label={`${field.label} (${field.unit})`}
                        className="mb-2"
                      >
                        <InputNumber
                          min={0}
                          step={field.unit === 'g' ? 0.1 : 1}
                          className="w-full"
                          placeholder="0"
                        />
                      </Form.Item>
                    ))}
                  </div>
                ),
              }))}
            />

            <Form.Item className="mb-0 flex justify-end">
              <Space>
                <Button onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
