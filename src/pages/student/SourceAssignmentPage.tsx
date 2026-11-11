import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Tag,
  Timeline,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd';
import { CloudUploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { api, download, errorMessage, get } from '../../lib/api';
import type {
  Receipt,
  SourceAssignment,
  StudentFields,
  Submission,
} from '../../lib/types';
import { useStudentAuth } from '../../lib/student-context';
import { submissionKey } from '../../lib/submission';
import { dateTime, formatBytes, statusOf } from '../../lib/utils';
import {
  BackButton,
  FileList,
  PageHeading,
  QueryState,
  StatusTag,
  ImportantNotice,
} from '../../components/common';
import { LearningText } from '../../components/LearningContent';

type Attempt = {
  key: string;
  storageKey: string;
  fields: StudentFields;
  file: File;
};
export default function SourceAssignmentPage() {
  const { id = '' } = useParams();
  const { student } = useStudentAuth();
  const { notification } = App.useApp();
  const client = useQueryClient();
  const [form] = Form.useForm<{ note?: string }>();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [attempt, setAttempt] = useState<Attempt>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const sending = useRef(false);
  const assignment = useQuery({
    queryKey: ['student', 'source-assignment', id],
    queryFn: ({ signal }) =>
      get<SourceAssignment>(`/student/assignments/${id}`, undefined, signal),
    staleTime: 0,
  });
  const mine = useQuery({
    queryKey: ['student', 'source-submission', id],
    queryFn: ({ signal }) =>
      get<Submission | null>(
        `/student/assignments/${id}/submission`,
        undefined,
        signal,
      ),
    enabled: !!assignment.data,
    staleTime: 0,
  });
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      retryAt ? 1000 : 15000,
    );
    return () => window.clearInterval(timer);
  }, [retryAt]);
  useEffect(() => {
    if (!busy) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [busy]);
  const a = assignment.data;
  const status = a
    ? statusOf(
        a,
        now +
          (a.serverTime
            ? Date.parse(a.serverTime) - assignment.dataUpdatedAt
            : 0),
      )
    : undefined;
  const wait = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const blocked = !status?.accepting || (!!mine.data && !a?.allowResubmit);
  const cannotSend = blocked && !attempt;
  async function submit(values: { note?: string }) {
    if (!student || !a || sending.current || wait > 0) return;
    const file = (files[0]?.originFileObj ?? files[0]) as File | undefined;
    if (!attempt && !file) {
      notification.warning({ title: 'Vui lòng chọn file ZIP mã nguồn' });
      return;
    }
    sending.current = true;
    setBusy(true);
    setError('');
    let active = attempt;
    try {
      if (!active) {
        const fields = {
          studentCode: student.studentCode,
          fullName: student.fullName,
          email: student.email,
          note: values.note?.trim() ?? '',
        };
        active = {
          ...(await submissionKey(id, fields, [file!])),
          fields,
          file: file!,
        };
        setAttempt(active);
      }
      const body = new FormData();
      if (active.fields.note) body.append('note', active.fields.note);
      body.append('files', active.file, active.file.name);
      const { data } = await api.post<Receipt>(
        `/student/assignments/${id}/submissions`,
        body,
        { headers: { 'Idempotency-Key': active.key }, timeout: 360000 },
      );
      sessionStorage.removeItem(active.storageKey);
      setAttempt(undefined);
      setFiles([]);
      form.resetFields();
      setRetryAt(0);
      await client.invalidateQueries({
        queryKey: ['student', 'source-submission', id],
      });
      notification.success({
        title: 'Nộp bài thành công',
        description: `Đã lưu phiên bản ${data.version} của bài ${a.title}.`,
      });
    } catch (err) {
      const text = errorMessage(err);
      setError(text);
      notification.error({ title: 'Chưa hoàn tất nộp bài', description: text });
      if (axios.isAxiosError(err)) {
        const seconds = Number(
          err.response?.data?.retryAfterSeconds ??
            err.response?.headers['retry-after'],
        );
        if (Number.isFinite(seconds) && seconds > 0) {
          setNow(Date.now());
          setRetryAt(Date.now() + Math.min(seconds, 3600) * 1000);
        }
        if (
          [400, 401, 403, 404, 413, 422].includes(err.response?.status ?? 0) &&
          active
        ) {
          sessionStorage.removeItem(active.storageKey);
          setAttempt(undefined);
        }
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function saveFile(version: number, index: number, filename: string) {
    if (!mine.data || downloading) return;
    setDownloading(`${version}-${index}`);
    try {
      await download(`/student/submissions/${mine.data._id}/file`, filename, {
        version,
        fileIndex: index,
      });
      notification.success({ title: 'Đã tải bài nộp', description: filename });
    } catch (err) {
      notification.error({
        title: 'Chưa tải được bài nộp',
        description: errorMessage(err),
      });
    } finally {
      setDownloading('');
    }
  }
  return (
    <>
      <BackButton
        to={
          a?.learningPath
            ? `/specialized/paths/${a.learningPath.id}`
            : '/specialized'
        }
      />
      <QueryState
        pending={assignment.isPending || (!!a && mine.isPending)}
        error={assignment.error || mine.error}
        retry={() => {
          void assignment.refetch();
          void mine.refetch();
        }}
      >
        {a && status && (
          <>
            <PageHeading
              title={a.title}
              description={a.learningPath?.title}
              extra={<StatusTag status={status} />}
            />
            <div className="source-assignment-layout">
              <div className="space-y-5">
                <section className="surface p-6">
                  <h2 className="mb-5">Yêu cầu bài tập</h2>
                  <LearningText>
                    {a.instructions || 'Giảng viên chưa thêm yêu cầu chi tiết.'}
                  </LearningText>
                </section>
                <section className="surface p-6">
                  <h2 className="mb-5">Nộp mã nguồn</h2>
                  {!a.allowResubmit && (
                    <div className="mb-5">
                      <ImportantNotice title="Quan trọng · Chỉ được nộp một lần">
                        Kiểm tra kỹ mã nguồn trước khi gửi. Bài tập này không
                        cho phép nộp lại.
                      </ImportantNotice>
                    </div>
                  )}
                  <Descriptions
                    className="mb-6"
                    column={1}
                    items={[
                      {
                        key: 'student',
                        label: 'Sinh viên',
                        children: `${student?.studentCode} · ${student?.fullName}`,
                      },
                      {
                        key: 'email',
                        label: 'Email',
                        children: student?.email,
                      },
                      {
                        key: 'due',
                        label: 'Hạn nộp',
                        children: dateTime(a.dueAt),
                      },
                      {
                        key: 'format',
                        label: 'Định dạng',
                        children: 'Một file ZIP, tối đa 10 MB',
                      },
                    ]}
                  />
                  {blocked && (
                    <Alert
                      className="mb-5"
                      showIcon
                      type="warning"
                      title={
                        mine.data && !a.allowResubmit
                          ? 'Bài tập không cho phép nộp lại.'
                          : status.label
                      }
                    />
                  )}
                  {attempt && (
                    <Alert
                      className="mb-5"
                      showIcon
                      type="info"
                      title="Giữ nguyên file và ghi chú để thử lại cùng yêu cầu."
                    />
                  )}
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={submit}
                    disabled={busy || cannotSend}
                    requiredMark={false}
                  >
                    <Upload.Dragger
                      accept=".zip,application/zip,application/x-zip-compressed"
                      maxCount={1}
                      fileList={files}
                      disabled={busy || blocked || !!attempt}
                      beforeUpload={(file) => {
                        if (
                          !file.name.toLowerCase().endsWith('.zip') ||
                          file.size < 1 ||
                          file.size > a.maxFileBytes
                        ) {
                          notification.error({
                            title: 'File không hợp lệ',
                            description: `Chọn ZIP từ 1 byte đến ${formatBytes(a.maxFileBytes)}.`,
                          });
                          return Upload.LIST_IGNORE;
                        }
                        return false;
                      }}
                      onChange={({ fileList }) => setFiles(fileList)}
                    >
                      <p className="ant-upload-drag-icon">
                        <CloudUploadOutlined />
                      </p>
                      <p>Chọn hoặc kéo file ZIP mã nguồn vào đây</p>
                      <p className="ant-upload-hint">
                        Bỏ node_modules và .git trước khi nén.
                      </p>
                    </Upload.Dragger>
                    <Form.Item
                      className="mt-6"
                      name="note"
                      label="Ghi chú"
                      rules={[{ max: 2000 }]}
                    >
                      <Input.TextArea
                        rows={3}
                        disabled={!!attempt || busy || blocked}
                      />
                    </Form.Item>
                    {error && (
                      <Alert
                        className="mb-5"
                        showIcon
                        type="error"
                        title={error}
                      />
                    )}
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={busy}
                      disabled={cannotSend || wait > 0}
                    >
                      {wait
                        ? `Thử lại sau ${wait} giây`
                        : attempt
                          ? 'Thử lại cùng yêu cầu'
                          : mine.data
                            ? 'Nộp phiên bản mới'
                            : 'Nộp bài tập'}
                    </Button>
                  </Form>
                </section>
              </div>
              <section className="surface p-6">
                <h2 className="mb-5">Bài đã nộp</h2>
                {!mine.data ? (
                  <p className="text-muted">Bạn chưa nộp bài tập này.</p>
                ) : (
                  <Timeline
                    items={mine.data.versions?.map((v) => ({
                      color: v.isLatest ? 'green' : 'gray',
                      content: (
                        <div className="pb-5">
                          <h3>
                            Phiên bản {v.version}{' '}
                            {v.isLatest && <Tag color="green">Mới nhất</Tag>}
                          </h3>
                          <p className="my-3 text-sm text-muted">
                            {dateTime(v.submittedAt)} ·{' '}
                            {v.late ? 'Trễ hạn' : 'Đúng hạn'}
                          </p>
                          {v.note && (
                            <p className="mb-3 whitespace-pre-wrap">{v.note}</p>
                          )}
                          <FileList
                            files={v.files}
                            action={(f, i) => (
                              <Button
                                icon={<DownloadOutlined />}
                                aria-label={`Tải ${f.originalName} phiên bản ${v.version}`}
                                size="small"
                                disabled={!!downloading}
                                loading={downloading === `${v.version}-${i}`}
                                onClick={() =>
                                  void saveFile(v.version, i, f.originalName)
                                }
                              />
                            )}
                          />
                        </div>
                      ),
                    }))}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
