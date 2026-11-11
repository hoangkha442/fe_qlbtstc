import { useState } from 'react';
import { Alert, App, Button, Form, Input } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brand, PageHeading } from '../components/common';
import { useAuth } from '../lib/auth-context';
import { errorMessage } from '../lib/api';
import LoadingScreen from '../components/LoadingScreen';

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notification } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const from = (location.state as { from?: string } | null)?.from;
  const target = from?.startsWith('/lecturer/') ? from : '/lecturer/dashboard';
  if (auth.loading) return <LoadingScreen />;
  if (auth.lecturer) return <Navigate to={target} replace />;
  async function login(values: { email: string; password: string }) {
    setBusy(true);
    setError('');
    try {
      await auth.login(values.email, values.password);
      notification.success({ title: 'Đăng nhập thành công' });
      navigate(target, { replace: true });
    } catch (err) {
      const text = errorMessage(err);
      setError(text);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="role-login-shell">
      <div className="role-login-brand">
        <Brand to="/login" />
      </div>
      <section className="surface student-auth-card">
        <PageHeading title="Đăng nhập giảng viên" />
        <Form
          layout="vertical"
          onFinish={login}
          disabled={busy}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: 'email' }]}
          >
            <Input size="large" type="email" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true }]}
          >
            <Input.Password
              size="large"
              autoComplete="current-password"
              maxLength={72}
            />
          </Form.Item>
          {error && (
            <Alert className="mb-5" showIcon type="error" title={error} />
          )}
          <Button
            block
            type="primary"
            htmlType="submit"
            size="large"
            loading={busy}
          >
            Đăng nhập
          </Button>
        </Form>
      </section>
    </main>
  );
}
