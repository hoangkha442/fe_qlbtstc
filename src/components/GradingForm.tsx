import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Checkbox, Form, Input, InputNumber } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { api, errorMessage } from '../lib/api';
import type { GradeSubmissionResult, Version } from '../lib/types';
import GradeDisplay from './GradeDisplay';

interface GradeFields {
  score: number;
  feedback?: string;
  sendEmail: boolean;
}

export default function GradingForm({
  submissionId,
  version,
}: {
  submissionId: string;
  version: Version;
}) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<GradeFields>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const sending = useRef(false);
  function edit() {
    form.setFieldsValue({
      score: version.grade?.score,
      feedback: version.grade?.feedback ?? '',
      sendEmail: false,
    });
    setRevision(version.grade?.revision ?? 0);
    setOpen(true);
  }
  async function save(values: GradeFields) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const { data } = await api.patch<GradeSubmissionResult>(
        `/lecturer/submissions/${submissionId}/grade`,
        {
          version: version.version,
          score: values.score,
          feedback: values.feedback?.trim() ?? '',
          sendEmail: !!version.email && values.sendEmail === true,
          expectedRevision: revision,
        },
      );
      setOpen(false);
      notification[
        data.emailRequested && !data.emailSent ? 'warning' : 'success'
      ]({
        title:
          data.emailRequested && !data.emailSent
            ? 'Đã lưu điểm, chưa gửi được email'
            : 'Đã lưu điểm',
        description: data.message,
      });
      await queryClient.invalidateQueries({ queryKey: ['lecturer'] });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setOpen(false);
        await queryClient.invalidateQueries({ queryKey: ['lecturer'] });
        notification.warning({
          title: 'Điểm đã thay đổi',
          description: errorMessage(error),
        });
      } else
        notification.error({
          title: 'Chưa lưu được điểm',
          description: errorMessage(error),
        });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="my-4">
      <GradeDisplay grade={version.grade} />
      {!open ? (
        <Button icon={<EditOutlined />} onClick={edit}>
          {version.grade ? 'Sửa điểm' : 'Chấm điểm'} · Phiên bản{' '}
          {version.version}
        </Button>
      ) : (
        <Form form={form} layout="vertical" onFinish={save} disabled={busy}>
          <Form.Item
            label="Điểm (thang 10)"
            name="score"
            rules={[
              { required: true, message: 'Nhập điểm bài nộp.' },
              {
                type: 'number',
                min: 0,
                max: 10,
                message: 'Điểm phải từ 0 đến 10.',
              },
            ]}
          >
            <InputNumber
              className="w-full"
              min={0}
              max={10}
              step={0.25}
              precision={2}
              placeholder="Nhập điểm từ 0 đến 10"
            />
          </Form.Item>
          <Form.Item label="Nhận xét" name="feedback">
            <Input.TextArea
              rows={4}
              maxLength={5000}
              showCount
              placeholder="Nhận xét về bài làm của sinh viên"
            />
          </Form.Item>
          <Form.Item name="sendEmail" valuePropName="checked">
            <Checkbox disabled={busy || !version.email}>
              {version.email
                ? `Gửi điểm qua email đến ${version.email}`
                : 'Bài nộp chưa có email để gửi điểm'}
            </Checkbox>
          </Form.Item>
          <div className="flex flex-wrap gap-3">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={busy}
            >
              Lưu điểm
            </Button>
            <Button disabled={busy} onClick={() => setOpen(false)}>
              Hủy
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}
