import { useState } from 'react';
import { Card, Button, Typography, message, Spin } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.svg';

const { Title, Text } = Typography;

export default function LoginOverlay() {
  const [loading, setLoading] = useState(false);
  const { currentUser, loading: authLoading, loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      message.success('Logged in successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Don't show overlay if user is logged in
  if (currentUser) {
    return null;
  }

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <div className="login-overlay">
        <div className="login-overlay-backdrop" />
        <div className="login-overlay-content">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="login-overlay">
      {/* Semi-transparent backdrop */}
      <div className="login-overlay-backdrop" />
      
      {/* Login modal */}
      <div className="login-overlay-content">
        <Card className="login-card">
          {/* Logo */}
          <div className="text-center mb-4">
            <img src={logo} alt="Cafe Rio" className="h-8 mx-auto mb-4" />
          </div>

          <div className="text-center mb-6">
            <Title level={3} className="!mb-2">
              Sign In Required
            </Title>
            <Text className="text-gray-500">
              Please sign in to access the Cafe Rio Nutrition Guide
            </Text>
          </div>


          <Button
            icon={<GoogleOutlined />}
            size="large"
            block
            onClick={handleGoogleLogin}
            loading={loading}
            type="primary"
            className="h-12 text-base font-medium"
            style={{ backgroundColor: '#F93A26', borderColor: '#F93A26' }}
          >
            Sign in with Google
          </Button>

          <div className="text-center mt-4">
            <Text type="secondary" className="text-xs">
              Contact your administrator if you need access.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
