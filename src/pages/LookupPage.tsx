import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import {
  FileSearchOutlined,
  LockOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api, errorMessage } from '../lib/api';
import type { Receipt } from '../lib/types';
import ReceiptView from '../components/ReceiptView';
import { PageHeading } from '../components/common';

export default function LookupPage() {
  const [receipt, setReceipt] = useState<Receipt>();
  const [accessSecret, setAccessSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function lookup(values: { receiptCode: string; secret: string }) {
    setLoading(true);
    setError('');
    setReceipt(undefined);
    setAccessSecret('');
    try {
      setReceipt(
        (
          await api.post<Receipt>('/public/receipts/lookup', {
            receiptCode: values.receiptCode.trim().toUpperCase(),
            secret: values.secret.trim(),
          })
        ).data,
      );
      setAccessSecret(values.secret.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="LUÔN CÓ THỂ KIỂM TRA LẠI"
        title="Tra cứu bài nộp"
        description="Xem biên nhận và lịch sử các lần nộp bài của bạn."
      />
      <div className="lookup-layout">
        <section className="surface lookup-form">
          <span className="subject-icon mb-6">
            <FileSearchOutlined />
          </span>
          <h2>Tìm biên nhận của bạn</h2>
          <p className="mt-3 mb-7 text-muted">
            Nhập mã biên nhận và mã bí mật trong email xác nhận hoặc biên nhận
            đã lưu. Không cần đăng nhập.
          </p>
          <Form
            layout="vertical"
            onFinish={lookup}
            disabled={loading}
            requiredMark={false}
          >
            <Form.Item
              label="Mã biên nhận"
              name="receiptCode"
              rules={[
                { required: true, message: 'Vui lòng nhập mã biên nhận.' },
                {
                  pattern: /^BN-[a-fA-F0-9]{32}$/,
                  message: 'Mã biên nhận có dạng BN- và 32 ký tự.',
                },
              ]}
              normalize={(v: string) => v.trim()}
            >
              <Input
                size="large"
                prefix={<FileSearchOutlined className="text-muted" />}
                placeholder="BN-..."
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item
              label="Mã bí mật"
              name="secret"
              rules={[
                { required: true, message: 'Vui lòng nhập mã bí mật.' },
                {
                  min: 20,
                  max: 128,
                  message: 'Kiểm tra lại mã bí mật trên biên nhận.',
                },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined className="text-muted" />}
                placeholder="Mã bí mật trên biên nhận"
                autoComplete="off"
              />
            </Form.Item>
            {error && (
              <Alert className="mb-5" type="error" showIcon title={error} />
            )}
            <Button
              className="w-full"
              size="large"
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SearchOutlined />}
            >
              Tra cứu bài nộp
            </Button>
          </Form>
          <p className="mt-6 text-xs leading-6 text-muted">
            Nếu không còn mã bí mật, vui lòng liên hệ giảng viên phụ trách.
          </p>
        </section>
        <div className="lookup-result">
          {receipt ? (
            <ReceiptView receipt={receipt} accessSecret={accessSecret} />
          ) : (
            <div className="lookup-placeholder">
              <div className="lookup-illustration">
                <FileSearchOutlined />
              </div>
              <h2>Bài nộp của bạn ở đây.</h2>
              <p>
                Biên nhận, file đã gửi và các phiên bản
                <br />
                sẽ hiển thị sau khi tra cứu thành công.
              </p>
              <span>
                <LockOutlined /> Chỉ người có mã bí mật được xem
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
