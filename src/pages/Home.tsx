import { Button, Card, Row, Col, Typography, Space } from 'antd';
import { 
  CalculatorOutlined, 
  FileTextOutlined, 
  SafetyOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { getItems } from '../services/firestore';
import type { MenuItem } from '../types';

const { Title, Paragraph, Text } = Typography;

export default function Home() {
  const navigate = useNavigate();
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    // Pre-fetch items for PDF generation
    const fetchItems = async () => {
      try {
        const data = await getItems();
        setItems(data.filter(item => item.isActive));
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };
    fetchItems();
  }, []);

  const generatePDF = async () => {
    setGeneratingPDF(true);
    
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(249, 58, 38); // Rio Red
      doc.text('Cafe Rio Nutrition & Allergen Information', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(56, 40, 39); // Black Bean
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

      // Group items by category
      const groupedItems: Record<string, MenuItem[]> = {};
      items.forEach(item => {
        const category = item.categoryName || 'Uncategorized';
        if (!groupedItems[category]) {
          groupedItems[category] = [];
        }
        groupedItems[category].push(item);
      });

      let yPosition = 35;

      // Create table for each category
      Object.entries(groupedItems).forEach(([category, categoryItems]) => {
        // Check if we need a new page
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }

        // Category header
        doc.setFontSize(12);
        doc.setTextColor(249, 58, 38);
        doc.text(category, 14, yPosition);
        yPosition += 5;

        // Table data
        const tableData = categoryItems.map(item => {
          const allergensList = [];
          if (item.allergens?.milk) allergensList.push('Milk');
          if (item.allergens?.egg) allergensList.push('Egg');
          if (item.allergens?.wheat) allergensList.push('Wheat');
          if (item.allergens?.soy) allergensList.push('Soy');
          if (item.allergens?.peanuts) allergensList.push('Peanuts');
          if (item.allergens?.treeNuts) allergensList.push('Tree Nuts');
          if (item.allergens?.fish) allergensList.push('Fish');
          if (item.allergens?.shellfish) allergensList.push('Shellfish');
          if (item.allergens?.sesame) allergensList.push('Sesame');

          return [
            item.name,
            item.nutrition?.calories || 0,
            item.nutrition?.totalFat || 0,
            item.nutrition?.saturatedFat || 0,
            item.nutrition?.sodium || 0,
            item.nutrition?.totalCarbs || 0,
            item.nutrition?.protein || 0,
            allergensList.join(', ') || '-'
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [['Item', 'Cal', 'Fat(g)', 'Sat Fat(g)', 'Sodium(mg)', 'Carbs(g)', 'Protein(g)', 'Allergens']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [249, 58, 38], // Rio Red
            fontSize: 8
          },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 50 },
            7: { cellWidth: 60 }
          },
          margin: { left: 14, right: 14 },
        });

        // Get the final Y position after the table
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      });

      // Add disclaimer on last page
      if (yPosition > 160) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'DISCLAIMER: This information is provided as a guide. Menu items may vary by location.',
        14, yPosition
      );
      doc.text(
        'Please inform your server of any allergies before ordering. Cross-contamination may occur during food preparation.',
        14, yPosition + 4
      );

      // Save the PDF
      doc.save('cafe-rio-nutrition-allergens.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateExcel = async () => {
    setGeneratingExcel(true);
    
    try {
      const wb = new ExcelJS.Workbook();

      // Group items by category
      const groupedItems: Record<string, MenuItem[]> = {};
      items.forEach(item => {
        const category = item.categoryName || 'Uncategorized';
        if (!groupedItems[category]) {
          groupedItems[category] = [];
        }
        groupedItems[category].push(item);
      });

      // Create "All Items" sheet
      const allData = items.map(item => ({
        category: item.categoryName || 'Uncategorized',
        item: item.name,
        servingSize: item.servingSize || '',
        calories: item.nutrition?.calories || 0,
        totalFat: item.nutrition?.totalFat || 0,
        saturatedFat: item.nutrition?.saturatedFat || 0,
        transFat: item.nutrition?.transFat || 0,
        cholesterol: item.nutrition?.cholesterol || 0,
        sodium: item.nutrition?.sodium || 0,
        totalCarbs: item.nutrition?.totalCarbs || 0,
        dietaryFiber: item.nutrition?.dietaryFiber || 0,
        totalSugars: item.nutrition?.totalSugars || 0,
        protein: item.nutrition?.protein || 0,
        milk: item.allergens?.milk ? '✓' : '',
        egg: item.allergens?.egg ? '✓' : '',
        wheat: item.allergens?.wheat ? '✓' : '',
        soy: item.allergens?.soy ? '✓' : '',
        peanuts: item.allergens?.peanuts ? '✓' : '',
        treeNuts: item.allergens?.treeNuts ? '✓' : '',
        fish: item.allergens?.fish ? '✓' : '',
        shellfish: item.allergens?.shellfish ? '✓' : '',
        sesame: item.allergens?.sesame ? '✓' : '',
        vegetarian: item.allergens?.vegetarian ? '✓' : '',
        vegan: item.allergens?.vegan ? '✓' : '',
      }));

      const wsAll = wb.addWorksheet('All Items');
      wsAll.columns = [
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Item', key: 'item', width: 35 },
        { header: 'Serving Size', key: 'servingSize', width: 12 },
        { header: 'Calories', key: 'calories', width: 10 },
        { header: 'Total Fat (g)', key: 'totalFat', width: 14 },
        { header: 'Saturated Fat (g)', key: 'saturatedFat', width: 16 },
        { header: 'Trans Fat (g)', key: 'transFat', width: 14 },
        { header: 'Cholesterol (mg)', key: 'cholesterol', width: 16 },
        { header: 'Sodium (mg)', key: 'sodium', width: 14 },
        { header: 'Total Carbs (g)', key: 'totalCarbs', width: 16 },
        { header: 'Dietary Fiber (g)', key: 'dietaryFiber', width: 18 },
        { header: 'Total Sugars (g)', key: 'totalSugars', width: 16 },
        { header: 'Protein (g)', key: 'protein', width: 12 },
        { header: 'Milk', key: 'milk', width: 6 },
        { header: 'Egg', key: 'egg', width: 6 },
        { header: 'Wheat', key: 'wheat', width: 8 },
        { header: 'Soy', key: 'soy', width: 6 },
        { header: 'Peanuts', key: 'peanuts', width: 10 },
        { header: 'Tree Nuts', key: 'treeNuts', width: 12 },
        { header: 'Fish', key: 'fish', width: 6 },
        { header: 'Shellfish', key: 'shellfish', width: 12 },
        { header: 'Sesame', key: 'sesame', width: 8 },
        { header: 'Vegetarian', key: 'vegetarian', width: 12 },
        { header: 'Vegan', key: 'vegan', width: 8 },
      ];
      wsAll.addRows(allData);

      // Create a sheet for each category
      Object.entries(groupedItems).forEach(([category, categoryItems]) => {
        const categoryData = categoryItems.map(item => ({
          item: item.name,
          servingSize: item.servingSize || '',
          calories: item.nutrition?.calories || 0,
          totalFat: item.nutrition?.totalFat || 0,
          satFat: item.nutrition?.saturatedFat || 0,
          sodium: item.nutrition?.sodium || 0,
          carbs: item.nutrition?.totalCarbs || 0,
          fiber: item.nutrition?.dietaryFiber || 0,
          sugars: item.nutrition?.totalSugars || 0,
          protein: item.nutrition?.protein || 0,
          allergens: [
            item.allergens?.milk ? 'Milk' : '',
            item.allergens?.egg ? 'Egg' : '',
            item.allergens?.wheat ? 'Wheat' : '',
            item.allergens?.soy ? 'Soy' : '',
            item.allergens?.peanuts ? 'Peanuts' : '',
            item.allergens?.treeNuts ? 'Tree Nuts' : '',
            item.allergens?.fish ? 'Fish' : '',
            item.allergens?.shellfish ? 'Shellfish' : '',
            item.allergens?.sesame ? 'Sesame' : '',
          ].filter(Boolean).join(', ') || '-',
        }));

        const sheetName = category.substring(0, 31).replace(/[\\/*?[\]:]/g, '');
        const ws = wb.addWorksheet(sheetName);
        ws.columns = [
          { header: 'Item', key: 'item', width: 35 },
          { header: 'Serving Size', key: 'servingSize', width: 12 },
          { header: 'Calories', key: 'calories', width: 10 },
          { header: 'Total Fat (g)', key: 'totalFat', width: 14 },
          { header: 'Sat Fat (g)', key: 'satFat', width: 12 },
          { header: 'Sodium (mg)', key: 'sodium', width: 14 },
          { header: 'Carbs (g)', key: 'carbs', width: 12 },
          { header: 'Fiber (g)', key: 'fiber', width: 10 },
          { header: 'Sugars (g)', key: 'sugars', width: 12 },
          { header: 'Protein (g)', key: 'protein', width: 12 },
          { header: 'Allergens', key: 'allergens', width: 40 },
        ];
        ws.addRows(categoryData);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cafe-rio-nutrition-allergens.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setGeneratingExcel(false);
    }
  };

  const features = [
    {
      icon: <CalculatorOutlined className="text-3xl md:text-4xl" style={{ color: '#F93A26' }} />,
      title: 'Nutrition Calculator',
      description: 'Build your meal and see the complete nutritional breakdown instantly.',
      path: '/calculator',
    },
    {
      icon: <FileTextOutlined className="text-3xl md:text-4xl" style={{ color: '#F93A26' }} />,
      title: 'Nutrition Info',
      description: 'View detailed nutritional information for all menu items.',
      path: '/nutrition-info',
    },
    {
      icon: <SafetyOutlined className="text-3xl md:text-4xl" style={{ color: '#F93A26' }} />,
      title: 'Allergen Guide',
      description: 'Find menu items that fit your dietary needs and allergen requirements.',
      path: '/allergens',
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Section */}
      <div 
        className="text-center py-8 md:py-12 px-4 rounded-xl md:rounded-2xl text-white" 
        style={{ background: 'linear-gradient(to right, #F93A26, #d62f1e)' }}
      >
        <Title level={1} className="!text-white !mb-3 md:!mb-4 !text-2xl md:!text-3xl lg:!text-4xl">
          Cafe Rio Nutrition Manager
        </Title>
        <Paragraph className="text-sm md:text-lg max-w-2xl mx-auto mb-4 md:mb-6 px-2" style={{ color: '#F9E4CA' }}>
          Manage menu items, nutritional data, and allergen information in one place.
        </Paragraph>
        <Space wrap className="justify-center">
          <Button 
            size="large"
            icon={<DownloadOutlined />}
            onClick={generatePDF}
            loading={generatingPDF}
            className="h-10 md:h-12 px-5 md:px-6 text-sm md:text-base font-semibold"
            style={{ backgroundColor: '#382827', color: '#F9E4CA', border: 'none' }}
          >
            {generatingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button 
            size="large"
            icon={<FileExcelOutlined />}
            onClick={generateExcel}
            loading={generatingExcel}
            className="h-10 md:h-12 px-5 md:px-6 text-sm md:text-base font-semibold"
            style={{ backgroundColor: '#F93A26', color: '#fff', border: 'none' }}
          >
            {generatingExcel ? 'Generating...' : 'Download Excel'}
          </Button>
        </Space>
      </div>

      {/* Features Section - Clickable Cards */}
      <Row gutter={[16, 16]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={8} key={index}>
            <Card 
              bordered={false}
              className="h-full text-center hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]" 
              size="small"
              onClick={() => navigate(feature.path)}
            >
              <div className="mb-3 md:mb-4">{feature.icon}</div>
              <Title level={4} className="!text-base md:!text-lg !mb-2">{feature.title}</Title>
              <Paragraph className="text-gray-600 text-sm md:text-base !mb-3">
                {feature.description}
              </Paragraph>
              <Text type="secondary" className="flex items-center justify-center gap-1 text-xs">
                Open <ArrowRightOutlined />
              </Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Welcome Info */}
      <Card style={{ backgroundColor: '#F2E7DC' }} className="border-none">
        <div className="py-2 md:py-4">
          <Title level={4} className="!mb-3 !text-base md:!text-lg" style={{ color: '#382827' }}>
            Welcome to the Cafe Rio Nutrition Manager
          </Title>
          <Paragraph style={{ color: '#382827' }} className="!mb-2 text-xs md:text-sm">
            This is a proof-of-concept nutrition management system for Cafe Rio. Here's what you can do:
          </Paragraph>
          <ul className="text-xs md:text-sm space-y-1 pl-4" style={{ color: '#382827' }}>
            <li><strong>Calculator</strong> — Build meals and see real-time nutrition totals</li>
            <li><strong>Nutrition Info</strong> — Browse all menu items with full nutritional data</li>
            <li><strong>Allergen Guide</strong> — Filter items by allergens and dietary preferences</li>
            <li><strong>Admin Panel</strong> — Manage categories, items, nutrition data, and allergens</li>
            <li><strong>PDF/Excel Export</strong> — Download nutrition & allergen data in PDF or Excel format</li>
            <li><strong>REST API</strong> — Public endpoints for other platforms to consume menu and nutrition data</li>
          </ul>
          <Paragraph style={{ color: '#666' }} className="!mb-0 !mt-3 text-xs">
            API Base: <code className="bg-white px-1 py-0.5 rounded text-xs">https://us-central1-cafe-rio-nutrition.cloudfunctions.net/api</code>
          </Paragraph>
        </div>
      </Card>
    </div>
  );
}
