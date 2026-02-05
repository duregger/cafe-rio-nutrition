import { useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Dropdown, Drawer, Menu } from 'antd';
import { 
  HomeOutlined, 
  CalculatorOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  MenuOutlined,
  WarningOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.svg';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const leftLinks = [
    { to: '/', label: 'Home', icon: <HomeOutlined /> },
    { to: '/calculator', label: 'Calc', icon: <CalculatorOutlined /> },
    { to: '/allergens', label: 'Allergens', icon: <WarningOutlined /> },
    { to: '/nutrition-info', label: 'Nutrition', icon: <FileTextOutlined /> },
  ];

  const allLinks = [
    ...leftLinks,
    { to: '/admin/categories', label: 'Admin', icon: <SettingOutlined /> },
  ];

  const isActive = (path: string) => 
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="layout-root">
      {/* HEADER */}
      <header className="header">
        <Link to="/" className="header-logo">
          <img src={logo} alt="Cafe Rio" />
        </Link>
        
        {/* Desktop Nav - hidden on mobile */}
        <nav className="header-nav">
          {leftLinks.map(link => (
            <Link 
              key={link.to} 
              to={link.to} 
              className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
            >
              {link.icon}
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right section */}
        <div className="header-right">
          <Link 
            to="/admin/categories" 
            className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`}
          >
            <SettingOutlined />
            <span className="nav-label">Admin</span>
          </Link>
          
          {currentUser && (
            <Dropdown menu={{ items: [{ key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: () => { logout(); navigate('/'); } }] }}>
              <Avatar icon={<UserOutlined />} size="small" className="user-avatar" />
            </Dropdown>
          )}
          
          <button className="menu-btn" onClick={() => setDrawerOpen(true)}>
            <MenuOutlined />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} size="default">
        <Menu
          selectedKeys={[location.pathname]}
          items={allLinks.map(l => ({ key: l.to, label: l.label, icon: l.icon }))}
          onClick={({ key }) => { navigate(key); setDrawerOpen(false); }}
        />
      </Drawer>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">{children}</div>
      </main>
      
      {/* Footer */}
      <footer className="footer">
        Cafe Rio Nutrition ©{new Date().getFullYear()}
      </footer>
    </div>
  );
}
