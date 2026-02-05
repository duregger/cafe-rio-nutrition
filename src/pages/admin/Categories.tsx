import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Space,
  message,
  Popconfirm,
  Typography,
  Card,
  List,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Category, CategoryFormData } from '../../types';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  generateSlug,
} from '../../services/firestore';
import AdminLayout from './AdminLayout';

const { Title } = Typography;

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      message.error('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success('Category deleted');
      fetchCategories();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const handleSubmit = async (values: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        message.success('Category updated');
      } else {
        await createCategory(values);
        message.success('Category created');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (error) {
      message.error('Failed to save category');
      console.error(error);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!editingCategory) {
      form.setFieldValue('slug', generateSlug(name));
    }
  };

  // Desktop columns
  const columns = [
    {
      title: 'Order',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 80,
      sorter: (a: Category, b: Category) => a.displayOrder - b.displayOrder,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Category, b: Category) => a.name.localeCompare(b.name),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      className: 'text-gray-500 font-mono text-sm',
      responsive: ['lg'] as ('lg' | 'md' | 'sm' | 'xs' | 'xl' | 'xxl')[],
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
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
      render: (_: unknown, record: Category) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete category?"
            description="This cannot be undone. Items must be deleted first."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Mobile list item renderer
  const renderMobileItem = (category: Category) => (
    <List.Item
      actions={[
        <Button
          key="edit"
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(category)}
        />,
        <Popconfirm
          key="delete"
          title="Delete category?"
          description="This cannot be undone."
          onConfirm={() => handleDelete(category.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>,
      ]}
    >
      <List.Item.Meta
        title={
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">#{category.displayOrder}</span>
            <span>{category.name}</span>
            <Tag color={category.isActive ? 'green' : 'red'} className="!ml-auto">
              {category.isActive ? 'Active' : 'Inactive'}
            </Tag>
          </div>
        }
        description={
          <div className="text-xs text-gray-500">
            {category.itemCount} items • {category.slug}
          </div>
        }
      />
    </List.Item>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Title level={3} className="!mb-0 !text-xl md:!text-2xl">Categories</Title>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchCategories}
              size="middle"
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAdd}
              size="middle"
            >
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </Space>
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <Table
            dataSource={categories}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="middle"
            scroll={{ x: 600 }}
          />
        </Card>

        {/* Mobile List */}
        <Card className="md:hidden" styles={{ body: { padding: '0' } }}>
          <List
            dataSource={categories}
            loading={loading}
            renderItem={renderMobileItem}
            size="small"
          />
        </Card>

        {/* Modal - works on all screen sizes */}
        <Modal
          title={editingCategory ? 'Edit Category' : 'Add Category'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          destroyOnHidden
          width={400}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="mt-4"
          >
            <Form.Item
              name="name"
              label="Category Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="e.g., Proteins" onChange={handleNameChange} />
            </Form.Item>

            <Form.Item
              name="slug"
              label="Slug (URL-friendly)"
              rules={[{ required: true, message: 'Please enter a slug' }]}
            >
              <Input placeholder="e.g., proteins" />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} placeholder="Optional description" />
            </Form.Item>

            <Form.Item
              name="displayOrder"
              label="Display Order"
              rules={[{ required: true, message: 'Please enter display order' }]}
            >
              <InputNumber min={1} className="w-full" />
            </Form.Item>

            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item className="mb-0">
              <div className="flex justify-end gap-2">
                <Button onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
