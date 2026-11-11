import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import {
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Navigate, useParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { allPages, api, errorMessage, get } from '../../lib/api';
import type {
  AcademicEntity,
  Catalog,
  CourseSection,
  Page,
  Resource,
  Semester,
} from '../../lib/types';
import { refId, refName } from '../../lib/utils';
import { PageHeading, QueryState } from '../../components/common';

const definitions: Record<
  Resource,
  { title: string; singular: string; description: string; codeLabel?: string }
> = {
  semesters: {
    title: 'Học kỳ',
    singular: 'học kỳ',
    description: 'Tổ chức các học kỳ và năm học trong không gian giảng dạy.',
  },
  subjects: {
    title: 'Môn học',
    singular: 'môn học',
    description: 'Quản lý danh mục môn học mà bạn giảng dạy.',
    codeLabel: 'Mã môn học',
  },
  classes: {
    title: 'Lớp',
    singular: 'lớp',
    description: 'Quản lý thông tin lớp, không cần tạo danh sách sinh viên.',
    codeLabel: 'Mã lớp',
  },
  'course-sections': {
    title: 'Lớp học phần',
    singular: 'lớp học phần',
    description: 'Kết nối học kỳ, môn học và lớp để tổ chức bài tập.',
    codeLabel: 'Mã lớp học phần',
  },
};
type Fields = {
  name: string;
  code?: string;
  academicYear?: string;
  semesterId?: string;
  subjectId?: string;
  classId?: string;
};
export default function ResourcesPage() {
  const { resource = '' } = useParams();
  if (!(resource in definitions))
    return <Navigate to="/lecturer/not-found" replace />;
  return <ResourceView key={resource} resource={resource as Resource} />;
}
function ResourceView({ resource }: { resource: Resource }) {
  const def = definitions[resource];
  const { message } = App.useApp();
  const client = useQueryClient();
  const [form] = Form.useForm<Fields>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState('false');
  const [editor, setEditor] = useState<{ item?: AcademicEntity }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rowBusy, setRowBusy] = useState('');
  const list = useQuery({
    queryKey: ['lecturer', resource, page, search, archived],
    queryFn: ({ signal }) =>
      get<Page<AcademicEntity>>(
        `/lecturer/${resource}`,
        { page, limit: 10, search: search || undefined, archived },
        signal,
      ),
  });
  const loadReferences = !!editor && resource === 'course-sections';
  const semesters = useQuery({
    queryKey: ['lecturer', 'options', 'semesters'],
    queryFn: ({ signal }) =>
      allPages<Semester>('/lecturer/semesters', {}, signal),
    enabled: loadReferences,
  });
  const subjects = useQuery({
    queryKey: ['lecturer', 'options', 'subjects'],
    queryFn: ({ signal }) =>
      allPages<Catalog>('/lecturer/subjects', {}, signal),
    enabled: loadReferences,
  });
  const classes = useQuery({
    queryKey: ['lecturer', 'options', 'classes'],
    queryFn: ({ signal }) => allPages<Catalog>('/lecturer/classes', {}, signal),
    enabled: loadReferences,
  });
  const refError =
    loadReferences && (semesters.error || subjects.error || classes.error);
  function open(item?: AcademicEntity) {
    setEditor({ item });
    setError('');
    form.resetFields();
    if (item)
      form.setFieldsValue({
        name: item.name,
        ...('code' in item ? { code: item.code } : {}),
        ...('academicYear' in item ? { academicYear: item.academicYear } : {}),
        ...('semesterId' in item
          ? {
              semesterId: refId(item.semesterId),
              subjectId: refId(item.subjectId),
              classId: refId(item.classId),
            }
          : {}),
      });
  }
  async function save(values: Fields) {
    setBusy(true);
    setError('');
    const payload = Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value,
        ]),
    );
    try {
      if (editor?.item) {
        if ('semesterId' in editor.item) {
          for (const key of ['semesterId', 'subjectId', 'classId'] as const)
            if (payload[key] === refId(editor.item[key])) delete payload[key];
        }
        await api.patch(`/lecturer/${resource}/${editor.item._id}`, payload);
      } else await api.post(`/lecturer/${resource}`, payload);
      await client.invalidateQueries({ queryKey: ['lecturer'] });
      await client.invalidateQueries({ queryKey: ['public'] });
      void message.success(`Đã lưu ${def.singular}.`);
      setEditor(undefined);
    } catch (err) {
      setError(errorMessage(err));
      void message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function archive(item: AcademicEntity) {
    setRowBusy(item._id);
    try {
      await api.patch(`/lecturer/${resource}/${item._id}/archive`, {
        archived: !item.archived,
      });
      await client.invalidateQueries({ queryKey: ['lecturer'] });
      await client.invalidateQueries({ queryKey: ['public'] });
      void message.success(
        item.archived
          ? 'Đã khôi phục.'
          : 'Đã lưu trữ và giữ nguyên dữ liệu liên quan.',
      );
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setRowBusy('');
    }
  }
  const columns: ColumnsType<AcademicEntity> = [
    {
      title: resource === 'semesters' ? 'HỌC KỲ' : 'TÊN',
      key: 'name',
      render: (_, row) => (
        <div>
          <strong>{row.name}</strong>
          {'code' in row && (
            <div className="mt-1 text-xs text-muted">{row.code}</div>
          )}
        </div>
      ),
    },
    ...(resource === 'semesters'
      ? [
          {
            title: 'NĂM HỌC',
            key: 'year',
            render: (_: unknown, row: AcademicEntity) =>
              'academicYear' in row ? row.academicYear : '—',
          },
        ]
      : []),
    ...(resource === 'course-sections'
      ? [
          {
            title: 'HỌC KỲ',
            key: 'semester',
            render: (_: unknown, row: AcademicEntity) =>
              'semesterId' in row ? (
                <span>
                  {refName(row.semesterId)}
                  <small className="block mt-1 text-muted">
                    {typeof row.semesterId === 'object'
                      ? row.semesterId.academicYear
                      : ''}
                  </small>
                </span>
              ) : (
                '—'
              ),
          },
          {
            title: 'MÔN HỌC / LỚP',
            key: 'references',
            render: (_: unknown, row: AcademicEntity) =>
              'subjectId' in row ? (
                <span>
                  {refName(row.subjectId)}
                  <small className="block mt-1 text-muted">
                    {refName(row.classId)}
                  </small>
                </span>
              ) : (
                '—'
              ),
          },
        ]
      : []),
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'archived',
      width: 160,
      render: (value: boolean) => (
        <Tag color={value ? 'default' : 'green'}>
          {value ? 'Đã lưu trữ' : 'Đang hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <Space>
          <Button
            aria-label={`Sửa ${row.name}`}
            icon={<EditOutlined />}
            onClick={() => open(row)}
          />
          <Popconfirm
            title={
              row.archived
                ? `Khôi phục ${def.singular}?`
                : `Lưu trữ ${def.singular}?`
            }
            description={
              row.archived
                ? 'Đối tượng sẽ hoạt động trở lại khi các liên kết đều khả dụng.'
                : 'Các bài nộp được giữ nguyên. Bài liên quan sẽ ngừng nhận bài.'
            }
            okText={row.archived ? 'Khôi phục' : 'Lưu trữ'}
            cancelText="Hủy"
            onConfirm={() => archive(row)}
          >
            <Button
              aria-label={
                row.archived ? `Khôi phục ${row.name}` : `Lưu trữ ${row.name}`
              }
              loading={rowBusy === row._id}
              icon={row.archived ? <UndoOutlined /> : <InboxOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  function referenceOptions(
    items: (Semester | Catalog)[] | undefined,
    key: 'semesterId' | 'subjectId' | 'classId',
  ) {
    const options = (items ?? []).map((item) => ({
      value: item._id,
      label:
        'academicYear' in item
          ? `${item.name} · ${item.academicYear}`
          : `${item.code} · ${item.name}`,
    }));
    const current =
      editor?.item && 'semesterId' in editor.item
        ? (editor.item as CourseSection)[key]
        : undefined;
    if (current && !options.some((item) => item.value === refId(current)))
      options.push({
        value: refId(current),
        label: `${refName(current)} (liên kết hiện tại)`,
      });
    return options;
  }
  return (
    <>
      <PageHeading
        eyebrow="QUẢN LÝ HỌC TẬP"
        title={def.title}
        description={def.description}
        extra={
          <Button
            size="large"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => open()}
          >
            Thêm {def.singular}
          </Button>
        }
      />
      <section className="surface">
        <div className="table-toolbar">
          <Input.Search
            className="max-w-sm"
            allowClear
            placeholder={`Tìm ${def.singular}…`}
            aria-label={`Tìm ${def.singular}`}
            onSearch={(value) => {
              setSearch(value.trim());
              setPage(1);
            }}
          />
          <div className="flex items-center gap-3">
            <Select
              aria-label="Lọc trạng thái"
              value={archived}
              className="w-40"
              options={[
                { value: 'false', label: 'Đang hoạt động' },
                { value: 'true', label: 'Đã lưu trữ' },
                { value: 'all', label: 'Tất cả trạng thái' },
              ]}
              onChange={(value) => {
                setArchived(value);
                setPage(1);
              }}
            />
            <Button
              aria-label="Làm mới danh sách"
              icon={<ReloadOutlined />}
              onClick={() => void list.refetch()}
            />
          </div>
        </div>
        <QueryState
          pending={list.isPending}
          error={list.error}
          retry={() => void list.refetch()}
        >
          <Table<AcademicEntity>
            rowKey="_id"
            scroll={{ x: resource === 'course-sections' ? 900 : 650 }}
            columns={columns}
            dataSource={list.data?.items}
            pagination={{
              current: page,
              pageSize: 10,
              total: list.data?.total,
              showSizeChanger: false,
              showTotal: (total) => `${total} ${def.singular}`,
              onChange: setPage,
            }}
            locale={{
              emptyText: `Chưa có ${def.singular} trong lựa chọn này.`,
            }}
          />
        </QueryState>
      </section>
      <Modal
        title={`${editor?.item ? 'Chỉnh sửa' : 'Thêm'} ${def.singular}`}
        open={!!editor}
        onCancel={() => !busy && setEditor(undefined)}
        confirmLoading={busy}
        okText="Lưu thông tin"
        cancelText="Hủy"
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={save}
          preserve={false}
          disabled={busy}
        >
          <Form.Item
            label={`Tên ${def.singular}`}
            name="name"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập tên.',
              },
              { max: 200, message: 'Tên tối đa 200 ký tự.' },
            ]}
          >
            <Input
              placeholder={
                resource === 'semesters'
                  ? 'Ví dụ: Học kỳ 1'
                  : `Nhập tên ${def.singular}`
              }
            />
          </Form.Item>
          {resource === 'semesters' ? (
            <Form.Item
              label="Năm học"
              name="academicYear"
              rules={[
                { required: true, message: 'Vui lòng nhập năm học.' },
                {
                  pattern: /^\d{4}-\d{4}$/,
                  message: 'Dùng định dạng 2026-2027.',
                },
                {
                  validator: (_, value: string) =>
                    !value ||
                    Number(value.split('-')[1]) ===
                      Number(value.split('-')[0]) + 1
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error('Năm học gồm hai năm liên tiếp.'),
                        ),
                },
              ]}
            >
              <Input placeholder="2026-2027" />
            </Form.Item>
          ) : (
            <Form.Item
              label={def.codeLabel}
              name="code"
              normalize={(v: string) => v.toUpperCase().trim()}
              rules={[
                { required: true, message: 'Vui lòng nhập mã.' },
                {
                  pattern: /^[A-Z0-9_-]{1,80}$/,
                  message:
                    'Mã gồm chữ không dấu, số, _ hoặc - (tối đa 80 ký tự).',
                },
              ]}
            >
              <Input placeholder="Ví dụ: TH_26TCNTT01_HK1" />
            </Form.Item>
          )}
          {resource === 'course-sections' && (
            <>
              <Form.Item
                label="Học kỳ"
                name="semesterId"
                rules={[{ required: true, message: 'Chọn học kỳ.' }]}
              >
                <Select
                  placeholder="Chọn học kỳ"
                  showSearch
                  optionFilterProp="label"
                  loading={semesters.isFetching}
                  options={referenceOptions(semesters.data, 'semesterId')}
                />
              </Form.Item>
              <Form.Item
                label="Môn học"
                name="subjectId"
                rules={[{ required: true, message: 'Chọn môn học.' }]}
              >
                <Select
                  placeholder="Chọn môn học"
                  showSearch
                  optionFilterProp="label"
                  loading={subjects.isFetching}
                  options={referenceOptions(subjects.data, 'subjectId')}
                />
              </Form.Item>
              <Form.Item
                label="Lớp"
                name="classId"
                rules={[{ required: true, message: 'Chọn lớp.' }]}
              >
                <Select
                  placeholder="Chọn lớp"
                  showSearch
                  optionFilterProp="label"
                  loading={classes.isFetching}
                  options={referenceOptions(classes.data, 'classId')}
                />
              </Form.Item>
              <p className="text-xs leading-6 text-muted">
                Chỉ chọn dữ liệu đang hoạt động. Học phần đã có bài tập cần giữ
                nguyên liên kết học kỳ, môn và lớp.
              </p>
            </>
          )}
          {(error || refError) && (
            <div className="form-error" role="alert">
              {error || errorMessage(refError)}
            </div>
          )}
        </Form>
      </Modal>
    </>
  );
}
