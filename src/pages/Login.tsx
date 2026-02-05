import { useState } from 'react';
import { Card, Button, Typography, message, Alert } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      message.success('Logged in successfully!');
      navigate('/admin/categories');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <Title level={2} className="!mb-2">
            Admin Login
          </Title>
          <Text className="text-gray-500">
            Sign in with your Cafe Rio Google account
          </Text>
        </div>

        {import.meta.env.DEV ? (
          <Alert
            title="Development Mode"
            description="Any Google account can sign in during development. Production will restrict to @caferio.com only."
            type="warning"
            showIcon
            className="mb-6"
          />
        ) : (
          <Alert
            title="Restricted Access"
            description="Only @caferio.com Google accounts can sign in."
            type="info"
            showIcon
            className="mb-6"
          />
        )}

        <Button
          icon={<GoogleOutlined />}
          size="large"
          block
          onClick={handleGoogleLogin}
          loading={loading}
          type="primary"
          className="bg-green-600 hover:bg-green-700 h-12"
        >
          Sign in with Google
        </Button>

        <div className="text-center mt-4">
          <Text type="secondary" className="text-sm">
            Contact your administrator if you need access.
          </Text>
        </div>
      </Card>
    </div>
  );
}
