import { useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, Drawer, Button } from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  ImportOutlined,
  WarningOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { key: '/admin/categories', icon: <AppstoreOutlined />, label: 'Categories' },
    { key: '/admin/items', icon: <UnorderedListOutlined />, label: 'Menu Items' },
    { key: '/admin/allergens', icon: <WarningOutlined />, label: 'Allergens' },
    { key: '/admin/import', icon: <ImportOutlined />, label: 'Import Data' },
    { key: '/admin/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 134px)', width: '100%' }}>
      {/* Mobile Header - flows in document, not absolute */}
      <div className="md:hidden" style={{ 
        background: '#fff', 
        borderBottom: '1px solid #e5e5e5',
        padding: '8px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600 }}>Admin Panel</span>
        <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} />
      </div>

      <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        {/* Desktop Sidebar */}
        <aside style={{ 
          width: 200, 
          background: '#fff', 
          borderRight: '1px solid #e5e5e5',
          flexShrink: 0,
          display: 'none',
        }} className="md:!block">
          <div style={{ padding: 16, borderBottom: '1px solid #e5e5e5' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Admin Panel</h2>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ border: 'none' }}
          />
        </aside>

        {/* Mobile Drawer */}
        <Drawer
          title="Admin Menu"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          size="default"
          styles={{ body: { padding: 0 } }}
        >
          <Menu
            mode="vertical"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ border: 'none' }}
          />
        </Drawer>

        {/* Content */}
        <main style={{ 
          flex: 1, 
          padding: 16, 
          background: '#f5f5f5', 
          minWidth: 0,
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
