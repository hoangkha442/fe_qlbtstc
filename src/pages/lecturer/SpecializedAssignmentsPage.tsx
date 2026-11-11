import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Form,
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
  UndoOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { allPages, api, errorMessage, get } from '../../lib/api';
import type {
  LearningPath,
  LearningPathDetail,
  Page,
  SourceAssignment,
} from '../../lib/types';
import { dateTime, dayjs, TIMEZONE, statusOf } from '../../lib/utils';
import { assignmentPayload } from '../../lib/assignments';
import type { AssignmentDraft } from '../../lib/assignments';
import { PageHeading, QueryState, StatusTag } from '../../components/common';
import AllSelect from '../../components/AllSelect';
import AssignmentContentFields from '../../components/AssignmentContentFields';

interface Fields extends AssignmentDraft {
  pathId: string;
  scope: 'path' | 'module' | 'lesson';
  moduleId?: string;
  lessonId?: string;
}
export function SpecializedAssignmentsPanel({
  pathId,
  moduleId,
  lessonId,
}: {
  pathId?: string;
  moduleId?: string;
  lessonId?: string;
}) {
  const { notification } = App.useApp();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [archived, setArchived] = useState('false');
  const [filterPath, setFilterPath] = useState<string>();
  const [editor, setEditor] = useState<{ assignment?: SourceAssignment }>();
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [error, setError] = useState('');
  const [form] = Form.useForm<Fields>();
  const watchedPath = Form.useWatch('pathId', form);
  const selectedPath = pathId ?? watchedPath;
  const scope = Form.useWatch('scope', form) ?? 'path';
  const selectedModule = Form.useWatch('moduleId', form);
  const fixedCreate = !!(moduleId || lessonId) && !editor?.assignment;
  const paths = useQuery({
    queryKey: ['lecturer', 'learning-path-options'],
    queryFn: ({ signal }) =>
      allPages<LearningPath>('/lecturer/learning-paths', {}, signal),
  });
  const detail = useQuery({
    queryKey: ['lecturer', 'learning-paths', 'detail', selectedPath],
    queryFn: ({ signal }) =>
      get<LearningPathDetail>(
        `/lecturer/learning-paths/${selectedPath}`,
        undefined,
        signal,
      ),
    enabled: !!editor && !!selectedPath,
  });
  const list = useQuery({
    queryKey: [
      'lecturer',
      'source-assignments',
      pathId ?? filterPath,
      moduleId,
      lessonId,
      page,
      archived,
    ],
    queryFn: ({ signal }) =>
      get<Page<SourceAssignment>>(
        '/lecturer/specialized/assignments',
        {
          pathId: pathId ?? filterPath,
          moduleId,
          lessonId,
          page,
          limit: 10,
          archived,
        },
        signal,
      ),
  });
  function open(a?: SourceAssignment) {
    form.resetFields();
    form.setFieldsValue({
      pathId: a?.pathId ?? pathId ?? filterPath,
      scope: a
        ? a.lessonId
          ? 'lesson'
          : a.moduleId
            ? 'module'
            : 'path'
        : lessonId
          ? 'lesson'
          : moduleId
            ? 'module'
            : 'path',
      moduleId: a?.moduleId ?? moduleId,
      lessonId: a?.lessonId ?? lessonId,
      title: a?.title,
      instructions: a?.instructions,
      opensAt: a ? dayjs(a.opensAt).tz(TIMEZONE) : dayjs().tz(TIMEZONE),
      dueAt: a
        ? dayjs(a.dueAt).tz(TIMEZONE)
        : dayjs().tz(TIMEZONE).add(7, 'day'),
      allowResubmit: a?.allowResubmit ?? true,
      allowLate: a?.allowLate ?? false,
      manuallyClosed: a?.manuallyClosed ?? false,
    });
    setError('');
    setEditor({ assignment: a });
  }
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({
        queryKey: ['lecturer', 'source-assignments'],
      }),
      client.invalidateQueries({
        queryKey: ['lecturer', 'source-assignment-options'],
      }),
      client.invalidateQueries({
        queryKey: ['lecturer', 'assignment-link-options'],
      }),
      client.invalidateQueries({ queryKey: ['lecturer', 'learning-paths'] }),
      client.invalidateQueries({ queryKey: ['student'] }),
    ]);
  }
  async function save(values: Fields) {
    setBusy(true);
    setError('');
    try {
      const content = assignmentPayload(values);
      const placement =
        values.scope === 'lesson'
          ? { moduleId: values.moduleId, lessonId: values.lessonId }
          : values.scope === 'module'
            ? { moduleId: values.moduleId }
            : {};
      if (editor?.assignment)
        await api.patch(
          `/lecturer/specialized/assignments/${editor.assignment._id}`,
          {
            ...content,
            ...placement,
            ...(values.scope === 'path' ? { removePlacement: true } : {}),
          },
        );
      else if (lessonId)
        await api.post(`/lecturer/lessons/${lessonId}/assignments`, content);
      else if (moduleId)
        await api.post(
          `/lecturer/learning-modules/${moduleId}/assignments`,
          content,
        );
      else
        await api.post(
          `/lecturer/learning-paths/${pathId ?? values.pathId}/assignments`,
          { ...content, ...placement },
        );
      setEditor(undefined);
      await refresh();
      notification.success({ title: 'Đã lưu bài tập mã nguồn' });
    } catch (err) {
      const description = errorMessage(err);
      setError(description);
      notification.error({ title: 'Chưa lưu được bài tập', description });
    } finally {
      setBusy(false);
    }
  }
  async function archive(a: SourceAssignment) {
    setRowBusy(a._id);
    try {
      await api.patch(`/lecturer/specialized/assignments/${a._id}/archive`, {
        archived: !a.archived,
      });
      await refresh();
      notification.success({
        title: a.archived ? 'Đã khôi phục bài tập' : 'Đã lưu trữ bài tập',
      });
    } catch (err) {
      notification.error({
        title: 'Chưa cập nhật được bài tập',
        description: errorMessage(err),
      });
    } finally {
      setRowBusy('');
    }
  }
  const title = lessonId
    ? 'Bài tập của bài học'
    : moduleId
      ? 'Bài tập trong chương'
      : 'Bài tập mã nguồn';
  const action = (
    <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>
      Tạo bài tập ZIP
    </Button>
  );
  const modules =
    detail.data?.modules.filter((module) => !module.archived) ?? [];
  return (
    <>
      {pathId ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2>{title}</h2>
          {action}
        </div>
      ) : (
        <PageHeading
          title={title}
          description="Tạo bài tập cho lộ trình, chương hoặc từng bài học."
          extra={action}
        />
      )}
      <section className="surface">
        <div className="table-toolbar">
          <Space wrap>
            {!pathId && (
              <AllSelect
                allLabel="Tất cả lộ trình"
                aria-label="Lọc bài tập theo lộ trình"
                className="w-64"
                showSearch
                optionFilterProp="label"
                value={filterPath}
                options={paths.data?.map((path) => ({
                  value: path._id,
                  label: path.title,
                }))}
                onChange={(value) => {
                  setFilterPath(value);
                  setPage(1);
                }}
              />
            )}
            <Select
              aria-label="Lọc bài tập lưu trữ"
              className="w-44"
              value={archived}
              options={[
                { value: 'false', label: 'Đang sử dụng' },
                { value: 'true', label: 'Đã lưu trữ' },
                { value: 'all', label: 'Tất cả trạng thái' },
              ]}
              onChange={(value) => {
                setArchived(value);
                setPage(1);
              }}
            />
          </Space>
          <Tag color="blue">1 ZIP · Tối đa 10 MB</Tag>
        </div>
        <QueryState
          pending={list.isPending}
          error={list.error || paths.error}
          retry={() => {
            void list.refetch();
            void paths.refetch();
          }}
        >
          <Table<SourceAssignment>
            rowKey="_id"
            dataSource={list.data?.items}
            scroll={{ x: 820 }}
            pagination={{
              current: page,
              pageSize: 10,
              total: list.data?.total,
              onChange: setPage,
              showSizeChanger: false,
            }}
            columns={[
              {
                title: 'BÀI TẬP',
                key: 'title',
                render: (_, a) => (
                  <>
                    <strong>{a.title}</strong>
                    <p className="mt-1 text-sm text-muted">
                      {paths.data?.find((path) => path._id === a.pathId)?.title}
                    </p>
                  </>
                ),
              },
              {
                title: 'LIÊN KẾT',
                key: 'scope',
                render: (_, a) => (
                  <Tag
                    color={
                      a.lessonId ? 'purple' : a.moduleId ? 'blue' : 'default'
                    }
                  >
                    {a.lessonId
                      ? 'Bài học'
                      : a.moduleId
                        ? 'Chương'
                        : 'Lộ trình'}
                  </Tag>
                ),
              },
              {
                title: 'HẠN NỘP',
                key: 'due',
                render: (_, a) => dateTime(a.dueAt),
              },
              {
                title: 'TRẠNG THÁI',
                key: 'status',
                render: (_, a) => <StatusTag status={statusOf(a)} />,
              },
              {
                title: 'THAO TÁC',
                key: 'actions',
                render: (_, a) => (
                  <Space wrap>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => open(a)}
                    >
                      Sửa
                    </Button>
                    <Link
                      to={`/lecturer/specialized-submissions?assignmentId=${a._id}`}
                    >
                      <Button size="small">Bài nộp</Button>
                    </Link>
                    <Popconfirm
                      title={
                        a.archived ? 'Khôi phục bài tập?' : 'Lưu trữ bài tập?'
                      }
                      onConfirm={() => archive(a)}
                    >
                      <Button
                        size="small"
                        loading={rowBusy === a._id}
                        disabled={!!rowBusy}
                        icon={a.archived ? <UndoOutlined /> : <InboxOutlined />}
                      >
                        {a.archived ? 'Khôi phục' : 'Lưu trữ'}
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
          editor?.assignment
            ? 'Cập nhật bài tập mã nguồn'
            : 'Tạo bài tập mã nguồn'
        }
        open={!!editor}
        onCancel={() => !busy && setEditor(undefined)}
        width={760}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText="Lưu bài tập"
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
          {!pathId && (
            <Form.Item
              name="pathId"
              label="Lộ trình"
              rules={[{ required: true }]}
            >
              <Select
                placeholder="Chọn lộ trình"
                disabled={!!editor?.assignment}
                showSearch
                optionFilterProp="label"
                loading={paths.isFetching}
                options={paths.data?.map((path) => ({
                  value: path._id,
                  label: path.title,
                }))}
                onChange={() =>
                  form.setFieldsValue({
                    scope: 'path',
                    moduleId: undefined,
                    lessonId: undefined,
                  })
                }
              />
            </Form.Item>
          )}
          {!fixedCreate && (
            <>
              <Form.Item
                name="scope"
                label="Liên kết bài tập với"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Chọn cấp liên kết"
                  options={[
                    { value: 'path', label: 'Lộ trình' },
                    { value: 'module', label: 'Chương' },
                    { value: 'lesson', label: 'Bài học' },
                  ]}
                />
              </Form.Item>
              {scope !== 'path' && (
                <Form.Item
                  name="moduleId"
                  label="Chương học"
                  rules={[{ required: true }]}
                >
                  <Select
                    placeholder="Chọn chương học"
                    showSearch
                    optionFilterProp="label"
                    disabled={!selectedPath}
                    loading={detail.isFetching}
                    options={modules.map((module) => ({
                      value: module._id,
                      label: `${module.title}${module.published ? '' : ' · Bản nháp'}`,
                    }))}
                    onChange={() => form.setFieldValue('lessonId', undefined)}
                  />
                </Form.Item>
              )}
              {scope === 'lesson' && (
                <Form.Item
                  name="lessonId"
                  label="Bài học"
                  rules={[{ required: true }]}
                >
                  <Select
                    placeholder="Chọn bài học trong chương"
                    showSearch
                    optionFilterProp="label"
                    disabled={!selectedModule}
                    options={modules
                      .find((module) => module._id === selectedModule)
                      ?.lessons.filter((lesson) => !lesson.archived)
                      .map((lesson) => ({
                        value: lesson._id,
                        label: `${lesson.title}${lesson.published ? '' : ' · Bản nháp'}`,
                      }))}
                  />
                </Form.Item>
              )}
            </>
          )}
          {detail.error && (
            <Alert
              className="mb-5"
              type="error"
              showIcon
              title="Chưa tải được chương và bài học"
              description={errorMessage(detail.error)}
              action={
                <Button onClick={() => void detail.refetch()}>Thử lại</Button>
              }
            />
          )}
          <AssignmentContentFields />
          <Alert
            showIcon
            type="info"
            title="Nộp ZIP mã nguồn"
            description="Chỉ sinh viên được ghi danh mới có thể nộp bài. Chương/bài học liên quan phải được công bố."
          />
          {error && (
            <Alert className="mt-4" type="error" showIcon title={error} />
          )}
        </Form>
      </Modal>
    </>
  );
}
export default function SpecializedAssignmentsPage() {
  return <SpecializedAssignmentsPanel />;
}
