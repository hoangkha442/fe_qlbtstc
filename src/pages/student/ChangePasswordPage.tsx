import { useState } from 'react';
import { Alert, App, Button, Form, Input } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { studentReturn, useStudentAuth } from '../../lib/student-context';
import { errorMessage } from '../../lib/api';
import { PageHeading, QueryState } from '../../components/common';

export default function ChangePasswordPage() {
  const auth = useStudentAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const target = studentReturn(
    (location.state as { from?: string } | null)?.from,
  );
  if (auth.loading || auth.error)
    return (
      <QueryState pending={auth.loading} error={auth.error} retry={auth.retry}>
        {null}
      </QueryState>
    );
  if (!auth.student)
    return (
      <Navigate to="/specialized/login" replace state={{ from: target }} />
    );
  async function save(values: {
    currentPassword: string;
    newPassword: string;
  }) {
    setBusy(true);
    setError('');
    try {
      await auth.changePassword(values.currentPassword, values.newPassword);
      void message.success('Đã đổi mật khẩu.');
      navigate(target, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      void message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="student-auth-card surface">
      <span className="subject-icon mb-6">
        <LockOutlined />
      </span>
      <PageHeading
        eyebrow="TÀI KHOẢN SINH VIÊN"
        title="Đổi mật khẩu"
        description={
          auth.student.mustChangePassword
            ? 'Đặt mật khẩu riêng trước khi bắt đầu học.'
            : 'Cập nhật mật khẩu tài khoản của bạn.'
        }
      />
      {auth.student.mustChangePassword && (
        <Alert
          className="mb-6"
          showIcon
          type="info"
          title="Bạn đang dùng mật khẩu do giảng viên cấp."
        />
      )}
      <Form
        layout="vertical"
        onFinish={save}
        disabled={busy}
        requiredMark={false}
      >
        <Form.Item
          name="currentPassword"
          label="Mật khẩu hiện tại"
          rules={[{ required: true }]}
        >
          <Input.Password size="large" autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          dependencies={['currentPassword']}
          rules={[
            { required: true },
            { min: 12, message: 'Mật khẩu cần ít nhất 12 ký tự.' },
            ({ getFieldValue }) => ({
              validator: (_, v: string) =>
                !v ||
                (new TextEncoder().encode(v).length <= 72 &&
                  v !== getFieldValue('currentPassword'))
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(
                        'Mật khẩu mới phải khác mật khẩu hiện tại và tối đa 72 byte.',
                      ),
                    ),
            }),
          ]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Nhập lại mật khẩu mới"
          dependencies={['newPassword']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator: (_, v: string) =>
                !v || v === getFieldValue('newPassword')
                  ? Promise.resolve()
                  : Promise.reject(new Error('Mật khẩu nhập lại chưa khớp.')),
            }),
          ]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        {error && (
          <Alert className="mb-5" showIcon type="error" title={error} />
        )}
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={busy}
        >
          Lưu mật khẩu và tiếp tục
        </Button>
      </Form>
    </div>
  );
}
