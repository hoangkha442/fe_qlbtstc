import { useQuery } from '@tanstack/react-query';
import { Button, Table, Tag } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { get } from '../../lib/api';
import type { Assignment, Dashboard, Page, Submission } from '../../lib/types';
import { dateTime, statusOf } from '../../lib/utils';
import { PageHeading, QueryState, StatusTag } from '../../components/common';

export default function DashboardPage() {
  const stats = useQuery({
    queryKey: ['lecturer', 'dashboard'],
    queryFn: () => get<Dashboard>('/lecturer/dashboard'),
  });
  const submissions = useQuery({
    queryKey: ['lecturer', 'recent-submissions'],
    queryFn: () => get<Page<Submission>>('/lecturer/submissions', { limit: 5 }),
  });
  const assignments = useQuery({
    queryKey: ['lecturer', 'recent-assignments'],
    queryFn: () => get<Page<Assignment>>('/lecturer/assignments', { limit: 4 }),
  });
  const s = stats.data;
  const onTime = s ? s.submissions - s.lateSubmissions : 0;
  const percent = s?.submissions
    ? Math.round((onTime / s.submissions) * 100)
    : 0;
  return (
    <>
      <PageHeading
        title="Tổng quan"
        description="Thống kê bài tập và bài nộp Đại cương."
        extra={
          <Link to="/lecturer/assignments?create=1">
            <Button type="primary" size="large" icon={<PlusOutlined />}>
              Tạo bài tập
            </Button>
          </Link>
        }
      />
      <QueryState
        pending={stats.isPending}
        error={stats.error}
        retry={() => void stats.refetch()}
      >
        <div className="stats-grid">
          {[
            {
              label: 'Lớp học phần',
              value: s?.courseSections,
              icon: <ReadOutlined />,
              note: 'Học phần đang hoạt động',
              color: 'blue',
            },
            {
              label: 'Bài tập',
              value: s?.assignments,
              icon: <FileTextOutlined />,
              note: 'Bài tập chưa lưu trữ',
              color: 'violet',
            },
            {
              label: 'Bài đã nộp',
              value: s?.submissions,
              icon: <FileDoneOutlined />,
              note: 'Tính theo bài tập và MSSV',
              color: 'green',
            },
            {
              label: 'Phiên bản bài nộp',
              value: s?.versions,
              icon: <BookOutlined />,
              note: 'Bao gồm các lần nộp lại',
              color: 'orange',
            },
          ].map((item) => (
            <div className="stat-card surface" key={item.label}>
              <div className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className={`stat-icon ${item.color}`}>{item.icon}</span>
              </div>
              <strong>{item.value ?? '—'}</strong>
              <small>{item.note}</small>
            </div>
          ))}
        </div>
      </QueryState>
      <div className="dashboard-middle">
        <section className="surface dashboard-table">
          <div className="panel-heading">
            <div>
              <h2>Bài nộp gần đây</h2>
              <p>Các bài nộp mới nhất trong học phần của bạn</p>
            </div>
            <Link to="/lecturer/submissions">
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                iconPlacement="end"
              >
                Xem tất cả
              </Button>
            </Link>
          </div>
          <QueryState
            pending={submissions.isPending}
            error={submissions.error}
            retry={() => void submissions.refetch()}
          >
            <Table<Submission>
              rowKey="_id"
              size="middle"
              scroll={{ x: 560 }}
              dataSource={submissions.data?.items}
              pagination={false}
              columns={[
                {
                  title: 'SINH VIÊN',
                  key: 'student',
                  render: (_, row) => (
                    <Link to={`/lecturer/submissions?submissionId=${row._id}`}>
                      <strong className="text-ink">{row.fullName}</strong>
                      <div className="mt-1 text-xs text-muted">
                        {row.studentCodeNormalized}
                      </div>
                    </Link>
                  ),
                },
                {
                  title: 'THỜI GIAN NỘP',
                  dataIndex: 'submittedAt',
                  render: (value: string) => (
                    <span className="text-sm">{dateTime(value)}</span>
                  ),
                },
                {
                  title: 'TRẠNG THÁI',
                  dataIndex: 'late',
                  render: (late: boolean) => (
                    <Tag color={late ? 'orange' : 'green'}>
                      {late ? 'Trễ hạn' : 'Đúng hạn'}
                    </Tag>
                  ),
                },
              ]}
            />
          </QueryState>
        </section>
        <section className="surface submission-chart">
          <h2>Tình hình nộp bài</h2>
          <p>Tính trên phiên bản mới nhất</p>
          <div
            className="donut"
            style={{
              background: s?.submissions
                ? `conic-gradient(var(--success) 0 ${percent}%, var(--warning) ${percent}% 100%)`
                : '#edf1f6',
            }}
          >
            <div>
              <strong>{s?.submissions ?? 0}</strong>
              <span>bài đã nộp</span>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="bg-green-700" />
              Đúng hạn<strong>{onTime}</strong>
            </span>
            <span>
              <i className="bg-amber-700" />
              Trễ hạn<strong>{s?.lateSubmissions ?? 0}</strong>
            </span>
          </div>
          <p className="chart-footnote">
            Thống kê chỉ bao gồm sinh viên đã nộp bài.
          </p>
        </section>
      </div>
      <section className="surface mt-6">
        <div className="panel-heading">
          <div>
            <h2>Bài tập mới tạo</h2>
            <p>Theo dõi trạng thái và thời gian nhận bài</p>
          </div>
          <Link to="/lecturer/assignments">
            <Button
              type="link"
              icon={<ArrowRightOutlined />}
              iconPlacement="end"
            >
              Quản lý bài tập
            </Button>
          </Link>
        </div>
        <div className="px-6 pb-6">
          <QueryState
            pending={assignments.isPending}
            error={assignments.error}
            empty={assignments.data?.items.length === 0}
            emptyText="Bạn chưa tạo bài tập nào."
            retry={() => void assignments.refetch()}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {assignments.data?.items.map((a) => (
                <div className="dashboard-assignment" key={a._id}>
                  <div className="flex items-center justify-between gap-3">
                    <StatusTag status={statusOf(a)} />
                    <span className="text-xs text-muted">
                      {a.allowedExtensions.map((e) => `.${e}`).join(' / ')}
                    </span>
                  </div>
                  <Link to={`/lecturer/assignments?edit=${a._id}`}>
                    <h3>{a.title}</h3>
                  </Link>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      Hạn nộp: {dateTime(a.dueAt)}
                    </span>
                    <Link
                      to={`/lecturer/submissions?assignmentId=${a._id}`}
                      className="text-sm"
                    >
                      Xem bài nộp <ArrowRightOutlined />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </QueryState>
        </div>
      </section>
    </>
  );
}
