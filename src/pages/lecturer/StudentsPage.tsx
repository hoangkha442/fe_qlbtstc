import AllSelect from '../../components/AllSelect';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'antd';
import {
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { api, errorMessage, get } from '../../lib/api';
import type { IssuedAccount, Page, StudentAccount } from '../../lib/types';
import { PageHeading, QueryState } from '../../components/common';
type Fields = {
  username: string;
  studentCode: string;
  fullName: string;
  email: string;
};
export default function StudentsPage() {
  const { message, notification } = App.useApp();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<string>();
  const [editor, setEditor] = useState<{
    account?: StudentAccount;
  }>();
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [error, setError] = useState('');
  const [form] = Form.useForm<Fields>();
  function accountNotice(data: IssuedAccount) {
    notification[data.emailSent ? 'success' : 'warning']({
      title: data.emailSent
        ? 'Đã gửi email tài khoản'
        : 'Chưa gửi được email tài khoản',
      description: data.message,
      duration: data.emailSent ? 5 : 0,
    });
  }
  const list = useQuery({
    queryKey: ['lecturer', 'students', page, search, active],
    queryFn: ({ signal }) =>
      get<Page<StudentAccount>>(
        '/lecturer/students',
        {
          page,
          limit: 10,
          search: search || undefined,
          active,
        },
        signal,
      ),
  });
  function open(account?: StudentAccount) {
    form.resetFields();
    form.setFieldsValue(account ?? {});
    setEditor({
      account,
    });
    setError('');
  }
  async function refresh() {
    await client.invalidateQueries({
      queryKey: ['lecturer', 'students'],
    });
    await client.invalidateQueries({
      queryKey: ['lecturer', 'enrollments'],
    });
    await client.invalidateQueries({
      queryKey: ['student'],
    });
  }
  async function save(values: Fields) {
    setBusy(true);
    setError('');
    try {
      const fields = {
        fullName: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
      };
      if (editor?.account)
        await api.patch(`/lecturer/students/${editor.account._id}`, fields);
      else {
        const { data } = await api.post<IssuedAccount>('/lecturer/students', {
          ...fields,
          username: values.username.trim().toLowerCase(),
          studentCode: values.studentCode.trim().toUpperCase(),
        });
        accountNotice(data);
      }
      setEditor(undefined);
      await refresh();
      if (editor?.account)
        void message.success('Đã cập nhật thông tin sinh viên.');
    } catch (err) {
      setError(errorMessage(err));
      notification.error({
        title: 'Chưa lưu được tài khoản',
        description: errorMessage(err),
      });
    } finally {
      setBusy(false);
    }
  }
  async function accountAction(account: StudentAccount, reset: boolean) {
    setRowBusy(account._id);
    try {
      if (reset) {
        const { data } = await api.post<IssuedAccount>(
          `/lecturer/students/${account._id}/reset-password`,
        );
        accountNotice(data);
      } else {
        await api.patch(`/lecturer/students/${account._id}`, {
          active: !account.active,
        });
        void message.success(
          account.active ? 'Đã khóa tài khoản.' : 'Đã mở tài khoản.',
        );
      }
      await refresh();
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setRowBusy('');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CHUYÊN NGÀNH"
        title="Tài khoản sinh viên"
        extra={
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => open()}
          >
            Cấp tài khoản
          </Button>
        }
      />
      <section className="surface">
        <div className="table-toolbar">
          <Input.Search
            aria-label="Tìm sinh viên"
            placeholder="Tìm tên, MSSV, tài khoản hoặc email…"
            allowClear
            className="max-w-sm"
            onSearch={(v) => {
              setSearch(v.trim());
              setPage(1);
            }}
          />
          <AllSelect
            aria-label="Trạng thái tài khoản"
            value={active}
            className="w-44"
            allLabel="Tất cả trạng thái"
            allowClear
            options={[
              {
                value: 'true',
                label: 'Đang hoạt động',
              },
              {
                value: 'false',
                label: 'Đã khóa',
              },
            ]}
            onChange={(v?: string) => {
              setActive(v);
              setPage(1);
            }}
          />
        </div>
        <QueryState
          pending={list.isPending}
          error={list.error}
          retry={() => void list.refetch()}
        >
          <Table<StudentAccount>
            rowKey="_id"
            dataSource={list.data?.items}
            scroll={{
              x: 950,
            }}
            pagination={{
              current: page,
              pageSize: 10,
              total: list.data?.total,
              showSizeChanger: false,
              onChange: setPage,
            }}
            columns={[
              {
                title: 'SINH VIÊN',
                key: 'student',
                render: (_, row) => (
                  <>
                    <strong>{row.fullName}</strong>
                    <p className="mt-1 text-xs text-muted">{row.studentCode}</p>
                  </>
                ),
              },
              {
                title: 'TÀI KHOẢN',
                dataIndex: 'username',
              },
              {
                title: 'EMAIL',
                dataIndex: 'email',
              },
              {
                title: 'TRẠNG THÁI',
                key: 'status',
                render: (_, row) => (
                  <Space orientation="vertical">
                    <Tag color={row.active ? 'green' : 'default'}>
                      {row.active ? 'Hoạt động' : 'Đã khóa'}
                    </Tag>
                    {row.mustChangePassword && (
                      <Tag color="orange">Cần đổi mật khẩu</Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: 'THAO TÁC',
                key: 'actions',
                render: (_, row) => (
                  <Space wrap>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => open(row)}
                    >
                      Sửa
                    </Button>
                    <Popconfirm
                      title="Cấp lại mật khẩu cho sinh viên?"
                      description="Các phiên đăng nhập hiện tại sẽ bị thu hồi."
                      onConfirm={() => accountAction(row, true)}
                    >
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        loading={rowBusy === row._id}
                        disabled={!!rowBusy}
                      >
                        Đặt lại mật khẩu
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title={
                        row.active
                          ? 'Khóa quyền đăng nhập của sinh viên?'
                          : 'Mở lại tài khoản sinh viên?'
                      }
                      onConfirm={() => accountAction(row, false)}
                    >
                      <Button
                        size="small"
                        danger={row.active}
                        icon={
                          row.active ? <LockOutlined /> : <UnlockOutlined />
                        }
                        disabled={!!rowBusy}
                      >
                        {row.active ? 'Khóa' : 'Mở khóa'}
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </QueryState>
      </section>
      <Modal
        title={
          editor?.account
            ? 'Sửa thông tin sinh viên'
            : 'Cấp tài khoản sinh viên'
        }
        open={!!editor}
        onCancel={() => !busy && setEditor(undefined)}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText="Lưu tài khoản"
        cancelText="Hủy"
        maskClosable={false}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={save}
          disabled={busy}
          requiredMark={false}
        >
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[
                {
                  required: true,
                },
                {
                  pattern: /^[a-z0-9][a-z0-9._-]{2,79}$/,
                  message: 'Dùng 3–80 ký tự thường, số, dấu . _ -.',
                },
              ]}
              normalize={(v: string) => v.trim().toLowerCase()}
            >
              <Input disabled={!!editor?.account} autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="studentCode"
              label="Mã sinh viên"
              normalize={(v: string) => v.trim().toUpperCase()}
              rules={[
                {
                  required: true,
                },
                {
                  pattern: /^[A-Z0-9_-]{2,40}$/,
                  message: 'MSSV gồm 2–40 ký tự chữ, số, _ hoặc -.',
                },
              ]}
            >
              <Input disabled={!!editor?.account} />
            </Form.Item>
          </div>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[
              {
                required: true,
                whitespace: true,
              },
              {
                min: 2,
                max: 200,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email nhận tài khoản"
            rules={[
              {
                required: true,
              },
              {
                type: 'email',
              },
              {
                max: 254,
              },
            ]}
          >
            <Input type="email" />
          </Form.Item>
          {!editor?.account && (
            <Alert
              showIcon
              type="info"
              title="Hệ thống sẽ cấp mật khẩu ngẫu nhiên."
              description="Website, tên đăng nhập và mật khẩu tạm được gửi tự động tới email sinh viên. Sinh viên cần đổi mật khẩu ở lần đăng nhập đầu tiên."
            />
          )}
          {error && (
            <Alert className="mt-4" showIcon type="error" title={error} />
          )}
        </Form>
      </Modal>
    </>
  );
}
