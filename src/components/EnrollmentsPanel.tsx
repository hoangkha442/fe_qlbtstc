import AllSelect from './AllSelect';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Popconfirm, Select, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errorMessage, get } from '../lib/api';
import type { Enrollment, Page, StudentAccount } from '../lib/types';
import { QueryState } from './common';
export default function EnrollmentsPanel({
  pathId,
  archived,
}: {
  pathId: string;
  archived?: boolean;
}) {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [studentId, setStudentId] = useState<string>();
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<string>();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  const students = useQuery({
    queryKey: ['lecturer', 'students', 'enrollment-options', debounced],
    queryFn: ({ signal }) =>
      get<Page<StudentAccount>>(
        '/lecturer/students',
        {
          active: 'true',
          limit: 100,
          search: debounced || undefined,
        },
        signal,
      ),
  });
  const list = useQuery({
    queryKey: ['lecturer', 'enrollments', pathId, page, active],
    queryFn: ({ signal }) =>
      get<Page<Enrollment>>(
        `/lecturer/learning-paths/${pathId}/enrollments`,
        {
          page,
          limit: 10,
          active,
        },
        signal,
      ),
  });
  async function enroll(id: string, enabled: boolean) {
    setBusy(id);
    setError('');
    try {
      await api.post(`/lecturer/learning-paths/${pathId}/enrollments`, {
        studentId: id,
        active: enabled,
      });
      setStudentId(undefined);
      await client.invalidateQueries({
        queryKey: ['lecturer', 'enrollments', pathId],
      });
      await client.invalidateQueries({
        queryKey: ['student'],
      });
      void message.success(
        enabled
          ? 'Đã cấp quyền học lộ trình.'
          : 'Đã thu hồi quyền học lộ trình.',
      );
    } catch (err) {
      setError(errorMessage(err));
      void message.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="surface p-5 sm:p-6">
      <h2>Ghi danh vào lộ trình</h2>
      <p className="mt-2 mb-6 text-muted">
        Sinh viên được ghi danh có thể xem đầy đủ bài học và tài liệu đã công
        bố. Thu hồi quyền học vẫn giữ lịch sử tiến độ.
      </p>
      <div className="mb-5 flex flex-wrap gap-3">
        <Select
          className="min-w-0 flex-1"
          style={{
            minWidth: 220,
          }}
          showSearch
          placeholder="Tìm sinh viên theo tên, MSSV hoặc tài khoản"
          aria-label="Sinh viên cần ghi danh"
          value={studentId}
          filterOption={false}
          onSearch={setSearch}
          onChange={setStudentId}
          loading={students.isFetching}
          disabled={archived || !!busy}
          options={students.data?.items.map((s) => ({
            value: s._id,
            label: `${s.studentCode} · ${s.fullName} (${s.username})`,
          }))}
          notFoundContent={
            students.error
              ? 'Chưa tải được sinh viên'
              : students.isFetching
                ? 'Đang tìm…'
                : 'Không có sinh viên phù hợp'
          }
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!studentId || archived || !!busy}
          loading={!!busy && busy === studentId}
          onClick={() => studentId && void enroll(studentId, true)}
        >
          Ghi danh sinh viên
        </Button>
      </div>
      {students.error && (
        <Alert
          className="mb-4"
          showIcon
          type="error"
          title="Chưa tải được danh sách tài khoản"
          description={errorMessage(students.error)}
          action={
            <Button onClick={() => void students.refetch()}>Thử lại</Button>
          }
        />
      )}
      {error && <Alert className="mb-4" showIcon type="error" title={error} />}
      <div className="mb-4 flex justify-end">
        <AllSelect
          aria-label="Trạng thái ghi danh"
          value={active}
          allowClear
          className="w-48"
          allLabel="Tất cả ghi danh"
          onChange={(v?: string) => {
            setActive(v);
            setPage(1);
          }}
          options={[
            {
              value: 'true',
              label: 'Đang được học',
            },
            {
              value: 'false',
              label: 'Đã thu hồi quyền',
            },
          ]}
        />
      </div>
      <QueryState
        pending={list.isPending}
        error={list.error}
        retry={() => void list.refetch()}
      >
        <Table<Enrollment>
          rowKey="_id"
          scroll={{
            x: 650,
          }}
          dataSource={list.data?.items}
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
              render: (_, e) => (
                <>
                  <strong>
                    {e.studentId?.fullName ?? 'Tài khoản không còn tồn tại'}
                  </strong>
                  <p className="mt-1 text-xs text-muted">
                    {e.studentId?.studentCode} · {e.studentId?.username}
                  </p>
                </>
              ),
            },
            {
              title: 'EMAIL',
              key: 'email',
              render: (_, e) => e.studentId?.email ?? '—',
            },
            {
              title: 'QUYỀN HỌC',
              key: 'active',
              render: (_, e) => (
                <>
                  <Tag color={e.active ? 'green' : 'default'}>
                    {e.active ? 'Đang được học' : 'Đã thu hồi'}
                  </Tag>
                  {e.studentId && !e.studentId.active && (
                    <Tag className="ml-1">Tài khoản khóa</Tag>
                  )}
                </>
              ),
            },
            {
              title: 'THAO TÁC',
              key: 'actions',
              render: (_, e) => (
                <Popconfirm
                  title={
                    e.active
                      ? 'Thu hồi quyền học của sinh viên?'
                      : 'Cấp lại quyền học cho sinh viên?'
                  }
                  onConfirm={() =>
                    e.studentId && enroll(e.studentId._id, !e.active)
                  }
                >
                  <Button
                    size="small"
                    danger={e.active}
                    disabled={!e.studentId || archived || !!busy}
                    loading={busy === e.studentId?._id}
                  >
                    {e.active ? 'Thu hồi quyền' : 'Cấp lại quyền'}
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </QueryState>
    </section>
  );
}
