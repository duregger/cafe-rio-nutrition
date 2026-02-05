import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Space,
  message,
  Popconfirm,
  Typography,
  Card,
  Tabs,
  Tag,
  Checkbox,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { AllergenItem, AllergenCategory, AllergenItemFormData } from '../../types';
import { allergenTypes, emptyAllergenFlags } from '../../types';
import {
  getAllergenCategories,
  getAllergenItems,
  getAllergenItemsByCategory,
  createAllergenItem,
  updateAllergenItem,
  deleteAllergenItem,
} from '../../services/allergens';
import AdminLayout from './AdminLayout';

const { Title } = Typography;

export default function Allergens() {
  const [items, setItems] = useState<AllergenItem[]>([]);
  const [categories, setCategories] = useState<AllergenCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AllergenItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesData, itemsData] = await Promise.all([
        getAllergenCategories(),
        selectedCategory === 'all'
          ? getAllergenItems()
          : getAllergenItemsByCategory(selectedCategory),
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
      allergens: emptyAllergenFlags,
      categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    });
    setModalOpen(true);
  };

  const handleEdit = (item: AllergenItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      categoryId: item.categoryId,
      isActive: item.isActive,
      allergens: item.allergens,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAllergenItem(id);
      message.success('Item deleted');
      fetchData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete item');
    }
  };

  const handleSubmit = async (values: AllergenItemFormData) => {
    try {
      const category = categories.find(c => c.id === values.categoryId);
      const data: AllergenItemFormData = {
        ...values,
        categoryName: category?.name || '',
      };

      if (editingItem) {
        await updateAllergenItem(editingItem.id, data);
        message.success('Item updated');
      } else {
        await createAllergenItem(data);
        message.success('Item created');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('Failed to save item');
      console.error(error);
    }
  };

  // Render allergen icons for an item
  const renderAllergenIcons = (allergens: AllergenItem['allergens']) => {
    const activeAllergens = allergenTypes.filter(a => allergens[a.key]);
    if (activeAllergens.length === 0) return <span className="text-gray-400">None</span>;
    
    return (
      <div className="flex flex-wrap gap-1">
        {activeAllergens.map(a => (
          <Tooltip key={a.key} title={a.label}>
            <span className="text-lg cursor-default">{a.icon}</span>
          </Tooltip>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: AllergenItem, b: AllergenItem) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (name: string) => <Tag color="blue">{name}</Tag>,
      width: 150,
    },
    {
      title: 'Allergens & Lifestyle',
      dataIndex: 'allergens',
      key: 'allergens',
      render: (allergens: AllergenItem['allergens']) => renderAllergenIcons(allergens),
      width: 200,
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
      render: (_: unknown, record: AllergenItem) => (
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

  const tabItems = [
    { key: 'all', label: `All Items (${items.length})` },
    ...categories.map(c => ({
      key: c.id,
      label: `${c.name} (${c.itemCount})`,
    })),
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Title level={3} className="!mb-0">Allergens & Dietary Info</Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Item
            </Button>
          </Space>
        </div>

        <Card styles={{ body: { overflow: 'hidden' } }}>
          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
            <Tabs
              activeKey={selectedCategory}
              onChange={setSelectedCategory}
              items={tabItems}
              className="mb-4"
            />
          </div>
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            size="middle"
            scroll={{ x: 800 }}
          />
        </Card>

        <Modal
          title={editingItem ? 'Edit Item' : 'Add Item'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={600}
          destroyOnHidden
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="mt-4"
          >
            <Form.Item
              name="name"
              label="Item Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
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

            <Form.Item
              name="isActive"
              label="Active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <div className="border rounded-lg p-4 mb-4">
              <div className="font-medium mb-3">Allergens (Contains)</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allergenTypes.filter(a => !a.isLifestyle).map(allergen => (
                  <Form.Item
                    key={allergen.key}
                    name={['allergens', allergen.key]}
                    valuePropName="checked"
                    className="mb-1"
                  >
                    <Checkbox>
                      <span className="mr-1">{allergen.icon}</span>
                      {allergen.label}
                    </Checkbox>
                  </Form.Item>
                ))}
              </div>

              <div className="font-medium mb-3 mt-4">Lifestyle</div>
              <div className="grid grid-cols-2 gap-2">
                {allergenTypes.filter(a => a.isLifestyle).map(lifestyle => (
                  <Form.Item
                    key={lifestyle.key}
                    name={['allergens', lifestyle.key]}
                    valuePropName="checked"
                    className="mb-1"
                  >
                    <Checkbox>
                      <span className="mr-1">{lifestyle.icon}</span>
                      {lifestyle.label}
                    </Checkbox>
                  </Form.Item>
                ))}
              </div>
            </div>

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
