import { Button, Card, Row, Col, Typography } from 'antd';
import { 
  CalculatorOutlined, 
  FileTextOutlined, 
  SafetyOutlined,
  DownloadOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getItems } from '../services/firestore';
import type { MenuItem } from '../types';

const { Title, Paragraph, Text } = Typography;

export default function Home() {
  const navigate = useNavigate();
  const [generatingPDF, setGeneratingPDF] = useState(false);
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
        <Button 
          size="large"
          icon={<DownloadOutlined />}
          onClick={generatePDF}
          loading={generatingPDF}
          className="border-none h-10 md:h-12 px-6 md:px-8 text-base md:text-lg font-semibold"
          style={{ backgroundColor: '#382827', color: '#F9E4CA' }}
        >
          {generatingPDF ? 'Generating...' : 'Download Full PDF'}
        </Button>
      </div>

      {/* Features Section - Clickable Cards */}
      <Row gutter={[16, 16]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={8} key={index}>
            <Card 
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
            <li><strong>PDF Export</strong> — Generate a complete nutrition & allergen report</li>
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
