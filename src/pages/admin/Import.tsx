import { useState } from 'react';
import {
  Card,
  Button,
  Typography,
  Upload,
  message,
  Progress,
  Alert,
  Table,
  Tag,
  Space,
  Tabs,
  Tooltip,
} from 'antd';
import { UploadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { MenuItemFormData, NutritionData, AllergenItemFormData, AllergenFlags } from '../../types';
import { emptyNutrition, emptyAllergenFlags, allergenTypes } from '../../types';
import { createCategory, bulkCreateItems, getCategories, generateSlug } from '../../services/firestore';
import { 
  createAllergenCategory, 
  bulkCreateAllergenItems, 
  getAllergenCategories 
} from '../../services/allergens';
import AdminLayout from './AdminLayout';

const { Title, Text, Paragraph } = Typography;

// Nutrition import types
interface ParsedNutritionItem {
  name: string;
  category: string;
  nutrition: NutritionData;
}

interface NutritionImportPreview {
  categories: string[];
  items: ParsedNutritionItem[];
  totalItems: number;
}

// Allergen import types
interface ParsedAllergenItem {
  name: string;
  category: string;
  allergens: AllergenFlags;
}

interface AllergenImportPreview {
  categories: string[];
  items: ParsedAllergenItem[];
  totalItems: number;
}

export default function Import() {
  const [activeTab, setActiveTab] = useState('nutrition');
  
  // Nutrition state
  const [nutritionFileList, setNutritionFileList] = useState<UploadFile[]>([]);
  const [nutritionPreview, setNutritionPreview] = useState<NutritionImportPreview | null>(null);
  const [nutritionImporting, setNutritionImporting] = useState(false);
  const [nutritionProgress, setNutritionProgress] = useState(0);
  
  // Allergen state
  const [allergenFileList, setAllergenFileList] = useState<UploadFile[]>([]);
  const [allergenPreview, setAllergenPreview] = useState<AllergenImportPreview | null>(null);
  const [allergenImporting, setAllergenImporting] = useState(false);
  const [allergenProgress, setAllergenProgress] = useState(0);

  // ============ NUTRITION IMPORT ============
  
  const parseNutritionJson = (jsonStr: string): NutritionImportPreview | null => {
    try {
      const data = JSON.parse(jsonStr);
      
      if (Array.isArray(data)) {
        const categories = [...new Set(data.map((item: ParsedNutritionItem) => item.category))];
        return { categories, items: data, totalItems: data.length };
      } else if (data.items) {
        const categories = data.categories || [...new Set(data.items.map((item: ParsedNutritionItem) => item.category))];
        return { categories, items: data.items, totalItems: data.items.length };
      }
      
      throw new Error('Invalid JSON format');
    } catch (error) {
      message.error('Failed to parse JSON file');
      console.error(error);
      return null;
    }
  };

  const handleNutritionFileChange = async (info: { fileList: UploadFile[] }) => {
    const latestFile = info.fileList[info.fileList.length - 1];
    setNutritionFileList(latestFile ? [latestFile] : []);
    
    if (latestFile?.originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsed = parseNutritionJson(content);
        setNutritionPreview(parsed);
      };
      reader.readAsText(latestFile.originFileObj);
    } else {
      setNutritionPreview(null);
    }
  };

  const handleNutritionImport = async () => {
    if (!nutritionPreview) return;
    
    setNutritionImporting(true);
    setNutritionProgress(0);
    
    try {
      const existingCategories = await getCategories();
      const existingCategoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c]));
      
      const categoryIdMap = new Map<string, string>();
      let newCategoriesCount = 0;
      
      for (let i = 0; i < nutritionPreview.categories.length; i++) {
        const categoryName = nutritionPreview.categories[i];
        const existing = existingCategoryMap.get(categoryName.toLowerCase());
        
        if (existing) {
          categoryIdMap.set(categoryName, existing.id);
        } else {
          const id = await createCategory({
            name: categoryName,
            slug: generateSlug(categoryName),
            displayOrder: existingCategories.length + newCategoriesCount + 1,
            isActive: true,
          });
          categoryIdMap.set(categoryName, id);
          newCategoriesCount++;
        }
        
        setNutritionProgress(Math.round((i / nutritionPreview.categories.length) * 20));
      }
      
      const itemsToCreate: MenuItemFormData[] = nutritionPreview.items.map(item => ({
        name: item.name,
        categoryId: categoryIdMap.get(item.category) || '',
        categoryName: item.category,
        isActive: true,
        nutrition: { ...emptyNutrition, ...item.nutrition },
      }));
      
      const batchSize = 50;
      for (let i = 0; i < itemsToCreate.length; i += batchSize) {
        const batch = itemsToCreate.slice(i, i + batchSize);
        await bulkCreateItems(batch);
        setNutritionProgress(20 + Math.round(((i + batch.length) / itemsToCreate.length) * 80));
      }
      
      message.success(`Imported ${nutritionPreview.totalItems} nutrition items!`);
      setNutritionPreview(null);
      setNutritionFileList([]);
    } catch (error) {
      message.error('Import failed');
      console.error(error);
    } finally {
      setNutritionImporting(false);
      setNutritionProgress(0);
    }
  };

  // ============ ALLERGEN IMPORT ============
  
  const parseAllergenJson = (jsonStr: string): AllergenImportPreview | null => {
    try {
      const data = JSON.parse(jsonStr);
      
      if (Array.isArray(data)) {
        const categories = [...new Set(data.map((item: ParsedAllergenItem) => item.category))];
        return { categories, items: data, totalItems: data.length };
      } else if (data.items) {
        const categories = data.categories || [...new Set(data.items.map((item: ParsedAllergenItem) => item.category))];
        return { categories, items: data.items, totalItems: data.items.length };
      }
      
      throw new Error('Invalid JSON format');
    } catch (error) {
      message.error('Failed to parse JSON file');
      console.error(error);
      return null;
    }
  };

  const handleAllergenFileChange = async (info: { fileList: UploadFile[] }) => {
    const latestFile = info.fileList[info.fileList.length - 1];
    setAllergenFileList(latestFile ? [latestFile] : []);
    
    if (latestFile?.originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsed = parseAllergenJson(content);
        setAllergenPreview(parsed);
      };
      reader.readAsText(latestFile.originFileObj);
    } else {
      setAllergenPreview(null);
    }
  };

  const handleAllergenImport = async () => {
    if (!allergenPreview) return;
    
    setAllergenImporting(true);
    setAllergenProgress(0);
    
    try {
      const existingCategories = await getAllergenCategories();
      const existingCategoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c]));
      
      const categoryIdMap = new Map<string, string>();
      let newCategoriesCount = 0;
      
      for (let i = 0; i < allergenPreview.categories.length; i++) {
        const categoryName = allergenPreview.categories[i];
        const existing = existingCategoryMap.get(categoryName.toLowerCase());
        
        if (existing) {
          categoryIdMap.set(categoryName, existing.id);
        } else {
          const id = await createAllergenCategory({
            name: categoryName,
            displayOrder: existingCategories.length + newCategoriesCount + 1,
            isActive: true,
          });
          categoryIdMap.set(categoryName, id);
          newCategoriesCount++;
        }
        
        setAllergenProgress(Math.round((i / allergenPreview.categories.length) * 20));
      }
      
      const itemsToCreate: AllergenItemFormData[] = allergenPreview.items.map(item => ({
        name: item.name,
        categoryId: categoryIdMap.get(item.category) || '',
        categoryName: item.category,
        isActive: true,
        allergens: { ...emptyAllergenFlags, ...item.allergens },
      }));
      
      const batchSize = 50;
      for (let i = 0; i < itemsToCreate.length; i += batchSize) {
        const batch = itemsToCreate.slice(i, i + batchSize);
        await bulkCreateAllergenItems(batch);
        setAllergenProgress(20 + Math.round(((i + batch.length) / itemsToCreate.length) * 80));
      }
      
      message.success(`Imported ${allergenPreview.totalItems} allergen items!`);
      setAllergenPreview(null);
      setAllergenFileList([]);
    } catch (error) {
      message.error('Import failed');
      console.error(error);
    } finally {
      setAllergenImporting(false);
      setAllergenProgress(0);
    }
  };

  // ============ RENDER ============

  const nutritionColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (cat: string) => <Tag color="blue">{cat}</Tag> },
    { title: 'Calories', dataIndex: ['nutrition', 'calories'], key: 'calories' },
    { title: 'Protein', dataIndex: ['nutrition', 'protein'], key: 'protein', render: (val: number) => val ? `${val}g` : '-' },
  ];

  const allergenColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (cat: string) => <Tag color="blue">{cat}</Tag> },
    { 
      title: 'Allergens', 
      dataIndex: 'allergens', 
      key: 'allergens',
      render: (allergens: AllergenFlags) => {
        const active = allergenTypes.filter(a => allergens[a.key]);
        return active.length > 0 
          ? active.map(a => <Tooltip key={a.key} title={a.label}><span>{a.icon}</span></Tooltip>)
          : <span className="text-gray-400">None</span>;
      }
    },
  ];

  const tabItems = [
    {
      key: 'nutrition',
      label: 'Nutrition Data',
      children: (
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <Paragraph>
                Import nutrition data from the generated JSON file (<code>scripts/cafe_rio_nutrition.json</code>).
              </Paragraph>
              
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-48">
{`{
  "items": [
    {
      "name": "Fire-Grilled Chicken - 4 oz",
      "category": "Protein",
      "nutrition": {
        "calories": 170,
        "protein": 29,
        "totalFat": 6,
        ...
      }
    }
  ]
}`}
              </pre>

              <Upload
                fileList={nutritionFileList}
                onChange={handleNutritionFileChange}
                beforeUpload={() => false}
                accept=".json"
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Select Nutrition JSON</Button>
              </Upload>
            </div>
          </Card>

          {nutritionPreview && (
            <Card title="Import Preview">
              <div className="space-y-4">
                <Alert
                  title={`Found ${nutritionPreview.totalItems} items in ${nutritionPreview.categories.length} categories`}
                  type="info"
                  showIcon
                />
                
                <div>
                  <Text strong>Categories: </Text>
                  <Space wrap className="mt-2">
                    {nutritionPreview.categories.map(cat => (
                      <Tag key={cat} color="green">{cat}</Tag>
                    ))}
                  </Space>
                </div>
                
                <Table
                  dataSource={nutritionPreview.items.slice(0, 10)}
                  columns={nutritionColumns}
                  rowKey="name"
                  pagination={false}
                  size="small"
                  footer={() => nutritionPreview.items.length > 10 
                    ? <Text type="secondary">Showing 10 of {nutritionPreview.items.length} items</Text>
                    : null
                  }
                />
                
                {nutritionImporting && <Progress percent={nutritionProgress} status="active" />}
                
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={handleNutritionImport}
                  loading={nutritionImporting}
                  size="large"
                >
                  Import {nutritionPreview.totalItems} Nutrition Items
                </Button>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'allergens',
      label: 'Allergen Data',
      children: (
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <Paragraph>
                Import allergen data from the generated JSON file (<code>scripts/cafe_rio_allergens.json</code>).
              </Paragraph>
              
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-48">
{`{
  "items": [
    {
      "name": "Fire-Grilled Chicken - 4 oz",
      "category": "Protein",
      "allergens": {
        "egg": false,
        "milk": false,
        "gluten": false,
        "vegan": false,
        "vegetarian": false,
        ...
      }
    }
  ]
}`}
              </pre>

              <Upload
                fileList={allergenFileList}
                onChange={handleAllergenFileChange}
                beforeUpload={() => false}
                accept=".json"
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Select Allergen JSON</Button>
              </Upload>
            </div>
          </Card>

          {allergenPreview && (
            <Card title="Import Preview">
              <div className="space-y-4">
                <Alert
                  title={`Found ${allergenPreview.totalItems} items in ${allergenPreview.categories.length} categories`}
                  type="info"
                  showIcon
                />
                
                <div>
                  <Text strong>Categories: </Text>
                  <Space wrap className="mt-2">
                    {allergenPreview.categories.map(cat => (
                      <Tag key={cat} color="orange">{cat}</Tag>
                    ))}
                  </Space>
                </div>
                
                <Table
                  dataSource={allergenPreview.items.slice(0, 10)}
                  columns={allergenColumns}
                  rowKey="name"
                  pagination={false}
                  size="small"
                  footer={() => allergenPreview.items.length > 10 
                    ? <Text type="secondary">Showing 10 of {allergenPreview.items.length} items</Text>
                    : null
                  }
                />
                
                {allergenImporting && <Progress percent={allergenProgress} status="active" />}
                
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={handleAllergenImport}
                  loading={allergenImporting}
                  size="large"
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Import {allergenPreview.totalItems} Allergen Items
                </Button>
              </div>
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Title level={3}>Import Data</Title>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>
    </AdminLayout>
  );
}
