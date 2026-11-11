import { useState } from 'react';
import { Button, Pagination, Tag } from 'antd';
import { Link } from 'react-router-dom';
import type { SourceAssignment } from '../lib/types';
import { dateTime, statusOf } from '../lib/utils';
import { StatusTag } from './common';

export default function StudentAssignmentsPanel({
  assignments,
  title = 'Bài tập mã nguồn',
}: {
  assignments: SourceAssignment[];
  title?: string;
}) {
  const [page, setPage] = useState(1);
  return (
    <section className="surface mt-6 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2>{title}</h2>
        <Tag>ZIP mã nguồn</Tag>
      </div>
      {!assignments.length && (
        <p className="text-muted">Chưa có bài tập tại đây.</p>
      )}
      <div className="space-y-4">
        {assignments.slice((page - 1) * 6, page * 6).map((a) => (
          <div className="source-assignment-row" key={a._id}>
            <div className="min-w-0 flex-1">
              <h3>{a.title}</h3>
              <p className="mt-2 text-sm text-muted">
                Hạn nộp: {dateTime(a.dueAt)}
              </p>
            </div>
            <StatusTag status={statusOf(a)} />
            <Link to={`/specialized/assignments/${a._id}`}>
              <Button>Mở bài tập</Button>
            </Link>
          </div>
        ))}
      </div>
      {assignments.length > 6 && (
        <Pagination
          className="mt-5"
          current={page}
          total={assignments.length}
          pageSize={6}
          onChange={setPage}
          showSizeChanger={false}
        />
      )}
    </section>
  );
}
