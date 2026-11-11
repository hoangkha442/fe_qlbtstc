import AllSelect from '../../components/AllSelect';
import RichTextEditor from '../../components/RichTextEditor';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tooltip,
} from 'antd';
import {
  CopyOutlined,
  EditOutlined,
  FileDoneOutlined,
  InboxOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import type { Dayjs } from 'dayjs';
import { allPages, api, errorMessage, get } from '../../lib/api';
import type { Assignment, CourseSection, Page } from '../../lib/types';
import {
  dateTime,
  dayjs,
  formatBytes,
  refName,
  statusOf,
  TIMEZONE,
} from '../../lib/utils';
import { PageHeading, QueryState, StatusTag } from '../../components/common';
export default function AssignmentsPage() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sectionId, setSectionId] = useState<string>();
  const [archived, setArchived] = useState('false');
  const [rowBusy, setRowBusy] = useState('');
  const editorId = params.get('edit') || undefined;
  const open = params.has('create') || !!editorId;
  const sections = useQuery({
    queryKey: ['lecturer', 'all-sections'],
    queryFn: ({ signal }) =>
      allPages<CourseSection>(
        '/lecturer/course-sections',
        {
          archived: 'all',
        },
        signal,
      ),
  });
  const list = useQuery({
    queryKey: ['lecturer', 'assignments', page, search, sectionId, archived],
    queryFn: ({ signal }) =>
      get<Page<Assignment>>(
        '/lecturer/assignments',
        {
          page,
          limit: 10,
          search: search || undefined,
          courseSectionId: sectionId,
          archived,
        },
        signal,
      ),
  });
  function editor(id?: string) {
    const next = new URLSearchParams(params);
    next.delete('edit');
    next.delete('create');
    next.set(id ? 'edit' : 'create', id ?? '1');
    setParams(next);
  }
  function close() {
    const next = new URLSearchParams(params);
    next.delete('edit');
    next.delete('create');
    setParams(next, {
      replace: true,
    });
  }
  async function update(
    a: Assignment,
    payload: Record<string, unknown>,
    archive = false,
  ) {
    setRowBusy(a._id);
    try {
      await api.patch(
        `/lecturer/assignments/${a._id}${archive ? '/archive' : ''}`,
        payload,
      );
      await client.invalidateQueries({
        queryKey: ['lecturer'],
      });
      await client.invalidateQueries({
        queryKey: ['public'],
      });
      void message.success('Đã cập nhật bài tập.');
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setRowBusy('');
    }
  }
  async function copy(a: Assignment) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/assignments/${a._id}`,
      );
      void message.success('Đã sao chép đường dẫn nộp bài.');
    } catch {
      void message.error(
        'Chưa sao chép được. Hãy mở trang nộp bài và sao chép đường dẫn trên trình duyệt.',
      );
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="BÀI TẬP & BÀI NỘP"
        title="Bài tập"
        description="Tạo nơi nộp bài, đặt thời hạn và chia sẻ liên kết cho sinh viên."
        extra={
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => editor()}
          >
            Tạo bài tập
          </Button>
        }
      />
      {sections.error && (
        <Alert
          className="mb-5"
          type="error"
          title={errorMessage(sections.error)}
          showIcon
          action={
            <Button onClick={() => void sections.refetch()}>Thử lại</Button>
          }
        />
      )}
      <section className="surface">
        <div className="table-toolbar">
          <Input.Search
            className="max-w-xs"
            allowClear
            placeholder="Tìm tên bài tập…"
            aria-label="Tìm bài tập"
            onSearch={(value) => {
              setSearch(value.trim());
              setPage(1);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <AllSelect
              className="w-56"
              allowClear
              showSearch
              optionFilterProp="label"
              aria-label="Lọc lớp học phần"
              allLabel="Tất cả học phần"
              value={sectionId}
              loading={sections.isFetching}
              options={sections.data?.map((s) => ({
                value: s._id,
                label: `${s.code} · ${s.name}`,
              }))}
              onChange={(value?: string) => {
                setSectionId(value);
                setPage(1);
              }}
            />
            <Select
              className="w-36"
              aria-label="Lọc lưu trữ"
              value={archived}
              options={[
                {
                  value: 'false',
                  label: 'Chưa lưu trữ',
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
              onChange={(value) => {
                setArchived(value);
                setPage(1);
              }}
            />
            <Button
              aria-label="Làm mới bài tập"
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
          <Table<Assignment>
            rowKey="_id"
            dataSource={list.data?.items}
            scroll={{
              x: 1080,
            }}
            pagination={{
              current: page,
              pageSize: 10,
              total: list.data?.total,
              showSizeChanger: false,
              showTotal: (total) => `${total} bài tập`,
              onChange: setPage,
            }}
            columns={[
              {
                title: 'BÀI TẬP',
                key: 'title',
                width: 300,
                render: (_, a) => (
                  <div>
                    <button
                      className="table-title-link"
                      onClick={() => editor(a._id)}
                    >
                      {a.title}
                    </button>
                    <div className="mt-2 text-xs text-muted">
                      {sections.data?.find((s) => s._id === a.courseSectionId)
                        ?.code ?? 'Lớp học phần'}
                      {a.archived && ' · Đã lưu trữ'}
                    </div>
                  </div>
                ),
              },
              {
                title: 'THỜI GIAN NHẬN BÀI',
                key: 'time',
                width: 235,
                render: (_, a) => (
                  <div className="text-sm">
                    <span className="text-muted">Mở: </span>
                    {dateTime(a.opensAt)}
                    <div className="mt-2">
                      <span className="text-muted">Hạn: </span>
                      <strong>{dateTime(a.dueAt)}</strong>
                    </div>
                  </div>
                ),
              },
              {
                title: 'TRẠNG THÁI',
                key: 'status',
                width: 190,
                render: (_, a) => <StatusTag status={statusOf(a)} />,
              },
              {
                title: 'QUY ĐỊNH FILE',
                key: 'files',
                width: 170,
                render: (_, a) => (
                  <div className="text-sm">
                    {a.maxFiles} file · {formatBytes(a.maxFileBytes)}
                    <div className="mt-2 text-xs text-muted">
                      {a.allowedExtensions.map((e) => `.${e}`).join(', ')}
                    </div>
                  </div>
                ),
              },
              {
                title: 'THAO TÁC',
                key: 'actions',
                width: 185,
                fixed: 'right',
                render: (_, a) => (
                  <div className="flex gap-2">
                    <Tooltip title="Sao chép liên kết">
                      <Button
                        aria-label={`Sao chép liên kết ${a.title}`}
                        icon={<CopyOutlined />}
                        onClick={() => void copy(a)}
                      />
                    </Tooltip>
                    <Link to={`/lecturer/submissions?assignmentId=${a._id}`}>
                      <Tooltip title="Xem bài nộp">
                        <Button
                          aria-label={`Xem bài nộp ${a.title}`}
                          icon={<FileDoneOutlined />}
                        />
                      </Tooltip>
                    </Link>
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: [
                          {
                            key: 'edit',
                            label: 'Chỉnh sửa',
                            icon: <EditOutlined />,
                          },
                          {
                            key: 'toggle',
                            label: a.manuallyClosed
                              ? 'Mở nhận bài thủ công'
                              : 'Đóng nhận bài thủ công',
                          },
                        ],
                        onClick: ({ key }) => {
                          if (key === 'edit') editor(a._id);
                          if (key === 'toggle')
                            void update(a, {
                              manuallyClosed: !a.manuallyClosed,
                            });
                        },
                      }}
                    >
                      <Button
                        aria-label={`Thao tác khác ${a.title}`}
                        icon={<MoreOutlined />}
                        loading={rowBusy === a._id}
                      />
                    </Dropdown>
                    <Popconfirm
                      title={
                        a.archived ? 'Khôi phục bài tập?' : 'Lưu trữ bài tập?'
                      }
                      description="Bài nộp và lịch sử được giữ nguyên."
                      okText="Xác nhận"
                      cancelText="Hủy"
                      onConfirm={() =>
                        update(
                          a,
                          {
                            archived: !a.archived,
                          },
                          true,
                        )
                      }
                    >
                      <Button
                        aria-label={
                          a.archived ? 'Khôi phục bài tập' : 'Lưu trữ bài tập'
                        }
                        icon={<InboxOutlined />}
                      />
                    </Popconfirm>
                  </div>
                ),
              },
            ]}
            locale={{
              emptyText: 'Chưa có bài tập trong lựa chọn này.',
            }}
          />
        </QueryState>
      </section>
      {open && (
        <AssignmentEditor
          id={editorId}
          key={editorId ?? 'new'}
          sections={sections.data ?? []}
          onClose={close}
        />
      )}
    </>
  );
}
interface EditorFields {
  courseSectionId: string;
  title: string;
  instructions: string;
  opensAt: Dayjs;
  dueAt: Dayjs;
  manuallyClosed: boolean;
  allowLate: boolean;
  allowResubmit: boolean;
  allowedExtensions: string[];
  maxFiles: number;
  maxFileMB: number;
}
function AssignmentEditor({
  id,
  sections,
  onClose,
}: {
  id?: string;
  sections: CourseSection[];
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [form] = Form.useForm<EditorFields>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const detail = useQuery({
    queryKey: ['lecturer', 'assignment', id],
    queryFn: ({ signal }) =>
      get<Assignment>(`/lecturer/assignments/${id}`, undefined, signal),
    enabled: !!id,
  });
  useEffect(() => {
    if (detail.data) {
      const a = detail.data;
      form.setFieldsValue({
        ...a,
        opensAt: dayjs(a.opensAt).tz(TIMEZONE),
        dueAt: dayjs(a.dueAt).tz(TIMEZONE),
        maxFileMB: a.maxFileBytes / 1024 / 1024,
      });
    }
  }, [detail.data, form]);
  async function save(values: EditorFields) {
    setBusy(true);
    setError('');
    const { maxFileMB, ...rest } = values;
    const payload = {
      ...rest,
      opensAt: `${values.opensAt.format('YYYY-MM-DDTHH:mm:ss')}+07:00`,
      dueAt: `${values.dueAt.format('YYYY-MM-DDTHH:mm:ss')}+07:00`,
      maxFileBytes: Math.floor(maxFileMB * 1024 * 1024),
    };
    try {
      if (id) await api.patch(`/lecturer/assignments/${id}`, payload);
      else await api.post('/lecturer/assignments', payload);
      await client.invalidateQueries({
        queryKey: ['lecturer'],
      });
      await client.invalidateQueries({
        queryKey: ['public'],
      });
      void message.success(
        id
          ? 'Đã cập nhật bài tập.'
          : 'Đã tạo bài tập. Bạn có thể chia sẻ liên kết ngay.',
      );
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      void message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const options = sections
    .filter((s) => !s.archived || s._id === detail.data?.courseSectionId)
    .map((s) => ({
      value: s._id,
      label: `${s.code} · ${refName(s.subjectId)} · ${refName(s.classId)}`,
    }));
  return (
    <Drawer
      title={id ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}
      open
      onClose={() => !busy && onClose()}
      size={720}
      footer={
        <div className="flex justify-end gap-3">
          <Button disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="primary"
            loading={busy}
            disabled={!!id && !detail.data}
            onClick={() => form.submit()}
          >
            Lưu bài tập
          </Button>
        </div>
      }
    >
      <QueryState
        pending={!!id && detail.isPending}
        error={detail.error}
        retry={() => void detail.refetch()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={save}
          disabled={busy}
          initialValues={{
            manuallyClosed: false,
            allowLate: false,
            allowResubmit: false,
            allowedExtensions: ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'],
            maxFiles: 5,
            maxFileMB: 10,
            opensAt: dayjs().tz(TIMEZONE),
            dueAt: dayjs().tz(TIMEZONE).add(7, 'day'),
          }}
        >
          <Form.Item
            label="Lớp học phần"
            name="courseSectionId"
            rules={[
              {
                required: true,
                message: 'Chọn lớp học phần.',
              },
            ]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              disabled={!!id}
              placeholder="Chọn lớp học phần"
              options={options}
            />
          </Form.Item>
          <Form.Item
            label="Tiêu đề bài tập"
            name="title"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Nhập tiêu đề bài tập.',
              },
              {
                max: 200,
                message: 'Tiêu đề tối đa 200 ký tự.',
              },
            ]}
          >
            <Input placeholder="Ví dụ: Bài thực hành Excel số 1" />
          </Form.Item>
          <Form.Item
            label="Nội dung hướng dẫn"
            name="instructions"
            rules={[
              {
                max: 20000,
                message: 'Hướng dẫn tối đa 20.000 ký tự.',
              },
            ]}
          >
            <RichTextEditor
              aria-label="Nội dung hướng dẫn"
              maxLength={20000}
              placeholder="Yêu cầu bài tập, cách đặt tên file và các lưu ý cho sinh viên…"
            />
          </Form.Item>
          <div className="grid gap-x-5 sm:grid-cols-2">
            <Form.Item
              label="Mở nhận bài (giờ Việt Nam)"
              name="opensAt"
              rules={[
                {
                  required: true,
                  message: 'Chọn thời gian mở.',
                },
              ]}
            >
              <DatePicker
                className="w-full"
                showTime
                format="DD/MM/YYYY HH:mm"
              />
            </Form.Item>
            <Form.Item
              label="Hạn nộp (giờ Việt Nam)"
              name="dueAt"
              dependencies={['opensAt']}
              rules={[
                {
                  required: true,
                  message: 'Chọn hạn nộp.',
                },
                ({ getFieldValue }) => ({
                  validator: (_, value: Dayjs) =>
                    !value ||
                    !getFieldValue('opensAt') ||
                    value.isAfter(getFieldValue('opensAt'))
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error('Hạn nộp phải sau thời gian mở.'),
                        ),
                }),
              ]}
            >
              <DatePicker
                className="w-full"
                showTime
                format="DD/MM/YYYY HH:mm"
              />
            </Form.Item>
          </div>
          <div className="assignment-switches">
            {[
              {
                name: 'manuallyClosed',
                title: 'Đóng nhận bài thủ công',
                text: 'Tạm dừng nhận bài, không phụ thuộc thời hạn.',
              },
              {
                name: 'allowLate',
                title: 'Cho phép nộp trễ',
                text: 'Tiếp tục nhận bài sau hạn và đánh dấu trễ hạn.',
              },
              {
                name: 'allowResubmit',
                title: 'Cho phép nộp lại',
                text: 'Sinh viên cần mã bí mật từ lần nộp đầu tiên.',
              },
            ].map((s) => (
              <div className="switch-row" key={s.name}>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </div>
                <Form.Item name={s.name} valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
            ))}
          </div>
          <h3 className="mt-7 mb-5">Quy định file</h3>
          <Form.Item
            label="Định dạng được chấp nhận"
            name="allowedExtensions"
            rules={[
              {
                required: true,
                type: 'array',
                min: 1,
                message: 'Chọn ít nhất một định dạng.',
              },
            ]}
          >
            <Checkbox.Group
              options={['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].map(
                (e) => ({
                  label: `.${e}`,
                  value: e,
                }),
              )}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-5">
            <Form.Item
              label="Số file tối đa"
              name="maxFiles"
              rules={[
                {
                  required: true,
                  type: 'integer',
                  min: 1,
                  max: 5,
                  message: 'Chọn từ 1 đến 5 file.',
                },
              ]}
            >
              <InputNumber className="w-full" min={1} max={5} />
            </Form.Item>
            <Form.Item
              label="Dung lượng mỗi file (MB)"
              name="maxFileMB"
              rules={[
                {
                  required: true,
                  type: 'number',
                  min: 0.001,
                  max: 10,
                  message: 'Dung lượng từ 0,001 đến 10 MB.',
                },
              ]}
            >
              <InputNumber
                className="w-full"
                min={0.001}
                max={10}
                precision={3}
              />
            </Form.Item>
          </div>
          {error && <Alert type="error" showIcon title={error} />}
        </Form>
      </QueryState>
    </Drawer>
  );
}
