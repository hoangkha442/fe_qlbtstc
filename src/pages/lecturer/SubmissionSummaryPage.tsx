import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Progress,
  Select,
  Table,
  Tag,
} from 'antd';
import {
  EyeOutlined,
  FileExcelOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { allPages, download, errorMessage, get } from '../../lib/api';
import type { Catalog, CourseSection, Semester } from '../../lib/types';
import type {
  StudentSubmissionSummary,
  SubmissionSummary,
  SummaryAssignment,
  SummaryStudent,
} from '../../lib/submission-summary';
import { dateTime, refName } from '../../lib/utils';
import { PageHeading, QueryState } from '../../components/common';
import AllSelect from '../../components/AllSelect';

function Completion({ student }: { student: SummaryStudent }) {
  if (!student.totalAssignments) return <Tag>Chưa có bài tập</Tag>;
  return (
    <div className="min-w-32">
      <strong className="text-base">
        {student.submittedAssignments}/{student.totalAssignments} bài
      </strong>
      <Progress
        percent={Math.round((student.completionRate ?? 0) * 100)}
        size="small"
        status={student.missingAssignments ? 'normal' : 'success'}
      />
    </div>
  );
}
function AssignmentResult({ item }: { item: SummaryAssignment }) {
  if (item.submission)
    return (
      <Tag color={item.submission.late ? 'orange' : 'green'}>
        {item.submission.late ? 'Đã nộp trễ' : 'Đã nộp'}
      </Tag>
    );
  if (item.overdue) return <Tag color="red">Quá hạn chưa nộp</Tag>;
  if (item.status.code === 'scheduled') return <Tag color="blue">Chưa mở</Tag>;
  return (
    <Tag color="orange">
      {item.status.code === 'closed' ? 'Đã đóng · Chưa nộp' : 'Chưa nộp'}
    </Tag>
  );
}
export default function SubmissionSummaryPage() {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const [studentCode, setStudentCode] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const classId = params.get('classId') || undefined;
  const semesterId = params.get('semesterId') || undefined;
  const courseSectionId = params.get('courseSectionId') || undefined;
  const includeArchived = params.get('includeArchived') === 'true';
  const search = params.get('search') || undefined;
  const status = params.get('status') || 'all';
  const requestedPage = Number(params.get('page') ?? 1);
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 1000000
      ? requestedPage
      : 1;
  const scope = {
    classId,
    semesterId,
    courseSectionId,
    includeArchived: String(includeArchived),
  };
  const classes = useQuery({
    queryKey: ['lecturer', 'summary-class-options'],
    queryFn: ({ signal }) =>
      allPages<Catalog>('/lecturer/classes', { archived: 'all' }, signal),
  });
  const semesters = useQuery({
    queryKey: ['lecturer', 'summary-semester-options'],
    queryFn: ({ signal }) =>
      allPages<Semester>('/lecturer/semesters', { archived: 'all' }, signal),
  });
  const sections = useQuery({
    queryKey: ['lecturer', 'summary-section-options', classId, semesterId],
    queryFn: ({ signal }) =>
      allPages<CourseSection>(
        '/lecturer/course-sections',
        { classId, semesterId, archived: 'all' },
        signal,
      ),
    enabled: !!classId,
  });
  const summary = useQuery({
    queryKey: ['lecturer', 'submission-summary', scope, search, status, page],
    queryFn: ({ signal }) =>
      get<SubmissionSummary>(
        '/lecturer/submission-summary',
        { ...scope, search, status, page, limit: 10 },
        signal,
      ),
    enabled: !!classId,
    staleTime: 0,
  });
  const detail = useQuery({
    queryKey: ['lecturer', 'submission-summary-student', scope, studentCode],
    queryFn: ({ signal }) =>
      get<StudentSubmissionSummary>(
        `/lecturer/submission-summary/students/${encodeURIComponent(studentCode!)}`,
        scope,
        signal,
      ),
    enabled: !!classId && !!studentCode,
    staleTime: 0,
  });
  function setFilter(key: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    if (key === 'classId' || key === 'semesterId')
      next.delete('courseSectionId');
    setStudentCode(undefined);
    setParams(next);
  }
  async function exportExcel() {
    if (!classId || exporting) return;
    setExporting(true);
    try {
      await download(
        '/lecturer/submission-summary/export.xlsx',
        `tong-hop-${summary.data?.classroom.code ?? classId}.xlsx`,
        { ...scope, search, status },
      );
      void message.success('Đã xuất bảng tổng hợp.');
    } catch (error) {
      void message.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  }
  const optionError = classes.error || semesters.error || sections.error;
  const s = summary.data;
  return (
    <>
      <PageHeading
        title="Tổng hợp nộp bài"
        description="Theo dõi số bài đã nộp và các bài còn thiếu của từng sinh viên theo lớp."
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              disabled={!classId}
              loading={summary.isFetching}
              onClick={() => void summary.refetch()}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              disabled={!s || summary.isFetching || !s.total}
              loading={exporting}
              onClick={() => void exportExcel()}
            >
              Xuất Excel
            </Button>
          </>
        }
      />
      <section className="surface mb-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block font-semibold">Lớp</span>
            <Select
              className="w-full"
              aria-label="Chọn lớp thống kê"
              placeholder="Chọn lớp"
              showSearch
              optionFilterProp="label"
              loading={classes.isPending}
              value={classId}
              options={classes.data?.map((item) => ({
                value: item._id,
                label: `${item.name} · ${item.code}${item.archived ? ' (Lưu trữ)' : ''}`,
              }))}
              onChange={(value) => setFilter('classId', value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-semibold">Học kỳ</span>
            <AllSelect
              className="w-full"
              aria-label="Lọc học kỳ thống kê"
              allLabel="Tất cả học kỳ"
              showSearch
              optionFilterProp="label"
              loading={semesters.isPending}
              value={semesterId}
              options={semesters.data?.map((item) => ({
                value: item._id,
                label: `${item.name} · ${item.academicYear}`,
              }))}
              onChange={(value) => setFilter('semesterId', value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-semibold">Học phần</span>
            <AllSelect
              className="w-full"
              aria-label="Lọc học phần thống kê"
              allLabel="Tất cả học phần"
              showSearch
              optionFilterProp="label"
              disabled={!classId}
              loading={!!classId && sections.isPending}
              value={courseSectionId}
              options={sections.data?.map((item) => ({
                value: item._id,
                label: `${item.code} · ${refName(item.subjectId)}${item.archived ? ' (Lưu trữ)' : ''}`,
              }))}
              onChange={(value) => setFilter('courseSectionId', value)}
            />
          </label>
        </div>
        <Checkbox
          className="mt-4"
          checked={includeArchived}
          onChange={(event) =>
            setFilter(
              'includeArchived',
              event.target.checked ? 'true' : undefined,
            )
          }
        >
          Tính cả bài tập lưu trữ
        </Checkbox>
        {optionError && (
          <Alert
            className="mt-4"
            type="error"
            title={errorMessage(optionError)}
            action={
              <Button
                onClick={() => {
                  void classes.refetch();
                  void semesters.refetch();
                  if (classId) void sections.refetch();
                }}
              >
                Thử lại
              </Button>
            }
          />
        )}
      </section>
      {!classId ? (
        <div className="surface p-8">
          <Empty description="Chọn lớp để xem tổng hợp nộp bài" />
        </div>
      ) : (
        <QueryState
          pending={summary.isPending}
          error={summary.error}
          retry={() => void summary.refetch()}
        >
          {s && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2>
                  {s.classroom.name} · {s.classroom.code}
                </h2>
                <span className="text-sm text-muted">
                  Cập nhật {dateTime(s.generatedAt)}
                </span>
              </div>
              <div className="stats-grid">
                {[
                  {
                    label: 'Tổng bài tập',
                    value: s.totalAssignments,
                    note: `${s.courseSections.length} học phần · ${s.scheduledAssignments} bài chưa mở`,
                  },
                  {
                    label: 'MSSV đã ghi nhận',
                    value: s.overview.observedStudents,
                    note: 'Đã từng nộp bài trong phạm vi này',
                  },
                  {
                    label: 'Đã nộp đủ',
                    value: s.overview.completedStudents,
                    note: 'Đã nộp tất cả bài tập được tính',
                  },
                  {
                    label: 'Còn thiếu bài',
                    value: s.overview.incompleteStudents,
                    note: 'Trong số MSSV đã ghi nhận',
                  },
                ].map((item) => (
                  <div key={item.label} className="stat-card surface">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.note}</small>
                  </div>
                ))}
              </div>
              <Alert
                className="mb-4"
                showIcon
                type="info"
                title={s.coverageNotice}
              />
              <p className="mb-5 text-sm text-muted">
                Mỗi bài tập tính một lần, bao gồm bài chưa mở. Nộp lại không
                tăng số bài đã nộp.
              </p>
              <section className="surface">
                <div className="table-toolbar">
                  <Input.Search
                    key={`${classId ?? ''}:${search ?? ''}`}
                    className="max-w-sm"
                    aria-label="Tìm sinh viên tổng hợp"
                    placeholder="Tìm MSSV, họ tên hoặc email"
                    defaultValue={search}
                    maxLength={100}
                    allowClear
                    onSearch={(value) =>
                      setFilter('search', value.trim() || undefined)
                    }
                  />
                  <Select
                    className="min-w-48"
                    aria-label="Lọc tiến độ nộp bài"
                    value={status}
                    options={[
                      { value: 'all', label: 'Tất cả sinh viên đã ghi nhận' },
                      { value: 'complete', label: 'Đã nộp đủ' },
                      { value: 'incomplete', label: 'Còn thiếu bài' },
                    ]}
                    onChange={(value) => setFilter('status', value)}
                  />
                </div>
                <Table<SummaryStudent>
                  rowKey="studentCode"
                  dataSource={s.items}
                  scroll={{ x: 1050 }}
                  pagination={{
                    current: page,
                    pageSize: 10,
                    total: s.total,
                    showSizeChanger: false,
                    showTotal: (total) => `${total} sinh viên`,
                    onChange: (value) => setFilter('page', String(value)),
                  }}
                  locale={{
                    emptyText: s.overview.observedStudents
                      ? 'Không có sinh viên phù hợp bộ lọc.'
                      : 'Chưa có MSSV nào nộp bài trong phạm vi được chọn.',
                  }}
                  columns={[
                    {
                      title: 'MSSV',
                      dataIndex: 'studentCode',
                      width: 160,
                      render: (code: string) => (
                        <button
                          className="table-title-link"
                          aria-label={`Xem tiến độ ${code}`}
                          onClick={() => setStudentCode(code)}
                        >
                          {code}
                        </button>
                      ),
                    },
                    {
                      title: 'SINH VIÊN',
                      key: 'student',
                      width: 245,
                      render: (_, row) => (
                        <div>
                          <strong>{row.fullName}</strong>
                          <div className="mt-1 break-all text-sm text-muted">
                            {row.email ?? '—'}
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: 'ĐÃ NỘP / TỔNG',
                      key: 'progress',
                      width: 180,
                      render: (_, row) => <Completion student={row} />,
                    },
                    {
                      title: 'CHƯA NỘP',
                      dataIndex: 'missingAssignments',
                      width: 125,
                      render: (count: number) => (
                        <Tag color={count ? 'orange' : 'green'}>
                          {count} bài
                        </Tag>
                      ),
                    },
                    {
                      title: 'QUÁ HẠN CHƯA NỘP',
                      dataIndex: 'overdueAssignments',
                      width: 180,
                      render: (count: number) =>
                        count ? <Tag color="red">{count} bài</Tag> : '—',
                    },
                    {
                      title: '',
                      key: 'details',
                      width: 115,
                      fixed: 'right',
                      render: (_, row) => (
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => setStudentCode(row.studentCode)}
                        >
                          Chi tiết
                        </Button>
                      ),
                    },
                  ]}
                />
              </section>
            </>
          )}
        </QueryState>
      )}
      <Drawer
        title="Tiến độ nộp bài của sinh viên"
        size={1000}
        open={!!studentCode}
        onClose={() => setStudentCode(undefined)}
        destroyOnHidden
      >
        <QueryState
          pending={detail.isPending}
          error={detail.error}
          retry={() => void detail.refetch()}
        >
          {detail.data && (
            <>
              <h2 className="mb-2">{detail.data.student.fullName}</h2>
              <p className="mb-5 text-muted">
                {detail.data.student.studentCode} · {detail.data.classroom.name}
              </p>
              <Descriptions
                size="small"
                column={2}
                items={[
                  {
                    key: 'submitted',
                    label: 'Đã nộp',
                    children: `${detail.data.student.submittedAssignments}/${detail.data.totalAssignments} bài`,
                  },
                  {
                    key: 'missing',
                    label: 'Chưa nộp',
                    children: `${detail.data.student.missingAssignments} bài`,
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    children: detail.data.student.email ?? '—',
                  },
                  {
                    key: 'last',
                    label: 'Lần nộp cuối',
                    children: dateTime(detail.data.student.lastSubmittedAt),
                  },
                ]}
              />
              <Table<SummaryAssignment>
                className="mt-6"
                rowKey="id"
                dataSource={detail.data.assignments}
                scroll={{ x: 760 }}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                columns={[
                  {
                    title: 'BÀI TẬP',
                    key: 'assignment',
                    render: (_, item) => (
                      <div>
                        <strong>{item.title}</strong>
                        <div className="mt-1 text-sm text-muted">
                          {item.courseSectionCode}{' '}
                          {item.archived && <Tag>Lưu trữ</Tag>}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'HẠN NỘP',
                    dataIndex: 'dueAt',
                    width: 170,
                    render: (value: string) => dateTime(value),
                  },
                  {
                    title: 'KẾT QUẢ',
                    key: 'result',
                    width: 195,
                    render: (_, item) => (
                      <div>
                        <AssignmentResult item={item} />
                        {item.submission && (
                          <div className="mt-2 text-sm text-muted">
                            Phiên bản {item.submission.version} ·{' '}
                            {dateTime(item.submission.submittedAt)}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: '',
                    key: 'submission',
                    width: 125,
                    render: (_, item) =>
                      item.submission ? (
                        <Link
                          to={`/lecturer/submissions?submissionId=${item.submission.id}`}
                        >
                          <Button size="small">Mở bài nộp</Button>
                        </Link>
                      ) : null,
                  },
                ]}
              />
            </>
          )}
        </QueryState>
      </Drawer>
    </>
  );
}
