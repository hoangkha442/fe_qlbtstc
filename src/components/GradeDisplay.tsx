import { Tag } from 'antd';
import type { SubmissionGrade } from '../lib/types';
import { dateTime } from '../lib/utils';

const scoreLabel = (score: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(score);

export function GradeTag({ grade }: { grade?: SubmissionGrade | null }) {
  return grade ? (
    <Tag color="blue">{scoreLabel(grade.score)} / 10</Tag>
  ) : (
    <Tag>Chưa chấm</Tag>
  );
}

export default function GradeDisplay({
  grade,
}: {
  grade?: SubmissionGrade | null;
}) {
  return (
    <section
      className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
      aria-label="Kết quả chấm bài"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-base font-semibold">Kết quả chấm bài</h3>
        {grade ? (
          <strong className="text-2xl text-primary">
            {scoreLabel(grade.score)}{' '}
            <span className="text-base font-medium text-muted">/ 10</span>
          </strong>
        ) : (
          <span className="font-medium">Chưa chấm</span>
        )}
      </div>
      {grade && (
        <>
          {grade.feedback && (
            <p className="mt-3 mb-0 whitespace-pre-wrap break-words">
              {grade.feedback}
            </p>
          )}
          <p className="mt-3 mb-0 text-sm text-muted">
            Chấm lúc {dateTime(grade.gradedAt)}
          </p>
        </>
      )}
    </section>
  );
}
