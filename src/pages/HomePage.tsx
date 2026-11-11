import { useQuery } from '@tanstack/react-query';
import { Button, Select, Pagination } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { allPages, get } from '../lib/api';
import type {
  Semester,
  Catalog,
  CourseSection,
  Assignment,
  Page,
} from '../lib/types';
import { dateTime, refId, refName, statusOf } from '../lib/utils';
import { PageHeading, QueryState, StatusTag } from '../components/common';
import CategoryNavigation from '../components/CategoryNavigation';
import AllSelect from '../components/AllSelect';
import { LearningText } from '../components/LearningContent';

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const semesters = useQuery({
    queryKey: ['public', 'semesters'],
    queryFn: ({ signal }) =>
      get<Semester[]>('/public/semesters', undefined, signal),
  });
  const semesterId = params.get('semesterId') || semesters.data?.[0]?._id;
  const classId = params.get('classId') || undefined;
  const sectionId = params.get('sectionId') || undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const classes = useQuery({
    queryKey: ['public', 'classes', semesterId],
    queryFn: ({ signal }) =>
      get<Catalog[]>('/public/classes', { semesterId }, signal),
    enabled: !!semesterId,
  });
  const sections = useQuery({
    queryKey: ['public', 'sections', semesterId, classId, page],
    queryFn: ({ signal }) =>
      get<Page<CourseSection>>(
        '/public/course-sections',
        { semesterId, classId, page, limit: 9 },
        signal,
      ),
    enabled: !!semesterId && !sectionId,
  });
  const sectionOptions = useQuery({
    queryKey: ['public', 'section-options', semesterId, classId],
    queryFn: ({ signal }) =>
      allPages<CourseSection>(
        '/public/course-sections',
        { semesterId, classId },
        signal,
      ),
    enabled: !!semesterId,
  });
  const assignments = useQuery({
    queryKey: ['public', 'assignments', sectionId, page],
    queryFn: ({ signal }) =>
      get<Page<Assignment>>(
        '/public/assignments',
        { courseSectionId: sectionId, page, limit: 9 },
        signal,
      ),
    enabled: !!sectionId,
  });
  const activeSemester = semesters.data?.find((s) => s._id === semesterId);
  const activeSection = sectionOptions.data?.find((s) => s._id === sectionId);
  function change(values: Record<string, string | undefined>) {
    setParams(
      Object.fromEntries(
        Object.entries(values).filter(
          (entry): entry is [string, string] => !!entry[1],
        ),
      ),
    );
  }
  const current = sectionId ? assignments : sections;
  return (
    <>
      <CategoryNavigation />
      <PageHeading title="Nộp bài tập" />
      <section className="surface filter-panel" aria-label="Chọn lớp học phần">
        <div className="filter-heading">
          <span>
            <span className="tiny-square">
              <FolderOpenOutlined />
            </span>
            Tìm nơi nộp bài
          </span>
          <Button type="link" onClick={() => setParams({})}>
            Đặt lại
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="semester-select">Học kỳ</label>
            <Select
              id="semester-select"
              className="w-full"
              size="large"
              aria-label="Học kỳ"
              value={semesterId}
              loading={semesters.isPending}
              placeholder="Chọn học kỳ"
              options={semesters.data?.map((s) => ({
                value: s._id,
                label: `${s.name} · ${s.academicYear}`,
              }))}
              onChange={(value: string) => change({ semesterId: value })}
              suffixIcon={<CalendarOutlined />}
            />
          </div>
          <div>
            <label htmlFor="class-select">Lớp của bạn</label>
            <AllSelect
              id="class-select"
              className="w-full"
              size="large"
              aria-label="Lớp của bạn"
              value={classId}
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!semesterId}
              loading={classes.isFetching}
              allLabel="Tất cả lớp"
              options={classes.data?.map((c) => ({
                value: c._id,
                label: c.name,
              }))}
              onChange={(value?: string) =>
                change({ semesterId, classId: value })
              }
              suffixIcon={<TeamOutlined />}
            />
          </div>
          <div>
            <label htmlFor="section-select">Lớp học phần</label>
            <AllSelect
              id="section-select"
              className="w-full"
              size="large"
              aria-label="Lớp học phần"
              value={sectionId}
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!semesterId}
              loading={sectionOptions.isFetching}
              allLabel="Tất cả học phần"
              options={sectionOptions.data?.map((s) => ({
                value: s._id,
                label: `${refName(s.subjectId)} · ${s.code}`,
              }))}
              onChange={(value?: string) =>
                change({ semesterId, classId, sectionId: value })
              }
              suffixIcon={<BookOutlined />}
            />
          </div>
        </div>
      </section>
      {(classes.error || sectionOptions.error) && (
        <div className="mt-5">
          <QueryState
            pending={false}
            error={classes.error || sectionOptions.error}
            retry={() => {
              void classes.refetch();
              void sectionOptions.refetch();
            }}
          >
            {null}
          </QueryState>
        </div>
      )}
      <section className="listing-section">
        <div className="listing-heading">
          <div>
            <div className="eyebrow">
              {activeSemester
                ? `${activeSemester.name} · Năm học ${activeSemester.academicYear}`
                : 'KHÁM PHÁ LỚP HỌC'}
            </div>
            <h2>
              {sectionId ? 'Bài tập của học phần' : 'Lớp học phần'}{' '}
              <span className="count-badge">{current.data?.total ?? '—'}</span>
            </h2>
            <p>
              {sectionId
                ? (activeSection?.name ??
                  'Chọn bài tập để xem hướng dẫn và nộp bài.')
                : 'Chọn học phần của bạn để xem các bài tập đang nhận bài.'}
            </p>
          </div>
          {sectionId && (
            <Button onClick={() => change({ semesterId, classId })}>
              Tất cả học phần
            </Button>
          )}
        </div>
        <QueryState
          pending={semesters.isPending || (!!semesterId && current.isPending)}
          error={semesters.error || current.error}
          retry={() => {
            void semesters.refetch();
            void current.refetch();
          }}
          empty={!semesterId || current.data?.items.length === 0}
          emptyText={
            sectionId
              ? 'Học phần này chưa có bài tập.'
              : 'Chưa có lớp học phần trong lựa chọn này.'
          }
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sectionId
              ? assignments.data?.items.map((a) => {
                  const status = statusOf(a);
                  return (
                    <article className="assignment-card surface" key={a._id}>
                      <StatusTag status={status} />
                      <div className="card-code">
                        BÀI TẬP · {activeSection?.code ?? 'HỌC PHẦN'}
                      </div>
                      <h3>
                        <Link to={`/assignments/${a._id}`}>{a.title}</Link>
                      </h3>
                      <div className="card-description">
                        <LearningText>
                          {a.instructions ||
                            'Xem chi tiết để biết hướng dẫn nộp bài.'}
                        </LearningText>
                      </div>
                      <div className="assignment-deadline">
                        <ClockCircleOutlined />
                        <span>
                          Hạn nộp<strong>{dateTime(a.dueAt)}</strong>
                        </span>
                      </div>
                      <div className="card-bottom">
                        <span>
                          {a.allowedExtensions
                            .map((ext) => `.${ext}`)
                            .join(' / ')}
                        </span>
                        <Link to={`/assignments/${a._id}`}>
                          <Button
                            type={status.accepting ? 'primary' : 'default'}
                            icon={<ArrowRightOutlined />}
                            iconPlacement="end"
                          >
                            {status.accepting ? 'Nộp bài' : 'Xem bài tập'}
                          </Button>
                        </Link>
                      </div>
                    </article>
                  );
                })
              : sections.data?.items.map((s) => (
                  <article key={s._id} className="course-card surface">
                    <div className="card-code">{s.code}</div>
                    <h3>{s.name}</h3>
                    <p className="card-description">{refName(s.subjectId)}</p>
                    <div className="course-meta">
                      <span>
                        <TeamOutlined /> {refName(s.classId)}
                      </span>
                      <span>{refName(s.lecturerId)}</span>
                    </div>
                    <button
                      className="course-action"
                      onClick={() =>
                        change({
                          semesterId: refId(s.semesterId),
                          classId: refId(s.classId),
                          sectionId: s._id,
                        })
                      }
                    >
                      Xem bài tập <ArrowRightOutlined />
                    </button>
                  </article>
                ))}
          </div>
          {(current.data?.total ?? 0) > 9 && (
            <Pagination
              className="mt-8 justify-end"
              current={page}
              total={current.data?.total}
              pageSize={9}
              showSizeChanger={false}
              onChange={(value) => {
                const next = new URLSearchParams(params);
                next.set('page', String(value));
                setParams(next);
              }}
            />
          )}
        </QueryState>
      </section>
    </>
  );
}
