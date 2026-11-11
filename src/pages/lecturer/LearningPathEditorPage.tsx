import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Collapse,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
} from 'antd';
import {
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  UndoOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { api, errorMessage, get } from '../../lib/api';
import type {
  LearningModule,
  LearningPathDetail,
  Lesson,
  LearningResource,
} from '../../lib/types';
import { BackButton, PageHeading, QueryState } from '../../components/common';
import EnrollmentsPanel from '../../components/EnrollmentsPanel';
import { LearningText } from '../../components/LearningContent';
import { duration } from '../../lib/learning';
import { SpecializedAssignmentsPanel } from './SpecializedAssignmentsPage';
import AssignmentAttachments from '../../components/AssignmentAttachments';
import RichTextEditor from '../../components/RichTextEditor';
import { attachmentsPayload } from '../../lib/assignments';
import type { AssignmentAttachmentsDraft } from '../../lib/assignments';

type ModuleFields = AssignmentAttachmentsDraft & {
  title: string;
  description: string;
  order: number;
  published: boolean;
};
type LessonFields = AssignmentAttachmentsDraft & {
  title: string;
  summary: string;
  content: string;
  videoUrl?: string;
  durationSeconds: number;
  resources: LearningResource[];
  isPreview: boolean;
  order: number;
  published: boolean;
};
export default function LearningPathEditorPage() {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const client = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [openModules, setOpenModules] = useState<string[]>();
  const [assignmentScope, setAssignmentScope] = useState<{
    moduleId: string;
    lessonId?: string;
    title: string;
  }>();
  const [moduleEditor, setModuleEditor] = useState<{
    module?: LearningModule;
  }>();
  const [lessonEditor, setLessonEditor] = useState<{
    moduleId: string;
    lesson?: Lesson;
  }>();
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [error, setError] = useState('');
  const [moduleForm] = Form.useForm<ModuleFields>();
  const [lessonForm] = Form.useForm<LessonFields>();
  const content = Form.useWatch('content', lessonForm);
  const path = useQuery({
    queryKey: ['lecturer', 'learning-paths', 'detail', id],
    queryFn: ({ signal }) =>
      get<LearningPathDetail>(
        `/lecturer/learning-paths/${id}`,
        undefined,
        signal,
      ),
  });
  const p = path.data;
  async function refresh() {
    await client.invalidateQueries({
      queryKey: ['lecturer', 'learning-paths'],
    });
    await client.invalidateQueries({ queryKey: ['student'] });
    await client.invalidateQueries({
      queryKey: ['lecturer', 'source-assignments'],
    });
    await client.invalidateQueries({
      queryKey: ['lecturer', 'source-assignment-options'],
    });
    await client.invalidateQueries({
      queryKey: ['lecturer', 'assignment-link-options'],
    });
  }
  function editModule(module?: LearningModule) {
    moduleForm.resetFields();
    moduleForm.setFieldsValue({
      ...(module
        ? {
            title: module.title,
            description: module.description,
            order: module.order,
            published: module.published,
          }
        : {
            order: (p?.modules.length ?? 0) + 1,
            published: false,
            description: '',
          }),
      assignments: [],
      assignmentIds: [],
    });
    setModuleEditor({ module });
    setError('');
  }
  function editLesson(moduleId: string, lesson?: Lesson) {
    lessonForm.resetFields();
    lessonForm.setFieldsValue({
      ...(lesson
        ? {
            title: lesson.title,
            summary: lesson.summary,
            content: lesson.content,
            videoUrl: lesson.videoUrl,
            durationSeconds: lesson.durationSeconds,
            resources: lesson.resources,
            isPreview: lesson.isPreview,
            order: lesson.order,
            published: lesson.published,
          }
        : {
            resources: [],
            order:
              (p?.modules.find((m) => m._id === moduleId)?.lessons.length ??
                0) + 1,
            durationSeconds: 0,
            published: false,
            isPreview: false,
            content: '',
            summary: '',
          }),
      assignments: [],
      assignmentIds: [],
    });
    setLessonEditor({ moduleId, lesson });
    setError('');
  }
  async function saveModule(values: ModuleFields) {
    setBusy(true);
    setError('');
    try {
      const data = {
        ...values,
        ...attachmentsPayload(values),
        title: values.title.trim(),
      };
      if (moduleEditor?.module)
        await api.patch(
          `/lecturer/learning-modules/${moduleEditor.module._id}`,
          data,
        );
      else {
        const created = await api.post<LearningModule>(
          `/lecturer/learning-paths/${id}/modules`,
          data,
        );
        setOpenModules((current) => [
          ...new Set([
            ...(current ?? p?.modules.map((module) => module._id) ?? []),
            created.data._id,
          ]),
        ]);
      }
      await refresh();
      setModuleEditor(undefined);
      void message.success('Đã lưu chương học.');
    } catch (err) {
      setError(errorMessage(err));
      void message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function saveLesson(values: LessonFields) {
    if (!lessonEditor) return;
    setBusy(true);
    setError('');
    try {
      const { videoUrl, ...rest } = values;
      const data = {
        ...rest,
        ...attachmentsPayload(values),
        title: values.title.trim(),
        resources: values.resources ?? [],
        ...(videoUrl?.trim()
          ? { videoUrl: videoUrl.trim() }
          : lessonEditor.lesson?.videoUrl
            ? { removeVideo: true }
            : {}),
      };
      if (lessonEditor.lesson)
        await api.patch(`/lecturer/lessons/${lessonEditor.lesson._id}`, data);
      else
        await api.post(
          `/lecturer/learning-modules/${lessonEditor.moduleId}/lessons`,
          data,
        );
      await refresh();
      setLessonEditor(undefined);
      void message.success('Đã lưu bài học.');
    } catch (err) {
      setError(errorMessage(err));
      void message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function archive(
    item: LearningModule | Lesson,
    kind: 'learning-modules' | 'lessons',
  ) {
    setRowBusy(item._id);
    try {
      await api.patch(`/lecturer/${kind}/${item._id}/archive`, {
        archived: !item.archived,
      });
      await refresh();
      void message.success(
        item.archived ? 'Đã khôi phục nội dung.' : 'Đã lưu trữ nội dung.',
      );
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setRowBusy('');
    }
  }
  const visibleModules =
    p?.modules.filter((m) => showArchived || !m.archived) ?? [];
  return (
    <>
      <BackButton to="/lecturer/learning-paths" />
      <QueryState
        pending={path.isPending}
        error={path.error}
        retry={() => void path.refetch()}
      >
        {p && (
          <>
            <PageHeading
              eyebrow="QUẢN LÝ LỘ TRÌNH"
              title={p.title}
              description={p.summary || undefined}
              extra={
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
              }
            />
            {(p.archived || !p.published) && (
              <Alert
                className="mb-5"
                type="info"
                showIcon
                title={
                  p.archived
                    ? 'Lộ trình đang lưu trữ. Khôi phục từ danh sách để tiếp tục bổ sung nội dung.'
                    : 'Lộ trình chưa công bố cho sinh viên.'
                }
                description="Sinh viên chỉ thấy nội dung khi lộ trình, chương và bài học đều được công bố."
              />
            )}
            <Tabs
              items={[
                {
                  key: 'content',
                  label: 'Chương & bài học',
                  children: (
                    <>
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <Space>
                          <Switch
                            aria-label="Hiển thị nội dung lưu trữ"
                            checked={showArchived}
                            onChange={setShowArchived}
                          />
                          <span className="text-sm">Hiện nội dung lưu trữ</span>
                        </Space>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          disabled={p.archived}
                          onClick={() => editModule()}
                        >
                          Thêm chương
                        </Button>
                      </div>
                      {!visibleModules.length ? (
                        <section className="surface p-8">
                          <Empty description="Chưa có chương học. Thêm chương đầu tiên để xây dựng lộ trình." />
                        </section>
                      ) : (
                        <Collapse
                          className="learning-editor-collapse"
                          activeKey={
                            openModules ?? visibleModules.map((m) => m._id)
                          }
                          onChange={(keys) =>
                            setOpenModules(
                              Array.isArray(keys)
                                ? keys.map(String)
                                : [String(keys)],
                            )
                          }
                          items={visibleModules.map((module) => ({
                            key: module._id,
                            label: (
                              <div className="flex min-w-0 flex-wrap items-center gap-3">
                                <strong>
                                  {module.order}. {module.title}
                                </strong>
                                <Tag
                                  color={
                                    module.archived
                                      ? 'default'
                                      : module.published
                                        ? 'green'
                                        : 'orange'
                                  }
                                >
                                  {module.archived
                                    ? 'Lưu trữ'
                                    : module.published
                                      ? 'Đã công bố'
                                      : 'Bản nháp'}
                                </Tag>
                              </div>
                            ),
                            extra: (
                              <Space wrap onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="small"
                                  icon={<FileZipOutlined />}
                                  disabled={module.archived || p.archived}
                                  onClick={() =>
                                    setAssignmentScope({
                                      moduleId: module._id,
                                      title: module.title,
                                    })
                                  }
                                >
                                  Bài tập
                                </Button>
                                <Button
                                  size="small"
                                  aria-label={`Sửa chương ${module.title}`}
                                  icon={<EditOutlined />}
                                  onClick={() => editModule(module)}
                                />
                                <Popconfirm
                                  title={
                                    module.archived
                                      ? 'Khôi phục chương học?'
                                      : 'Lưu trữ chương và ẩn các bài bên trong?'
                                  }
                                  onConfirm={() =>
                                    archive(module, 'learning-modules')
                                  }
                                >
                                  <Button
                                    size="small"
                                    aria-label={
                                      module.archived
                                        ? `Khôi phục chương ${module.title}`
                                        : `Lưu trữ chương ${module.title}`
                                    }
                                    icon={
                                      module.archived ? (
                                        <UndoOutlined />
                                      ) : (
                                        <InboxOutlined />
                                      )
                                    }
                                    loading={rowBusy === module._id}
                                    disabled={!!rowBusy}
                                  />
                                </Popconfirm>
                              </Space>
                            ),
                            children: (
                              <>
                                {module.description && (
                                  <div className="mb-4">
                                    <LearningText>
                                      {module.description}
                                    </LearningText>
                                  </div>
                                )}
                                <div className="space-y-3">
                                  {module.lessons
                                    .filter((l) => showArchived || !l.archived)
                                    .map((lesson) => (
                                      <div
                                        key={lesson._id}
                                        className="lesson-editor-row"
                                      >
                                        <PlayCircleOutlined className="text-xl text-brand" />
                                        <div className="min-w-0 flex-1">
                                          <strong className="break-words">
                                            {lesson.order}. {lesson.title}
                                          </strong>
                                          <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <Tag
                                              color={
                                                lesson.archived
                                                  ? 'default'
                                                  : lesson.published
                                                    ? 'green'
                                                    : 'orange'
                                              }
                                            >
                                              {lesson.archived
                                                ? 'Lưu trữ'
                                                : lesson.published
                                                  ? 'Công bố'
                                                  : 'Bản nháp'}
                                            </Tag>
                                            {lesson.isPreview && (
                                              <Tag color="blue">Xem trước</Tag>
                                            )}
                                            <span className="text-xs text-muted">
                                              {duration(lesson.durationSeconds)}{' '}
                                              · {lesson.resources.length} tài
                                              liệu
                                            </span>
                                          </div>
                                        </div>
                                        <Space wrap>
                                          <Button
                                            size="small"
                                            icon={<FileZipOutlined />}
                                            disabled={
                                              lesson.archived ||
                                              module.archived ||
                                              p.archived
                                            }
                                            onClick={() =>
                                              setAssignmentScope({
                                                moduleId: module._id,
                                                lessonId: lesson._id,
                                                title: lesson.title,
                                              })
                                            }
                                          >
                                            Bài tập (
                                            {lesson.assignments?.filter(
                                              (a) => !a.archived,
                                            ).length ?? 0}
                                            )
                                          </Button>
                                          <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() =>
                                              editLesson(module._id, lesson)
                                            }
                                          >
                                            Sửa bài
                                          </Button>
                                          <Popconfirm
                                            title={
                                              lesson.archived
                                                ? 'Khôi phục bài học?'
                                                : 'Lưu trữ bài học?'
                                            }
                                            onConfirm={() =>
                                              archive(lesson, 'lessons')
                                            }
                                          >
                                            <Button
                                              size="small"
                                              aria-label={
                                                lesson.archived
                                                  ? `Khôi phục bài ${lesson.title}`
                                                  : `Lưu trữ bài ${lesson.title}`
                                              }
                                              loading={rowBusy === lesson._id}
                                              disabled={!!rowBusy}
                                              icon={
                                                lesson.archived ? (
                                                  <UndoOutlined />
                                                ) : (
                                                  <InboxOutlined />
                                                )
                                              }
                                            />
                                          </Popconfirm>
                                        </Space>
                                      </div>
                                    ))}
                                </div>
                                <Button
                                  className="mt-4"
                                  icon={<PlusOutlined />}
                                  disabled={p.archived || module.archived}
                                  onClick={() => editLesson(module._id)}
                                >
                                  Thêm bài học
                                </Button>
                              </>
                            ),
                          }))}
                        />
                      )}
                    </>
                  ),
                },
                {
                  key: 'assignments',
                  label: 'Bài tập mã nguồn',
                  children: <SpecializedAssignmentsPanel pathId={id} />,
                },
                {
                  key: 'enrollments',
                  label: 'Sinh viên ghi danh',
                  children: (
                    <EnrollmentsPanel pathId={id} archived={p.archived} />
                  ),
                },
              ]}
            />
          </>
        )}
      </QueryState>
      <Modal
        title={moduleEditor?.module ? 'Sửa chương học' : 'Thêm chương học'}
        open={!!moduleEditor}
        width={760}
        onCancel={() => !busy && setModuleEditor(undefined)}
        onOk={() => moduleForm.submit()}
        confirmLoading={busy}
        okText="Lưu chương"
        cancelText="Hủy"
        maskClosable={false}
        destroyOnHidden
      >
        <Form
          form={moduleForm}
          layout="vertical"
          onFinish={saveModule}
          disabled={busy}
          requiredMark={false}
        >
          <Form.Item
            name="title"
            label="Tên chương"
            rules={[{ required: true, whitespace: true }, { max: 200 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mô tả chương"
            rules={[{ max: 10000 }]}
          >
            <RichTextEditor aria-label="Mô tả chương" maxLength={10000} />
          </Form.Item>
          <Form.Item name="order" label="Thứ tự" rules={[{ required: true }]}>
            <InputNumber min={0} max={100000} precision={0} />
          </Form.Item>
          <Form.Item
            name="published"
            label="Công bố chương"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <AssignmentAttachments
            pathId={id}
            existing={moduleEditor?.module?.assignments}
          />
          {error && <Alert type="error" showIcon title={error} />}
        </Form>
      </Modal>
      <Drawer
        title={lessonEditor?.lesson ? 'Cập nhật bài học' : 'Thêm bài học'}
        open={!!lessonEditor}
        onClose={() => !busy && setLessonEditor(undefined)}
        size={820}
        maskClosable={false}
        destroyOnHidden
        footer={
          <div className="flex justify-end gap-3">
            <Button disabled={busy} onClick={() => setLessonEditor(undefined)}>
              Hủy
            </Button>
            <Button
              type="primary"
              loading={busy}
              onClick={() => lessonForm.submit()}
            >
              Lưu bài học
            </Button>
          </div>
        }
      >
        <Form
          form={lessonForm}
          layout="vertical"
          onFinish={saveLesson}
          disabled={busy}
          requiredMark={false}
        >
          <Form.Item
            name="title"
            label="Tên bài học"
            rules={[{ required: true, whitespace: true }, { max: 200 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="summary"
            label="Tóm tắt bài học"
            rules={[{ max: 1000 }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Tabs
            items={[
              {
                key: 'write',
                label: 'Soạn nội dung',
                forceRender: true,
                children: (
                  <Form.Item name="content" rules={[{ max: 100000 }]}>
                    <RichTextEditor
                      aria-label="Nội dung bài học"
                      maxLength={100000}
                      tall
                      placeholder="Nhập nội dung bài học…"
                    />
                  </Form.Item>
                ),
              },
              {
                key: 'preview',
                label: 'Xem trước nội dung',
                children: (
                  <div className="content-preview mb-6">
                    <LearningText>
                      {content || 'Chưa có nội dung.'}
                    </LearningText>
                  </div>
                ),
              },
            ]}
          />
          <Form.Item
            name="videoUrl"
            label="Liên kết video HTTPS"
            rules={[
              { type: 'url' },
              { pattern: /^https:\/\//, message: 'Video cần liên kết HTTPS.' },
              { max: 2048 },
            ]}
            extra="Hỗ trợ YouTube, Vimeo hoặc liên kết video trực tiếp. Xóa liên kết để gỡ video hiện tại."
          >
            <Input type="url" />
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="durationSeconds"
              label="Thời lượng (giây)"
              rules={[{ required: true }]}
            >
              <InputNumber
                className="w-full"
                min={0}
                max={86400}
                precision={0}
              />
            </Form.Item>
            <Form.Item
              name="order"
              label="Thứ tự bài"
              rules={[{ required: true }]}
            >
              <InputNumber
                className="w-full"
                min={0}
                max={100000}
                precision={0}
              />
            </Form.Item>
          </div>
          <h3 className="mb-4">Tài liệu & mã nguồn</h3>
          <Form.List name="resources">
            {(fields, { add, remove }) => (
              <>
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div className="resource-editor" key={field.key}>
                      <Form.Item
                        name={[field.name, 'title']}
                        label="Tên tài liệu"
                        rules={[
                          { required: true, whitespace: true },
                          { max: 200 },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'url']}
                        label="Liên kết HTTPS"
                        rules={[
                          { required: true },
                          { type: 'url' },
                          {
                            pattern: /^https:\/\//,
                            message: 'Tài liệu cần liên kết HTTPS.',
                          },
                          { max: 2048 },
                        ]}
                      >
                        <Input type="url" />
                      </Form.Item>
                      <div className="flex items-start gap-3">
                        <Form.Item
                          name={[field.name, 'kind']}
                          label="Loại tài liệu"
                          className="min-w-0 flex-1"
                          rules={[{ required: true }]}
                        >
                          <Select
                            options={[
                              { value: 'document', label: 'Tài liệu' },
                              { value: 'source_code', label: 'Mã nguồn' },
                              { value: 'link', label: 'Liên kết' },
                            ]}
                          />
                        </Form.Item>
                        <Button
                          className="mt-7"
                          danger
                          onClick={() => remove(field.name)}
                        >
                          Xóa tài liệu
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-3 mb-6"
                  icon={<PlusOutlined />}
                  disabled={fields.length >= 50}
                  onClick={() => add({ title: '', url: '', kind: 'document' })}
                >
                  Thêm tài liệu
                </Button>
              </>
            )}
          </Form.List>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="isPreview"
              label="Cho phép xem trước"
              valuePropName="checked"
              extra="Sinh viên đăng nhập có thể xem bài này trước khi ghi danh."
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="published"
              label="Công bố bài học"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>
          <AssignmentAttachments
            pathId={id}
            existing={lessonEditor?.lesson?.assignments}
          />
          {error && <Alert type="error" showIcon title={error} />}
        </Form>
      </Drawer>
      <Drawer
        title={`Bài tập · ${assignmentScope?.title ?? ''}`}
        open={!!assignmentScope}
        onClose={() => setAssignmentScope(undefined)}
        size={1100}
        destroyOnHidden
      >
        {assignmentScope && (
          <SpecializedAssignmentsPanel
            key={`${assignmentScope.moduleId}/${assignmentScope.lessonId ?? ''}`}
            pathId={id}
            moduleId={assignmentScope.moduleId}
            lessonId={assignmentScope.lessonId}
          />
        )}
      </Drawer>
    </>
  );
}
