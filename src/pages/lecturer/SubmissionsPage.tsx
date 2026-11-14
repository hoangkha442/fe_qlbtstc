import AllSelect from '../../components/AllSelect';
import GradingForm from '../../components/GradingForm';
import { GradeTag } from '../../components/GradeDisplay';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  App,
  Avatar,
  Button,
  Descriptions,
  Drawer,
  Input,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { allPages, download, errorMessage, get } from '../../lib/api';
import type {
  Assignment,
  CourseSection,
  Page,
  Submission,
} from '../../lib/types';
import { dateTime, formatBytes } from '../../lib/utils';
import {
  FileIcon,
  FileList,
  PageHeading,
  QueryState,
} from '../../components/common';
export default function SubmissionsPage() {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const assignmentId = params.get('assignmentId') || undefined;
  const sectionId = params.get('courseSectionId') || undefined;
  const selectedId = params.get('submissionId') || undefined;
  const assignments = useQuery({
    queryKey: ['lecturer', 'all-assignments'],
    queryFn: ({ signal }) =>
      allPages<Assignment>(
        '/lecturer/assignments',
        {
          archived: 'all',
        },
        signal,
      ),
  });
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
    queryKey: [
      'lecturer',
      'submissions',
      page,
      search,
      assignmentId,
      sectionId,
    ],
    queryFn: ({ signal }) =>
      get<Page<Submission>>(
        '/lecturer/submissions',
        {
          page,
          limit: 10,
          search: search || undefined,
          assignmentId,
          courseSectionId: sectionId,
        },
        signal,
      ),
  });
  const detail = useQuery({
    queryKey: ['lecturer', 'submission', selectedId],
    queryFn: ({ signal }) =>
      get<Submission>(`/lecturer/submissions/${selectedId}`, undefined, signal),
    enabled: !!selectedId,
  });
  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'courseSectionId') next.delete('assignmentId');
    if (key !== 'submissionId') setPage(1);
    setParams(next);
  }
  async function save(
    path: string,
    filename: string,
    key: string,
    query?: Record<string, unknown>,
  ) {
    if (busy) return;
    setBusy(key);
    try {
      await download(path, filename, query);
      void message.success('Đã tải file.');
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  }
  const filteredAssignments = assignments.data?.filter(
    (a) => !sectionId || a.courseSectionId === sectionId,
  );
  const nameOf = (id: string) =>
    assignments.data?.find((a) => a._id === id)?.title ?? 'Bài tập';
  return (
    <>
      <PageHeading
        eyebrow="BÀI TẬP & BÀI NỘP"
        title="Bài đã nộp"
        description="Tra cứu, xem lịch sử và tải bài nộp của sinh viên."
        extra={
          <>
            <Tooltip
              title={
                !assignmentId
                  ? 'Chọn một bài tập để tải ZIP'
                  : 'Tải phiên bản mới nhất của mỗi sinh viên'
              }
            >
              <Button
                size="large"
                icon={<FileZipOutlined />}
                disabled={!assignmentId || (!!busy && busy !== 'zip')}
                loading={busy === 'zip'}
                onClick={() =>
                  assignmentId &&
                  void save(
                    `/lecturer/assignments/${assignmentId}/submissions.zip`,
                    `bai-nop-${assignmentId}.zip`,
                    'zip',
                  )
                }
              >
                Tải ZIP
              </Button>
            </Tooltip>
            <Tooltip
              title={
                !assignmentId
                  ? 'Chọn một bài tập để xuất Excel'
                  : 'Xuất danh sách bài đã nộp'
              }
            >
              <Button
                type="primary"
                size="large"
                icon={<FileExcelOutlined />}
                disabled={!assignmentId || (!!busy && busy !== 'excel')}
                loading={busy === 'excel'}
                onClick={() =>
                  assignmentId &&
                  void save(
                    `/lecturer/assignments/${assignmentId}/submissions.xlsx`,
                    `danh-sach-${assignmentId}.xlsx`,
                    'excel',
                  )
                }
              >
                Xuất Excel
              </Button>
            </Tooltip>
          </>
        }
      />
      <div className="submission-summary">
        <span className="live-dot" />
        <span>
          <strong>{list.data?.total ?? '—'}</strong> bài nộp trong lựa chọn hiện
          tại
        </span>
        <span className="ml-auto hidden sm:block">
          Chỉ thống kê sinh viên đã nộp
        </span>
      </div>
      <section className="surface">
        <div className="table-toolbar">
          <Input.Search
            className="max-w-xs"
            placeholder="Tìm mã sinh viên hoặc họ tên…"
            aria-label="Tìm bài nộp"
            allowClear
            onSearch={(value) => {
              setSearch(value.trim());
              setPage(1);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <AllSelect
              className="w-48"
              allLabel="Tất cả học phần"
              value={sectionId}
              allowClear
              showSearch
              optionFilterProp="label"
              aria-label="Lọc học phần"
              options={sections.data?.map((s) => ({
                value: s._id,
                label: s.code,
              }))}
              onChange={(value?: string) => setParam('courseSectionId', value)}
            />
            <AllSelect
              className="w-60"
              allLabel="Tất cả bài tập"
              value={assignmentId}
              allowClear
              showSearch
              optionFilterProp="label"
              aria-label="Lọc bài tập"
              options={filteredAssignments?.map((a) => ({
                value: a._id,
                label: a.title,
              }))}
              onChange={(value?: string) => setParam('assignmentId', value)}
            />
            <Button
              aria-label="Làm mới bài nộp"
              icon={<ReloadOutlined />}
              onClick={() => void list.refetch()}
            />
          </div>
        </div>
        {(assignments.error || sections.error) && (
          <div className="px-6 pb-5">
            <QueryState
              pending={false}
              error={assignments.error || sections.error}
              retry={() => {
                void assignments.refetch();
                void sections.refetch();
              }}
            >
              {null}
            </QueryState>
          </div>
        )}
        <QueryState
          pending={list.isPending}
          error={list.error}
          retry={() => void list.refetch()}
        >
          <Table<Submission>
            rowKey="_id"
            scroll={{
              x: 1200,
            }}
            dataSource={list.data?.items}
            pagination={{
              current: page,
              pageSize: 10,
              total: list.data?.total,
              showSizeChanger: false,
              showTotal: (total) => `${total} bài nộp`,
              onChange: setPage,
            }}
            columns={[
              {
                title: 'SINH VIÊN',
                key: 'student',
                width: 235,
                render: (_, s) => (
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="shrink-0"
                      style={{
                        color: '#203e7e',
                        background: '#eef2fa',
                      }}
                    >
                      {s.fullName.trim().split(/\s+/).pop()?.charAt(0)}
                    </Avatar>
                    <div>
                      <button
                        className="table-title-link"
                        onClick={() => setParam('submissionId', s._id)}
                      >
                        {s.fullName}
                      </button>
                      <div className="mt-1 text-xs text-muted">
                        {s.studentCodeNormalized}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                title: 'BÀI TẬP',
                key: 'assignment',
                width: 220,
                render: (_, s) => (
                  <div>
                    <span className="text-sm font-medium">
                      {nameOf(s.assignmentId)}
                    </span>
                    <div className="mt-1 text-xs text-muted">
                      {sections.data?.find((c) => c._id === s.courseSectionId)
                        ?.code ?? ''}
                    </div>
                  </div>
                ),
              },
              {
                title: 'FILE ĐÃ NỘP',
                key: 'files',
                width: 220,
                render: (_, s) => (
                  <div>
                    {s.files?.slice(0, 1).map((f) => (
                      <div
                        className="flex items-center gap-2"
                        key={f.originalName}
                      >
                        <FileIcon small format={f.format} />
                        <div className="min-w-0">
                          <span
                            className="block max-w-36 truncate text-xs"
                            title={f.originalName}
                          >
                            {f.originalName}
                          </span>
                          <span className="text-xs text-muted">
                            {formatBytes(f.bytes)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(s.files?.length ?? 0) > 1 && (
                      <span className="mt-1 block text-xs text-muted">
                        +{s.files!.length - 1} file khác
                      </span>
                    )}
                  </div>
                ),
              },
              {
                title: 'THỜI GIAN / PHIÊN BẢN',
                key: 'time',
                width: 205,
                render: (_, s) => (
                  <div className="text-sm">
                    {dateTime(s.submittedAt)}
                    <div className="mt-1 text-xs text-muted">
                      Phiên bản {s.latestVersion}
                    </div>
                  </div>
                ),
              },
              {
                title: 'TRẠNG THÁI',
                dataIndex: 'late',
                width: 135,
                render: (late: boolean) => (
                  <Tag color={late ? 'orange' : 'green'}>
                    {late ? 'Trễ hạn' : 'Đúng hạn'}
                  </Tag>
                ),
              },
              {
                title: 'ĐIỂM',
                key: 'grade',
                width: 120,
                render: (_, s) => <GradeTag grade={s.grade} />,
              },
              {
                title: '',
                key: 'action',
                width: 70,
                fixed: 'right',
                render: (_, s) => (
                  <Button
                    aria-label={`Xem bài nộp ${s.fullName}`}
                    icon={<EyeOutlined />}
                    onClick={() => setParam('submissionId', s._id)}
                  />
                ),
              },
            ]}
            locale={{
              emptyText:
                'Chưa có bài nộp phù hợp. Hệ thống không quản lý danh sách chưa nộp.',
            }}
          />
        </QueryState>
      </section>
      <Drawer
        title="Chi tiết bài nộp"
        size={740}
        open={!!selectedId}
        onClose={() => setParam('submissionId')}
      >
        <QueryState
          pending={detail.isPending}
          error={detail.error}
          retry={() => void detail.refetch()}
        >
          {detail.data && (
            <>
              <div className="submission-detail-title">
                <Avatar
                  size={56}
                  style={{
                    color: '#203e7e',
                    background: '#edf2fb',
                  }}
                >
                  {detail.data.fullName.trim().split(/\s+/).pop()?.charAt(0)}
                </Avatar>
                <div>
                  <h2>{detail.data.fullName}</h2>
                  <p>{detail.data.studentCodeNormalized}</p>
                </div>
                <Tag
                  className="ml-auto"
                  color={detail.data.late ? 'orange' : 'green'}
                >
                  {detail.data.late ? 'Trễ hạn' : 'Đúng hạn'}
                </Tag>
              </div>
              <Descriptions
                className="my-7"
                column={1}
                size="small"
                items={[
                  {
                    key: 'email',
                    label: 'Email nhận mã',
                    children: detail.data.email || 'Chưa có email',
                    span: 2,
                  },
                  {
                    key: 'assignment',
                    label: 'Bài tập',
                    children: nameOf(detail.data.assignmentId),
                  },
                  {
                    key: 'course',
                    label: 'Học phần',
                    children: sections.data?.find(
                      (s) => s._id === detail.data?.courseSectionId,
                    )?.code,
                  },
                  {
                    key: 'receipt',
                    label: 'Biên nhận',
                    children: (
                      <Typography.Text className="break-all" copyable>
                        {detail.data.receiptCode}
                      </Typography.Text>
                    ),
                  },
                  {
                    key: 'version',
                    label: 'Phiên bản mới nhất',
                    children: detail.data.latestVersion,
                  },
                ]}
              />
              <h3 className="mb-7">Lịch sử phiên bản</h3>
              <Timeline
                items={detail.data.versions?.map((v) => ({
                  color: v.isLatest ? 'green' : 'gray',
                  content: (
                    <div className="pb-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>Phiên bản {v.version}</strong>
                        {v.isLatest && <Tag color="green">Mới nhất</Tag>}
                        <Tag color={v.late ? 'orange' : 'default'}>
                          {v.late ? 'Trễ hạn' : 'Đúng hạn'}
                        </Tag>
                      </div>
                      <GradingForm
                        key={`${selectedId}-${v.version}`}
                        submissionId={selectedId!}
                        version={v}
                      />
                      <p className="mt-2 mb-4 text-sm text-muted">
                        {dateTime(v.submittedAt)} · {v.fullName}
                        {v.email ? ` · ${v.email}` : ''}
                      </p>
                      <FileList
                        files={v.files}
                        action={(f, index) => (
                          <Tooltip title="Tải file">
                            <Button
                              aria-label={`Tải ${f.originalName} phiên bản ${v.version}`}
                              icon={<DownloadOutlined />}
                              disabled={
                                !!busy && busy !== `${v.version}-${index}`
                              }
                              loading={busy === `${v.version}-${index}`}
                              onClick={() =>
                                void save(
                                  `/lecturer/submissions/${selectedId}/file`,
                                  f.originalName,
                                  `${v.version}-${index}`,
                                  {
                                    version: v.version,
                                    fileIndex: index,
                                  },
                                )
                              }
                            />
                          </Tooltip>
                        )}
                      />
                      {v.note && (
                        <p className="mt-3 text-sm text-muted">
                          Ghi chú: {v.note}
                        </p>
                      )}
                    </div>
                  ),
                }))}
              />
            </>
          )}
        </QueryState>
      </Drawer>
    </>
  );
}
