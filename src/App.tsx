import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginOverlay from './components/LoginOverlay';
import Home from './pages/Home';
import Calculator from './pages/Calculator';
import AllergensPublic from './pages/AllergensPublic';
import NutritionInfo from './pages/NutritionInfo';
import Categories from './pages/admin/Categories';
import Items from './pages/admin/Items';
import Import from './pages/admin/Import';
import Allergens from './pages/admin/Allergens';

// Cafe Rio brand colors
// Rio Red: #F93A26, Crema: #F9E4CA, Lite Crema: #F2E7DC, Black Bean: #382827
const theme = {
  token: {
    colorPrimary: '#F93A26', // Rio Red
    colorBgContainer: '#ffffff',
    colorText: '#382827', // Black Bean
    borderRadius: 8,
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          {/* Login overlay blocks access for non-authenticated users */}
          <LoginOverlay />
          
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/allergens" element={<AllergensPublic />} />
              <Route path="/nutrition-info" element={<NutritionInfo />} />
              
              {/* Admin routes */}
              <Route path="/admin/categories" element={<Categories />} />
              <Route path="/admin/items" element={<Items />} />
              <Route path="/admin/allergens" element={<Allergens />} />
              <Route path="/admin/import" element={<Import />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
