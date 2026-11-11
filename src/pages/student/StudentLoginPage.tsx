import { useState } from 'react';
import { Alert, App, Button, Form, Input } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { studentReturn, useStudentAuth } from '../../lib/student-context';
import { errorMessage } from '../../lib/api';
import { Brand, PageHeading } from '../../components/common';
import LoadingScreen from '../../components/LoadingScreen';

export default function StudentLoginPage() {
  const auth = useStudentAuth();
  const { notification } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const target = studentReturn(
    (location.state as { from?: string } | null)?.from,
  );
  if (auth.loading) return <LoadingScreen />;
  if (auth.student)
    return (
      <Navigate
        to={
          auth.student.mustChangePassword
            ? '/specialized/change-password'
            : target
        }
        state={{ from: target }}
        replace
      />
    );
  async function login(values: { username: string; password: string }) {
    setBusy(true);
    setError('');
    try {
      const student = await auth.login(values.username, values.password);
      notification.success({ title: 'Đăng nhập thành công' });
      navigate(
        student.mustChangePassword ? '/specialized/change-password' : target,
        { replace: true, state: { from: target } },
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="role-login-shell student-login-page">
      <div className="role-login-brand">
        <Brand to="/specialized/login" />
      </div>
      <section className="student-auth-card surface">
        <PageHeading title="Đăng nhập sinh viên" />
        <Form
          layout="vertical"
          onFinish={login}
          disabled={busy}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            normalize={(v: string) => v.trim().toLowerCase()}
            rules={[
              { required: true },
              {
                pattern: /^[a-z0-9][a-z0-9._-]{2,79}$/,
                message: 'Kiểm tra tên đăng nhập được giảng viên cấp.',
              },
            ]}
          >
            <Input autoComplete="username" size="large" />
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
            size="large"
            type="primary"
            htmlType="submit"
            loading={busy}
          >
            Đăng nhập
          </Button>
        </Form>
      </section>
    </main>
  );
}
