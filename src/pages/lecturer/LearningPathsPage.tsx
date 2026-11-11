import AllSelect from '../../components/AllSelect';
import RichTextEditor from '../../components/RichTextEditor';
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
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import {
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReadOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api, errorMessage, get } from '../../lib/api';
import type { LearningPath, Page } from '../../lib/types';
import { PageHeading, QueryState } from '../../components/common';
import { levels } from '../../lib/learning';
type Fields = {
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  objectivesText?: string;
  prerequisites?: string;
  level: LearningPath['level'];
  coverUrl?: string;
  published: boolean;
};
export default function LecturerLearningPathsPage() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState('false');
  const [published, setPublished] = useState<string>();
  const [editor, setEditor] = useState<{
    path?: LearningPath;
  }>();
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [error, setError] = useState('');
  const [form] = Form.useForm<Fields>();
  const paths = useQuery({
    queryKey: ['lecturer', 'learning-paths', page, search, archived, published],
    queryFn: ({ signal }) =>
      get<Page<LearningPath>>(
        '/lecturer/learning-paths',
        {
          page,
          limit: 10,
          search: search || undefined,
          archived,
          published,
        },
        signal,
      ),
  });
  function open(path?: LearningPath) {
    form.resetFields();
    form.setFieldsValue(
      path
        ? {
            ...path,
            objectivesText: path.objectives.join('\n'),
          }
        : {
            level: 'beginner',
            published: false,
          },
    );
    setEditor({
      path,
    });
    setError('');
  }
  async function save(values: Fields) {
    setBusy(true);
    setError('');
    try {
      const { objectivesText, coverUrl, ...rest } = values;
      const payload = {
        ...rest,
        title: values.title.trim(),
        slug: values.slug.trim().toLowerCase(),
        objectives: [
          ...new Set(
            (objectivesText ?? '')
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ],
        ...(coverUrl?.trim()
          ? {
              coverUrl: coverUrl.trim(),
            }
          : {}),
      };
      if (editor?.path)
        await api.patch(`/lecturer/learning-paths/${editor.path._id}`, payload);
      else await api.post('/lecturer/learning-paths', payload);
      await client.invalidateQueries({
        queryKey: ['lecturer', 'learning-paths'],
      });
      await client.invalidateQueries({
        queryKey: ['student'],
      });
      await client.invalidateQueries({
        queryKey: ['lecturer', 'learning-path-options'],
      });
      setEditor(undefined);
      void message.success('Đã lưu lộ trình.');
    } catch (err) {
      setError(errorMessage(err));
      void message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function archive(path: LearningPath) {
    setRowBusy(path._id);
    try {
      await api.patch(`/lecturer/learning-paths/${path._id}/archive`, {
        archived: !path.archived,
      });
      await client.invalidateQueries({
        queryKey: ['lecturer', 'learning-paths'],
      });
      await client.invalidateQueries({
        queryKey: ['student'],
      });
      await client.invalidateQueries({
        queryKey: ['lecturer', 'learning-path-options'],
      });
      void message.success(
        path.archived ? 'Đã khôi phục lộ trình.' : 'Đã lưu trữ lộ trình.',
      );
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setRowBusy('');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CHUYÊN NGÀNH CNTT"
        title="Lộ trình học"
        extra={
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => open()}
          >
            Tạo lộ trình
          </Button>
        }
      />
      <section className="surface">
        <div className="table-toolbar">
          <Input.Search
            className="max-w-sm"
            placeholder="Tìm lộ trình…"
            aria-label="Tìm lộ trình giảng dạy"
            allowClear
            onSearch={(v) => {
              setSearch(v.trim());
              setPage(1);
            }}
          />
          <div className="flex flex-wrap gap-3">
            <Select
              aria-label="Lọc lưu trữ lộ trình"
              value={archived}
              className="w-40"
              options={[
                {
                  value: 'false',
                  label: 'Đang sử dụng',
                },
                {
                  value: 'true',
                  label: 'Đã lưu trữ',
                },
                {
                  value: 'all',
                  label: 'Tất cả',
                },
              ]}
              onChange={(v) => {
                setArchived(v);
                setPage(1);
              }}
            />
            <AllSelect
              aria-label="Lọc công bố lộ trình"
              value={published}
              className="w-44"
              allowClear
              allLabel="Tất cả công bố"
              options={[
                {
                  value: 'true',
                  label: 'Đã công bố',
                },
                {
                  value: 'false',
                  label: 'Bản nháp',
                },
              ]}
              onChange={(v?: string) => {
                setPublished(v);
                setPage(1);
              }}
            />
          </div>
        </div>
        <QueryState
          pending={paths.isPending}
          error={paths.error}
          retry={() => void paths.refetch()}
        >
          <Table<LearningPath>
            rowKey="_id"
            dataSource={paths.data?.items}
            scroll={{
              x: 850,
            }}
            pagination={{
              current: page,
              pageSize: 10,
              total: paths.data?.total,
              showSizeChanger: false,
              onChange: setPage,
            }}
            columns={[
              {
                title: 'LỘ TRÌNH',
                key: 'title',
                render: (_, p) => (
                  <>
                    <Link
                      to={`/lecturer/learning-paths/${p._id}`}
                      className="font-semibold"
                    >
                      {p.title}
                    </Link>
                    <p className="mt-1 max-w-md truncate text-xs text-muted">
                      {p.summary || p.slug}
                    </p>
                  </>
                ),
              },
              {
                title: 'CẤP ĐỘ',
                key: 'level',
                render: (_, p) => levels[p.level],
              },
              {
                title: 'TRẠNG THÁI',
                key: 'status',
                render: (_, p) => (
                  <Tag
                    color={
                      p.archived ? 'default' : p.published ? 'green' : 'orange'
                    }
                  >
                    {p.archived
                      ? 'Lưu trữ'
                      : p.published
                        ? 'Đã công bố'
                        : 'Bản nháp'}
                  </Tag>
                ),
              },
              {
                title: 'THAO TÁC',
                key: 'actions',
                render: (_, p) => (
                  <Space wrap>
                    <Link to={`/lecturer/learning-paths/${p._id}`}>
                      <Button size="small" icon={<ReadOutlined />}>
                        Nội dung & ghi danh
                      </Button>
                    </Link>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => open(p)}
                    >
                      Sửa
                    </Button>
                    <Popconfirm
                      title={
                        p.archived
                          ? 'Khôi phục lộ trình?'
                          : 'Ẩn lộ trình khỏi trang sinh viên?'
                      }
                      onConfirm={() => archive(p)}
                    >
                      <Button
                        size="small"
                        icon={p.archived ? <UndoOutlined /> : <InboxOutlined />}
                        loading={rowBusy === p._id}
                        disabled={!!rowBusy}
                      >
                        {p.archived ? 'Khôi phục' : 'Lưu trữ'}
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
        title={editor?.path ? 'Cập nhật lộ trình' : 'Tạo lộ trình'}
        open={!!editor}
        width={760}
        onCancel={() => !busy && setEditor(undefined)}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText="Lưu lộ trình"
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
          <Form.Item
            name="title"
            label="Tên lộ trình"
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
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="slug"
              label="Mã đường dẫn"
              normalize={(v: string) => v.trim().toLowerCase()}
              rules={[
                {
                  required: true,
                },
                {
                  max: 100,
                },
                {
                  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message: 'Dùng chữ thường không dấu, số và dấu gạch ngang.',
                },
              ]}
            >
              <Input placeholder="lap-trinh-web" />
            </Form.Item>
            <Form.Item
              name="level"
              label="Cấp độ"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Select
                options={Object.entries(levels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="summary"
            label="Tóm tắt"
            rules={[
              {
                max: 1000,
              },
            ]}
          >
            <Input.TextArea rows={2} showCount maxLength={1000} />
          </Form.Item>
          <Form.Item
            name="description"
            label="Giới thiệu lộ trình"
            rules={[
              {
                max: 30000,
              },
            ]}
          >
            <RichTextEditor
              aria-label="Giới thiệu lộ trình"
              maxLength={30000}
            />
          </Form.Item>
          <Form.Item
            name="objectivesText"
            label="Mục tiêu học tập"
            extra="Mỗi mục tiêu một dòng, tối đa 30 mục tiêu."
            rules={[
              {
                validator: (_, value?: string) => {
                  const items = (value ?? '')
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  return items.length <= 30 &&
                    items.every((s) => s.length <= 500)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          'Tối đa 30 mục tiêu, mỗi mục tối đa 500 ký tự.',
                        ),
                      );
                },
              },
            ]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="prerequisites"
            label="Yêu cầu đầu vào"
            rules={[
              {
                max: 5000,
              },
            ]}
          >
            <RichTextEditor aria-label="Yêu cầu đầu vào" maxLength={5000} />
          </Form.Item>
          <Form.Item
            name="coverUrl"
            label="Liên kết ảnh bìa HTTPS"
            rules={[
              {
                type: 'url',
              },
              {
                pattern: /^https:\/\//,
                message: 'Liên kết ảnh cần bắt đầu bằng https://.',
              },
              {
                max: 2048,
              },
              ...(editor?.path?.coverUrl
                ? [
                    {
                      required: true,
                      message:
                        'Nhập liên kết ảnh mới để thay ảnh bìa hiện tại.',
                    },
                  ]
                : []),
            ]}
          >
            <Input type="url" />
          </Form.Item>
          <Form.Item
            name="published"
            label="Công bố cho sinh viên"
            valuePropName="checked"
          >
            <Switch checkedChildren="Công bố" unCheckedChildren="Bản nháp" />
          </Form.Item>
          {error && <Alert type="error" showIcon title={error} />}
        </Form>
      </Modal>
    </>
  );
}
