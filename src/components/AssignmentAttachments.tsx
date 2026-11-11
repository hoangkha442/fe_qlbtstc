import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Form, Select, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { allPages, errorMessage } from '../lib/api';
import type { SourceAssignment } from '../lib/types';
import { dayjs, TIMEZONE } from '../lib/utils';
import AssignmentContentFields from './AssignmentContentFields';
import { ImportantNotice } from './common';

export default function AssignmentAttachments({
  pathId,
  existing = [],
}: {
  pathId: string;
  existing?: SourceAssignment[];
}) {
  const options = useQuery({
    queryKey: ['lecturer', 'assignment-link-options', pathId],
    queryFn: ({ signal }) =>
      allPages<SourceAssignment>(
        '/lecturer/specialized/assignments',
        { pathId },
        signal,
      ),
  });
  return (
    <section className="assignment-attachments">
      <h3>Bài tập mã nguồn</h3>
      <p className="mb-4 text-muted">
        Thêm bài tập mới hoặc liên kết bài tập trong cùng lộ trình. Mỗi lần nộp
        nhận một file ZIP tối đa 10 MB.
      </p>
      {!!existing.length && (
        <div
          className="existing-assignments"
          aria-label="Bài tập đang liên kết"
        >
          {existing.map((assignment) => (
            <Tag
              key={assignment._id}
              color={assignment.archived ? 'default' : 'blue'}
            >
              {assignment.title}
              {assignment.archived ? ' · Lưu trữ' : ''}
            </Tag>
          ))}
        </div>
      )}
      <Form.Item name="assignmentIds" label="Liên kết bài tập có sẵn">
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          placeholder="Chọn bài tập trong lộ trình"
          allowClear
          loading={options.isFetching}
          options={options.data
            ?.filter(
              (assignment) =>
                !existing.some((current) => current._id === assignment._id),
            )
            .map((assignment) => ({
              value: assignment._id,
              label: assignment.title,
            }))}
          maxCount={50}
        />
      </Form.Item>
      {options.error && (
        <Alert
          className="mb-4"
          showIcon
          type="error"
          title="Chưa tải được bài tập để liên kết"
          description={errorMessage(options.error)}
          action={
            <Button onClick={() => void options.refetch()}>Thử lại</Button>
          }
        />
      )}
      <div className="mb-5">
        <ImportantNotice>
          Bài tập có sẵn được chọn sẽ chuyển sang chương/bài học này. Các phiên
          bản sinh viên đã nộp vẫn được giữ nguyên.
        </ImportantNotice>
      </div>
      <Form.List name="assignments">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field, index) => (
              <div key={field.key} className="assignment-editor-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3>Bài tập mới {index + 1}</h3>
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  >
                    Bỏ bài tập
                  </Button>
                </div>
                <AssignmentContentFields prefix={[field.name]} />
              </div>
            ))}
            <Button
              icon={<PlusOutlined />}
              disabled={fields.length >= 20}
              onClick={() =>
                add({
                  opensAt: dayjs().tz(TIMEZONE),
                  dueAt: dayjs().tz(TIMEZONE).add(7, 'day'),
                  allowResubmit: true,
                  allowLate: false,
                  manuallyClosed: false,
                })
              }
            >
              Thêm bài tập mới
            </Button>
          </>
        )}
      </Form.List>
    </section>
  );
}
