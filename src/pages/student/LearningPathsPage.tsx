import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Pagination, Tag } from 'antd';
import {
  ArrowRightOutlined,
  CodeOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { allPages, get } from '../../lib/api';
import AllSelect from '../../components/AllSelect';
import type { LearningPath, Page } from '../../lib/types';
import { useStudentAuth } from '../../lib/student-context';
import { PageHeading, QueryState } from '../../components/common';
import { levels, safeHttps } from '../../lib/learning';

export default function LearningPathsPage() {
  const { student } = useStudentAuth();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPath, setSelectedPath] = useState<string>();
  const [page, setPage] = useState(1);
  const paths = useQuery({
    queryKey: ['student', 'paths', student?.id, page, search],
    queryFn: ({ signal }) =>
      get<Page<LearningPath>>(
        '/student/learning-paths',
        { page, limit: 9, search: search || undefined },
        signal,
      ),
    enabled: !selectedPath,
  });
  const options = useQuery({
    queryKey: ['student', 'path-options', student?.id],
    queryFn: ({ signal }) =>
      allPages<LearningPath>('/student/learning-paths', {}, signal),
  });
  const items = selectedPath
    ? options.data?.filter((path) => path._id === selectedPath)
    : paths.data?.items;
  const total = selectedPath ? (items?.length ?? 0) : (paths.data?.total ?? 0);
  return (
    <>
      <PageHeading
        eyebrow="CHUYÊN NGÀNH CNTT"
        title="Lộ trình học của bạn"
        description={`Chào ${student?.fullName ?? 'bạn'}, chọn lộ trình để bắt đầu hoặc tiếp tục việc học.`}
      />
      <div className="learning-catalog-toolbar">
        <AllSelect
          aria-label="Lộ trình hiển thị"
          allLabel="Tất cả lộ trình"
          value={selectedPath}
          showSearch
          optionFilterProp="label"
          loading={options.isFetching}
          options={options.data?.map((path) => ({
            value: path._id,
            label: path.title,
          }))}
          onChange={(value) => {
            setSelectedPath(value);
            setSearch('');
            setSearchInput('');
            setPage(1);
          }}
        />
        <Input.Search
          allowClear
          placeholder="Tìm lộ trình…"
          aria-label="Tìm lộ trình"
          className="max-w-sm"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(v) => {
            setSearch(v.trim());
            setSelectedPath(undefined);
            setPage(1);
          }}
        />
        <span className="text-sm text-muted">
          {total} lộ trình được hiển thị
        </span>
      </div>
      <QueryState
        pending={selectedPath ? options.isPending : paths.isPending}
        error={selectedPath ? options.error : paths.error}
        retry={() => {
          void paths.refetch();
          void options.refetch();
        }}
        empty={!items?.length}
        emptyText="Chưa có lộ trình được công bố. Giảng viên sẽ bổ sung nội dung học tại đây."
      >
        <div className="learning-path-grid">
          {items?.map((path) => (
            <article className="surface learning-path-card" key={path._id}>
              <Link
                to={`/specialized/paths/${path._id}`}
                className="path-cover"
                aria-label={`Mở ${path.title}`}
              >
                {safeHttps(path.coverUrl) ? (
                  <img
                    src={safeHttps(path.coverUrl)}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <CodeOutlined />
                )}
                <Tag color={path.enrolled ? 'green' : 'blue'}>
                  {path.enrolled ? 'Đã ghi danh' : 'Có thể xem trước'}
                </Tag>
              </Link>
              <div className="path-card-content">
                <div className="eyebrow">{levels[path.level]}</div>
                <h2>
                  <Link to={`/specialized/paths/${path._id}`}>
                    {path.title}
                  </Link>
                </h2>
                <p>
                  {path.summary ||
                    'Khám phá chương học, bài giảng và tài liệu trong lộ trình.'}
                </p>
                {!path.enrolled && (
                  <div className="mb-4 text-xs text-muted">
                    <LockOutlined /> Liên hệ giảng viên để ghi danh học đầy đủ.
                  </div>
                )}
                <Link to={`/specialized/paths/${path._id}`}>
                  <Button
                    icon={<ArrowRightOutlined />}
                    iconPlacement="end"
                    type={path.enrolled ? 'primary' : 'default'}
                  >
                    {path.enrolled ? 'Vào lộ trình' : 'Khám phá lộ trình'}
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </QueryState>
      {total > 9 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            current={page}
            total={total}
            pageSize={9}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      )}
    </>
  );
}
