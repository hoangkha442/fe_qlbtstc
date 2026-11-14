import AllSelect from '../../components/AllSelect';
import GradingForm from '../../components/GradingForm';
import { GradeTag } from '../../components/GradeDisplay';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Input,
  Space,
  Table,
  Tag,
  Timeline,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { allPages, download, errorMessage, get } from '../../lib/api';
import type { Page, SourceAssignment, Submission } from '../../lib/types';
import { PageHeading, QueryState, FileList } from '../../components/common';
import { dateTime } from '../../lib/utils';
export default function SpecializedSubmissionsPage() {
  const { notification } = App.useApp();
  const [params, setParams] = useSearchParams();
  const assignmentId = params.get('assignmentId') || undefined;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState('');
  const assignments = useQuery({
    queryKey: ['lecturer', 'source-assignment-options'],
    queryFn: ({ signal }) =>
      allPages<SourceAssignment>(
        '/lecturer/specialized/assignments',
        {
          archived: 'all',
        },
        signal,
      ),
  });
  const list = useQuery({
    queryKey: ['lecturer', 'source-submissions', assignmentId, search, page],
    queryFn: ({ signal }) =>
      get<Page<Submission>>(
        '/lecturer/specialized/submissions',
        {
          assignmentId,
          search: search || undefined,
          page,
          limit: 10,
        },
        signal,
      ),
  });
  const detail = useQuery({
    queryKey: ['lecturer', 'source-submission', selected],
    queryFn: ({ signal }) =>
      get<Submission>(`/lecturer/submissions/${selected}`, undefined, signal),
    enabled: !!selected,
  });
  async function save(
    url: string,
    filename: string,
    key: string,
    query?: Record<string, unknown>,
  ) {
    if (busy) return;
    setBusy(key);
    try {
      await download(url, filename, query);
      notification.success({
        title: 'Đã tải file',
        description: filename,
      });
    } catch (err) {
      notification.error({
        title: 'Chưa tải được file',
        description: errorMessage(err),
      });
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <PageHeading
        title="Bài nộp mã nguồn"
        description="Xem các phiên bản ZIP của sinh viên trong các lộ trình Chuyên ngành."
        extra={
          <Space wrap>
            <Button
              icon={<FileZipOutlined />}
              disabled={!assignmentId || !!busy}
              loading={busy === 'zip'}
              onClick={() =>
                assignmentId &&
                void save(
                  `/lecturer/assignments/${assignmentId}/submissions.zip`,
                  'bai-nop-ma-nguon.zip',
                  'zip',
                )
              }
            >
              Tải ZIP
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              disabled={!assignmentId || !!busy}
              loading={busy === 'excel'}
              onClick={() =>
                assignmentId &&
                void save(
                  `/lecturer/assignments/${assignmentId}/submissions.xlsx`,
                  'danh-sach-bai-nop.xlsx',
                  'excel',
                )
              }
            >
              Xuất Excel
            </Button>
          </Space>
        }
      />
      <section className="surface">
        <div className="table-toolbar">
          <Input.Search
            className="max-w-sm"
            aria-label="Tìm bài nộp mã nguồn"
            placeholder="MSSV hoặc họ tên…"
            allowClear
            onSearch={(v) => {
              setSearch(v.trim());
              setPage(1);
            }}
          />
          <AllSelect
            className="w-72"
            aria-label="Lọc bài tập mã nguồn"
            allowClear
            showSearch
            optionFilterProp="label"
            allLabel="Tất cả bài tập"
            value={assignmentId}
            options={assignments.data?.map((a) => ({
              value: a._id,
              label: a.title,
            }))}
            onChange={(v?: string) => {
              setParams(
                v
                  ? {
                      assignmentId: v,
                    }
                  : {},
              );
              setPage(1);
            }}
          />
        </div>
        <QueryState
          pending={list.isPending}
          error={list.error || assignments.error}
          retry={() => {
            void list.refetch();
            void assignments.refetch();
          }}
        >
          <Table<Submission>
            rowKey="_id"
            dataSource={list.data?.items}
            scroll={{
              x: 800,
            }}
            pagination={{
              current: page,
              pageSize: 10,
              total: list.data?.total,
              onChange: setPage,
              showSizeChanger: false,
            }}
            columns={[
              {
                title: 'SINH VIÊN',
                key: 'student',
                render: (_, s) => (
                  <>
                    <strong>{s.fullName}</strong>
                    <p className="mt-1 text-xs text-muted">
                      {s.studentCodeNormalized} · {s.email}
                    </p>
                  </>
                ),
              },
              {
                title: 'BÀI TẬP',
                key: 'assignment',
                render: (_, s) =>
                  assignments.data?.find((a) => a._id === s.assignmentId)
                    ?.title ?? 'Bài tập',
              },
              {
                title: 'THỜI GIAN',
                key: 'time',
                render: (_, s) => dateTime(s.submittedAt),
              },
              {
                title: 'PHIÊN BẢN',
                dataIndex: 'latestVersion',
              },
              {
                title: 'ĐIỂM',
                key: 'grade',
                render: (_, s) => <GradeTag grade={s.grade} />,
              },
              {
                title: 'TRẠNG THÁI',
                key: 'late',
                render: (_, s) => (
                  <Tag color={s.late ? 'orange' : 'green'}>
                    {s.late ? 'Trễ hạn' : 'Đúng hạn'}
                  </Tag>
                ),
              },
              {
                title: '',
                key: 'action',
                render: (_, s) => (
                  <Button onClick={() => setSelected(s._id)}>Xem bài</Button>
                ),
              },
            ]}
          />
        </QueryState>
      </section>
      <Drawer
        title="Chi tiết bài nộp mã nguồn"
        open={!!selected}
        onClose={() => setSelected(undefined)}
        size={720}
        destroyOnHidden
      >
        <QueryState
          pending={detail.isPending}
          error={detail.error}
          retry={() => void detail.refetch()}
        >
          {detail.data && (
            <>
              <Descriptions
                column={1}
                items={[
                  {
                    key: 'name',
                    label: 'Sinh viên',
                    children: `${detail.data.studentCodeNormalized} · ${detail.data.fullName}`,
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    children: detail.data.email,
                  },
                  {
                    key: 'assignment',
                    label: 'Bài tập',
                    children: assignments.data?.find(
                      (a) => a._id === detail.data?.assignmentId,
                    )?.title,
                  },
                ]}
              />
              <Timeline
                className="mt-8"
                items={detail.data.versions?.map((v) => ({
                  color: v.isLatest ? 'green' : 'gray',
                  content: (
                    <div className="pb-5">
                      <h3>
                        Phiên bản {v.version}{' '}
                        {v.isLatest && <Tag color="green">Mới nhất</Tag>}
                      </h3>
                      <GradingForm
                        key={`${selected}-${v.version}`}
                        submissionId={selected!}
                        version={v}
                      />
                      <p className="my-3 text-muted">
                        {dateTime(v.submittedAt)} ·{' '}
                        {v.late ? 'Trễ hạn' : 'Đúng hạn'}
                      </p>
                      {v.note && (
                        <p className="mb-4 whitespace-pre-wrap">{v.note}</p>
                      )}
                      <FileList
                        files={v.files}
                        action={(f, i) => (
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            loading={busy === `${v.version}-${i}`}
                            disabled={!!busy}
                            onClick={() =>
                              void save(
                                `/lecturer/submissions/${selected}/file`,
                                f.originalName,
                                `${v.version}-${i}`,
                                {
                                  version: v.version,
                                  fileIndex: i,
                                },
                              )
                            }
                          >
                            Tải ZIP
                          </Button>
                        )}
                      />
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
