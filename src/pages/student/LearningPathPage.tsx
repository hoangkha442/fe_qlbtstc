import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Collapse, Empty, Progress, Tag } from 'antd';
import {
  CheckCircleOutlined,
  FileTextOutlined,
  LockOutlined,
  PlayCircleOutlined,
  ExportOutlined,
  ArrowRightOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage, get } from '../../lib/api';
import type { Lesson, StudentPathDetail } from '../../lib/types';
import { useStudentAuth } from '../../lib/student-context';
import { BackButton, QueryState } from '../../components/common';
import { LearningText, LessonVideo } from '../../components/LearningContent';
import { duration, levels, safeHttps } from '../../lib/learning';
import StudentAssignmentsPanel from '../../components/StudentAssignmentsPanel';

export default function LearningPathPage() {
  const { pathId = '', lessonId } = useParams();
  const { student } = useStudentAuth();
  const { message } = App.useApp();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const path = useQuery({
    queryKey: ['student', 'path', student?.id, pathId],
    queryFn: ({ signal }) =>
      get<StudentPathDetail>(
        `/student/learning-paths/${pathId}`,
        undefined,
        signal,
      ),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const outline = path.data?.modules.flatMap((m) => m.lessons) ?? [];
  const active = outline.find((l) => l._id === lessonId);
  const lesson = useQuery({
    queryKey: ['student', 'lesson', student?.id, lessonId],
    queryFn: ({ signal }) =>
      get<Lesson>(`/student/lessons/${lessonId}`, undefined, signal),
    enabled: !!active?.accessible,
    staleTime: 0,
  });
  const p = path.data;
  const activeModule = p?.modules.find(
    (module) => module._id === active?.moduleId,
  );
  async function toggleProgress() {
    if (!active || busy) return;
    setBusy(true);
    try {
      await api.patch(`/student/lessons/${active._id}/progress`, {
        completed: !active.completed,
      });
      await client.invalidateQueries({ queryKey: ['student', 'path'] });
      void message.success(
        active.completed
          ? 'Đã bỏ đánh dấu hoàn thành.'
          : 'Đã cập nhật tiến độ học.',
      );
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const next = active
    ? outline
        .slice(outline.findIndex((l) => l._id === active._id) + 1)
        .find((l) => l.accessible)
    : undefined;
  const first =
    outline.find((l) => l.accessible && !l.completed) ??
    outline.find((l) => l.accessible);
  return (
    <>
      <BackButton to="/specialized" />
      <QueryState
        pending={path.isPending}
        error={path.error}
        retry={() => void path.refetch()}
      >
        {p && (
          <>
            <div className="learning-path-heading">
              <div>
                <div className="eyebrow">CHUYÊN NGÀNH · {levels[p.level]}</div>
                <h1>{p.title}</h1>
                <p>{p.summary}</p>
              </div>
              <Tag color={p.enrolled ? 'green' : 'blue'}>
                {p.enrolled ? 'Đã ghi danh' : 'Chế độ xem trước'}
              </Tag>
            </div>
            {!p.enrolled && (
              <Alert
                className="mb-6"
                showIcon
                type="info"
                title="Bạn có thể xem trước các bài được mở."
                description="Liên hệ giảng viên để được ghi danh và truy cập đầy đủ bài học, tài liệu."
              />
            )}
            <div className="learning-workspace">
              <aside className="surface learning-outline">
                <div className="p-5">
                  <Link to={`/specialized/paths/${pathId}`}>
                    <h2>Lộ trình học</h2>
                  </Link>
                  <p className="mt-2 text-sm text-muted">
                    {p.totalLessons} bài học
                    {p.enrolled
                      ? ` · ${p.completedLessons} bài hoàn thành`
                      : ''}
                  </p>
                  {p.enrolled && (
                    <Progress percent={p.progressPercent} size="small" />
                  )}
                </div>
                {!p.modules.length ? (
                  <Empty description="Chưa có chương học được công bố" />
                ) : (
                  <Collapse
                    ghost
                    defaultActiveKey={p.modules.map((m) => m._id)}
                    items={p.modules.map((module) => ({
                      key: module._id,
                      label: <strong>{module.title}</strong>,
                      children: (
                        <div className="lesson-outline-list">
                          {module.description && (
                            <LearningText>{module.description}</LearningText>
                          )}
                          {module.lessons.map((item) =>
                            item.accessible ? (
                              <Link
                                key={item._id}
                                to={`/specialized/paths/${pathId}/lessons/${item._id}`}
                                className={`lesson-outline-item ${item._id === lessonId ? 'active' : ''}`}
                              >
                                <span>
                                  {item.completed ? (
                                    <CheckCircleOutlined className="text-emerald-600" />
                                  ) : (
                                    <PlayCircleOutlined />
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <strong>{item.title}</strong>
                                  <small>
                                    {duration(item.durationSeconds)}
                                    {item.isPreview ? ' · Xem trước' : ''}
                                    {item.assignments?.length
                                      ? ` · ${item.assignments.length} bài tập`
                                      : ''}
                                  </small>
                                </span>
                              </Link>
                            ) : (
                              <div
                                key={item._id}
                                className="lesson-outline-item locked"
                              >
                                <LockOutlined />
                                <span>
                                  <strong>{item.title}</strong>
                                  <small>Cần ghi danh</small>
                                </span>
                              </div>
                            ),
                          )}
                          {!!module.assignments?.length && (
                            <div className="outline-assignments">
                              <span className="text-sm font-semibold">
                                Bài tập chương
                              </span>
                              {module.assignments.map((assignment) => (
                                <Link
                                  key={assignment._id}
                                  to={`/specialized/assignments/${assignment._id}`}
                                >
                                  <FileZipOutlined />
                                  <span>{assignment.title}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ),
                    }))}
                  />
                )}
              </aside>
              <div className="min-w-0 space-y-5">
                {!lessonId ? (
                  <section className="surface p-6 sm:p-8">
                    <h2 className="mb-5">Về lộ trình này</h2>
                    <LearningText>
                      {p.description ||
                        p.summary ||
                        'Giảng viên sẽ cập nhật mô tả lộ trình.'}
                    </LearningText>
                    {!!p.objectives.length && (
                      <>
                        <h3 className="mt-7 mb-3">Bạn sẽ học được gì?</h3>
                        <ul className="learning-objectives">
                          {p.objectives.map((objective, i) => (
                            <li key={i}>
                              <CheckCircleOutlined />
                              {objective}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {p.prerequisites && (
                      <>
                        <h3 className="mt-7 mb-3">Chuẩn bị trước khi học</h3>
                        <LearningText>{p.prerequisites}</LearningText>
                      </>
                    )}
                    {first && (
                      <Link
                        to={`/specialized/paths/${pathId}/lessons/${first._id}`}
                      >
                        <Button
                          type="primary"
                          size="large"
                          className="mt-7"
                          icon={<PlayCircleOutlined />}
                        >
                          {p.enrolled ? 'Tiếp tục học' : 'Xem bài học miễn phí'}
                        </Button>
                      </Link>
                    )}
                  </section>
                ) : !active?.accessible ? (
                  <Alert
                    showIcon
                    type="warning"
                    title="Bài học chưa mở cho tài khoản của bạn."
                    description="Chọn bài xem trước hoặc liên hệ giảng viên để ghi danh."
                  />
                ) : (
                  <QueryState
                    pending={lesson.isPending}
                    error={lesson.error}
                    retry={() => void lesson.refetch()}
                  >
                    {lesson.data && (
                      <>
                        <section className="surface overflow-hidden">
                          {lesson.data.videoUrl && (
                            <LessonVideo
                              key={lesson.data._id}
                              url={lesson.data.videoUrl}
                              title={lesson.data.title}
                            />
                          )}
                          <div className="p-6 sm:p-8">
                            <div className="mb-3 flex flex-wrap gap-2">
                              <Tag>{duration(lesson.data.durationSeconds)}</Tag>
                              {lesson.data.isPreview && (
                                <Tag color="blue">Bài xem trước</Tag>
                              )}
                            </div>
                            <h2 className="mb-4 text-2xl">
                              {lesson.data.title}
                            </h2>
                            {lesson.data.summary && (
                              <p className="mb-6 text-muted">
                                {lesson.data.summary}
                              </p>
                            )}
                            <LearningText>
                              {lesson.data.content ||
                                'Bài học này sử dụng nội dung video và tài liệu bên dưới.'}
                            </LearningText>
                          </div>
                        </section>
                        <section className="surface p-6">
                          <h2 className="mb-4">Tài liệu bài học</h2>
                          {!lesson.data.enrolled ? (
                            <p className="text-muted">
                              <LockOutlined /> Tài liệu được mở sau khi giảng
                              viên ghi danh.
                            </p>
                          ) : lesson.data.resources.length ? (
                            <div className="space-y-3">
                              {lesson.data.resources.map((resource, i) => (
                                <div key={i} className="learning-resource">
                                  <FileTextOutlined />
                                  <div className="min-w-0 flex-1">
                                    <strong>{resource.title}</strong>
                                    <small>
                                      {resource.kind === 'source_code'
                                        ? 'Mã nguồn'
                                        : resource.kind === 'document'
                                          ? 'Tài liệu'
                                          : 'Liên kết'}
                                    </small>
                                  </div>
                                  {safeHttps(resource.url) && (
                                    <Button
                                      href={safeHttps(resource.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      icon={<ExportOutlined />}
                                    >
                                      Mở
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted">
                              Bài học chưa có tài liệu đính kèm.
                            </p>
                          )}
                        </section>
                        <div className="flex flex-wrap justify-between gap-3">
                          {p.enrolled && (
                            <Button
                              type={active.completed ? 'default' : 'primary'}
                              loading={busy}
                              icon={<CheckCircleOutlined />}
                              onClick={() => void toggleProgress()}
                            >
                              {active.completed
                                ? 'Bỏ đánh dấu hoàn thành'
                                : 'Đánh dấu đã hoàn thành'}
                            </Button>
                          )}
                          {next && (
                            <Link
                              to={`/specialized/paths/${pathId}/lessons/${next._id}`}
                            >
                              <Button
                                icon={<ArrowRightOutlined />}
                                iconPlacement="end"
                              >
                                Bài tiếp theo
                              </Button>
                            </Link>
                          )}
                        </div>
                      </>
                    )}
                  </QueryState>
                )}
                {p.enrolled &&
                  (!lessonId ? (
                    <>
                      {!!p.assignments?.length && (
                        <StudentAssignmentsPanel
                          assignments={p.assignments}
                          title="Bài tập của lộ trình"
                        />
                      )}
                      {p.modules
                        .filter(
                          (module) =>
                            module.assignments?.length ||
                            module.lessons.some(
                              (item) => item.assignments?.length,
                            ),
                        )
                        .map((module) => (
                          <section key={module._id} className="mt-7">
                            <h2>{module.title}</h2>
                            {!!module.assignments?.length && (
                              <StudentAssignmentsPanel
                                assignments={module.assignments}
                                title="Bài tập chương"
                              />
                            )}
                            {module.lessons
                              .filter((item) => item.assignments?.length)
                              .map((item) => (
                                <StudentAssignmentsPanel
                                  key={item._id}
                                  assignments={item.assignments ?? []}
                                  title={`Bài tập · ${item.title}`}
                                />
                              ))}
                          </section>
                        ))}
                    </>
                  ) : (
                    <>
                      {!!activeModule?.assignments?.length && (
                        <StudentAssignmentsPanel
                          key={activeModule._id}
                          assignments={activeModule.assignments}
                          title={`Bài tập chương · ${activeModule.title}`}
                        />
                      )}
                      {active?.accessible && (
                        <StudentAssignmentsPanel
                          key={lessonId}
                          assignments={
                            lesson.data?.assignments ?? active.assignments ?? []
                          }
                          title={`Bài tập · ${active.title}`}
                        />
                      )}
                    </>
                  ))}
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
