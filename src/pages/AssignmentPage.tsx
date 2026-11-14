import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Modal,
  Progress,
  Steps,
  Tag,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { api, errorMessage, get } from '../lib/api';
import type { Assignment, Receipt, StudentFields } from '../lib/types';
import { dateTime, formatBytes, refName, statusOf } from '../lib/utils';
import { submissionBody, submissionKey } from '../lib/submission';
import {
  BackButton,
  FileList,
  QueryState,
  StatusTag,
} from '../components/common';
import ReceiptView from '../components/ReceiptView';
import { LearningText } from '../components/LearningContent';
import { useResubmission } from '../lib/resubmission-context';

interface Attempt {
  fields: StudentFields;
  files: File[];
  key: string;
  storageKey: string;
}
export default function AssignmentPage() {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const { draft: resubmissionDraft, clear: clearResubmissionDraft } =
    useResubmission();
  const [resubmissionSource, setResubmissionSource] = useState<{
    receiptCode: string;
    latestVersion: number;
  }>();
  const [form] = Form.useForm<StudentFields>();
  const assignment = useQuery({
    queryKey: ['public', 'assignment', id],
    queryFn: ({ signal }) =>
      get<Assignment>(`/public/assignments/${id}`, undefined, signal),
    enabled: !!id,
  });
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [resubmit, setResubmit] = useState(false);
  const [draft, setDraft] = useState<StudentFields>();
  const [attempt, setAttempt] = useState<Attempt>();
  const [confirm, setConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [receipt, setReceipt] = useState<Receipt>();
  const [emailAttempt, setEmailAttempt] = useState<Attempt>();
  const [emailBusy, setEmailBusy] = useState(false);
  const sending = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      retryAt ? 1000 : 15000,
    );
    return () => clearInterval(timer);
  }, [retryAt]);
  useEffect(() => {
    if (!busy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [busy]);
  const a = assignment.data;
  const serverOffset = a?.serverTime
    ? Date.parse(a.serverTime) - assignment.dataUpdatedAt
    : 0;
  const status = a ? statusOf(a, now + serverOffset) : undefined;
  const rawFiles = files.map((f) => (f.originFileObj ?? f) as File);
  const retrySeconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  useEffect(() => {
    if (!a || !resubmissionDraft || resubmissionDraft.assignmentId !== id)
      return;
    setResubmissionSource({
      receiptCode: resubmissionDraft.receiptCode,
      latestVersion: resubmissionDraft.latestVersion,
    });
    setResubmit(true);
    setFiles([]);
    form.setFieldsValue(resubmissionDraft.fields);
    clearResubmissionDraft();
  }, [a, id, resubmissionDraft, form, clearResubmissionDraft]);
  function review(values: StudentFields) {
    if (!rawFiles.length) {
      void message.warning('Vui lòng chọn ít nhất một file để nộp.');
      return;
    }
    if (!status?.accepting) {
      void message.warning('Bài tập hiện không nhận bài.');
      return;
    }
    if (resubmit && !a?.allowResubmit) {
      void message.warning('Giảng viên chưa cho phép nộp lại bài tập này.');
      return;
    }
    setDraft({
      studentCode: values.studentCode.normalize('NFKC').trim().toUpperCase(),
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      note: values.note?.trim() || '',
      ...(resubmit ? { secret: values.secret?.trim() } : {}),
    });
    setConfirmed(false);
    setError('');
    setConfirm(true);
  }
  async function send() {
    if (
      !a ||
      !draft ||
      sending.current ||
      retrySeconds > 0 ||
      (!confirmed && !attempt)
    )
      return;
    sending.current = true;
    setBusy(true);
    setError('');
    setProgress(0);
    setRetryAt(0);
    let activeAttempt = attempt;
    try {
      if (!activeAttempt) {
        const saved = await submissionKey(id, draft, rawFiles);
        activeAttempt = { ...saved, fields: draft, files: rawFiles };
        setAttempt(activeAttempt);
      }
      const data = submissionBody(activeAttempt.fields, activeAttempt.files);
      const response = await api.post<Receipt>(
        `/public/assignments/${id}/submissions`,
        data,
        {
          timeout: 360000,
          headers: { 'Idempotency-Key': activeAttempt.key },
          onUploadProgress: (event) => {
            if (event.total)
              setProgress(
                Math.min(100, Math.round((event.loaded / event.total) * 100)),
              );
          },
        },
      );
      sessionStorage.removeItem(activeAttempt.storageKey);
      setReceipt(response.data);
      setEmailAttempt(
        response.data.emailSent === false ? activeAttempt : undefined,
      );
      setConfirm(false);
      setAttempt(undefined);
      void message.success(
        resubmit
          ? `Đã nộp lại bài, phiên bản ${response.data.version}.`
          : 'Đã nộp bài thành công.',
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(errorMessage(err));
      if (axios.isAxiosError(err)) {
        const retry = Number(
          err.response?.data?.retryAfterSeconds ??
            err.response?.headers['retry-after'],
        );
        if (Number.isFinite(retry) && retry > 0) {
          const current = Date.now();
          setNow(current);
          setRetryAt(current + Math.min(3600, retry) * 1000);
        }
      }
      if (
        axios.isAxiosError(err) &&
        err.response &&
        [400, 401, 403, 404, 413, 422].includes(err.response.status)
      ) {
        if (activeAttempt) sessionStorage.removeItem(activeAttempt.storageKey);
        setAttempt(undefined);
      }
    } finally {
      setBusy(false);
      sending.current = false;
    }
  }
  async function resendEmail() {
    if (!emailAttempt || emailBusy) return;
    setEmailBusy(true);
    try {
      const { data } = await api.post<Receipt>(
        `/public/assignments/${id}/submissions`,
        submissionBody(emailAttempt.fields, emailAttempt.files),
        {
          headers: { 'Idempotency-Key': emailAttempt.key },
          timeout: 360000,
        },
      );
      setReceipt(data);
      if (data.emailSent) setEmailAttempt(undefined);
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setEmailBusy(false);
    }
  }
  function returnToForm() {
    if (!receipt) return;
    const fields = {
      studentCode: receipt.studentCode,
      fullName: receipt.fullName,
      email: receipt.email ?? draft?.email ?? '',
      note: '',
      secret: receipt.secret ?? draft?.secret,
    };
    setResubmissionSource({
      receiptCode: receipt.receiptCode,
      latestVersion: receipt.latestVersion,
    });
    setReceipt(undefined);
    setEmailAttempt(undefined);
    setFiles([]);
    setResubmit(true);
    setDraft(undefined);
    setAttempt(undefined);
    setConfirmed(false);
    setError('');
    setProgress(0);
    setRetryAt(0);
    window.setTimeout(() => {
      form.resetFields();
      form.setFieldsValue(fields);
    }, 0);
    void assignment.refetch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (receipt)
    return (
      <ReceiptView
        receipt={receipt}
        secret={receipt.secret ?? draft?.secret}
        success
        onResendEmail={emailAttempt ? () => void resendEmail() : undefined}
        emailBusy={emailBusy}
        onResubmit={returnToForm}
        resubmitDisabled={!a?.allowResubmit || !status?.accepting}
        returnLabel="Xem bài tập"
        onReturn={returnToForm}
      />
    );
  return (
    <>
      <BackButton to="/" />
      <QueryState
        pending={assignment.isPending}
        error={assignment.error}
        retry={() => void assignment.refetch()}
      >
        {a && status && (
          <>
            <div className="assignment-page-heading">
              <div>
                <div className="eyebrow">
                  {a.courseSection?.code} <span> / </span>{' '}
                  {refName(a.courseSection?.subjectId)}
                </div>
                <h1>{a.title}</h1>
                <p>
                  {refName(a.courseSection?.classId)} <span>·</span>{' '}
                  {refName(a.courseSection?.lecturerId)}
                </p>
              </div>
              <StatusTag status={status} />
            </div>
            <Steps
              className="submission-steps"
              size="small"
              current={confirm ? 1 : 0}
              items={[
                { title: 'Chuẩn bị bài nộp' },
                { title: 'Kiểm tra & xác nhận' },
                { title: 'Nhận biên nhận' },
              ]}
            />
            <div className="assignment-layout">
              <div className="space-y-6">
                <section className="surface p-6 sm:p-8">
                  <h2 className="section-title">
                    <span className="title-number">01</span> Hướng dẫn bài tập
                  </h2>
                  <div className="instructions">
                    <LearningText>
                      {a.instructions ||
                        'Giảng viên chưa thêm hướng dẫn cho bài tập này.'}
                    </LearningText>
                  </div>
                </section>
                <section className="surface p-6 sm:p-8">
                  <h2 className="section-title">
                    <span className="title-number">02</span> Thông tin bài nộp
                  </h2>
                  {!status.accepting && (
                    <Alert
                      className="mb-6"
                      type="warning"
                      showIcon
                      title={status.label}
                      description={
                        status.code === 'scheduled'
                          ? `Bài tập mở nhận bài lúc ${dateTime(a.opensAt)}.`
                          : 'Bài tập hiện không nhận bài. Bạn có thể tra cứu bài đã nộp ở trang Tra cứu bài nộp.'
                      }
                    />
                  )}
                  {attempt && !busy && (
                    <Alert
                      className="mb-6"
                      type="warning"
                      showIcon
                      title="Lần nộp chưa được xác nhận"
                      description="Giữ nguyên nội dung và chọn Thử lại để nhận kết quả của cùng một yêu cầu."
                      action={
                        <Button onClick={() => setConfirm(true)}>
                          Thử lại yêu cầu
                        </Button>
                      }
                    />
                  )}
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={review}
                    requiredMark="optional"
                    disabled={
                      !status.accepting ||
                      busy ||
                      !!attempt ||
                      (resubmit && !a.allowResubmit)
                    }
                    scrollToFirstError
                  >
                    {resubmissionSource && (
                      <Alert
                        className="mb-5"
                        type={
                          a.allowResubmit && status.accepting
                            ? 'info'
                            : 'warning'
                        }
                        showIcon
                        title={
                          a.allowResubmit && status.accepting
                            ? `Nộp lại bài · phiên bản ${resubmissionSource.latestVersion + 1}`
                            : 'Hiện chưa thể nộp lại bài'
                        }
                        description={
                          a.allowResubmit && status.accepting
                            ? 'Chọn lại toàn bộ file đúng. Bản cũ và điểm cũ được giữ trong lịch sử; phiên bản mới sẽ được chấm riêng.'
                            : 'Liên hệ giảng viên để mở quyền nộp lại hoặc thời hạn nộp bài.'
                        }
                      />
                    )}
                    <div className="grid gap-x-5 sm:grid-cols-2">
                      <Form.Item
                        name="studentCode"
                        label="Mã số sinh viên"
                        rules={[
                          {
                            required: true,
                            message: 'Vui lòng nhập mã số sinh viên.',
                          },
                          {
                            pattern: /^[A-Za-z0-9_-]{2,40}$/,
                            message:
                              'Mã sinh viên gồm 2–40 chữ, số, dấu _ hoặc -.',
                          },
                        ]}
                        normalize={(v: string) => v.trim().toUpperCase()}
                      >
                        <Input
                          size="large"
                          placeholder="Ví dụ: 26SV001"
                          disabled={
                            !!resubmissionSource ||
                            !status.accepting ||
                            busy ||
                            !!attempt
                          }
                          autoComplete="off"
                        />
                      </Form.Item>
                      <Form.Item
                        name="fullName"
                        label="Họ và tên"
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message: 'Vui lòng nhập họ và tên.',
                          },
                          {
                            min: 2,
                            max: 200,
                            message: 'Họ tên phải gồm 2–200 ký tự.',
                          },
                        ]}
                      >
                        <Input
                          size="large"
                          placeholder="Nhập đầy đủ họ và tên"
                          autoComplete="name"
                        />
                      </Form.Item>
                    </div>
                    <Form.Item
                      name="email"
                      label="Email nhận mã xem lại bài"
                      normalize={(value: string) => value.trim().toLowerCase()}
                      rules={[
                        {
                          required: true,
                          message: 'Vui lòng nhập email nhận mã.',
                        },
                        {
                          type: 'email',
                          message: 'Địa chỉ email không hợp lệ.',
                        },
                        { max: 254, message: 'Email tối đa 254 ký tự.' },
                      ]}
                      extra="Mã biên nhận và mã bí mật sẽ được gửi tới email này. Bạn không cần tài khoản."
                    >
                      <Input
                        size="large"
                        type="email"
                        autoComplete="email"
                        placeholder="Nhập chính xác email của bạn"
                      />
                    </Form.Item>
                    <Form.Item
                      name="note"
                      label="Ghi chú"
                      rules={[
                        { max: 2000, message: 'Ghi chú tối đa 2.000 ký tự.' },
                      ]}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Lời nhắn cho giảng viên (nếu có)"
                        maxLength={2000}
                        showCount
                      />
                    </Form.Item>
                    {a.allowResubmit && (
                      <div className="resubmit-panel">
                        <Checkbox
                          checked={resubmit}
                          disabled={
                            !!resubmissionSource ||
                            !status.accepting ||
                            busy ||
                            !!attempt
                          }
                          onChange={(event) =>
                            setResubmit(event.target.checked)
                          }
                        >
                          Tôi muốn nộp lại bài đã gửi trước đó
                        </Checkbox>
                        {resubmit && (
                          <Form.Item
                            name="secret"
                            label="Mã bí mật từ lần nộp đầu tiên"
                            className="mt-4 mb-0"
                            rules={[
                              {
                                required: true,
                                message: 'Vui lòng nhập mã bí mật để nộp lại.',
                              },
                              {
                                min: 20,
                                max: 128,
                                message:
                                  'Kiểm tra lại mã bí mật trên biên nhận.',
                              },
                            ]}
                          >
                            <Input.Password
                              size="large"
                              prefix={<LockOutlined />}
                              placeholder="Nhập mã bí mật"
                              autoComplete="off"
                            />
                          </Form.Item>
                        )}
                      </div>
                    )}
                    <div className="upload-label">
                      File bài nộp <span>*</span>
                      <small>
                        {files.length}/{a.maxFiles} file
                      </small>
                    </div>
                    <Upload.Dragger
                      className="submission-uploader"
                      multiple
                      listType="picture"
                      accept={a.allowedExtensions.map((e) => `.${e}`).join(',')}
                      fileList={files}
                      disabled={!status.accepting || busy || !!attempt}
                      beforeUpload={(file, batch) => {
                        const extension =
                          file.name.split('.').pop()?.toLowerCase() ?? '';
                        if (!a.allowedExtensions.includes(extension)) {
                          void message.error(
                            `${file.name}: định dạng không được chấp nhận.`,
                          );
                          return Upload.LIST_IGNORE;
                        }
                        if (!file.size || file.size > a.maxFileBytes) {
                          void message.error(
                            `${file.name}: file rỗng hoặc vượt quá ${formatBytes(a.maxFileBytes)}.`,
                          );
                          return Upload.LIST_IGNORE;
                        }
                        if (files.length + batch.length > a.maxFiles) {
                          void message.error(
                            `Chỉ được chọn tối đa ${a.maxFiles} file.`,
                          );
                          return Upload.LIST_IGNORE;
                        }
                        return false;
                      }}
                      onChange={({ fileList }) => setFiles(fileList)}
                    >
                      <span className="upload-cloud">
                        <CloudUploadOutlined />
                      </span>
                      <p className="upload-title">
                        Kéo thả file vào đây, hoặc <span>chọn từ máy tính</span>
                      </p>
                      <p className="upload-hint">
                        {a.allowedExtensions.map((e) => `.${e}`).join(', ')} ·
                        Tối đa {formatBytes(a.maxFileBytes)}/file
                      </p>
                    </Upload.Dragger>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs text-muted">
                        <SafetyCertificateOutlined /> File chỉ giảng viên phụ
                        trách được tải
                      </span>
                      <Button
                        size="large"
                        type="primary"
                        htmlType="submit"
                        icon={<ArrowRightOutlined />}
                        iconPlacement="end"
                      >
                        Tiếp tục xác nhận
                      </Button>
                    </div>
                  </Form>
                </section>
              </div>
              <aside className="assignment-sidebar">
                <section className="surface p-6">
                  <h3>Thông tin bài tập</h3>
                  <div className="detail-item">
                    <CalendarOutlined />
                    <div>
                      <span>Thời gian mở</span>
                      <strong>{dateTime(a.opensAt)}</strong>
                    </div>
                  </div>
                  <div className="detail-item detail-deadline">
                    <ClockCircleOutlined />
                    <div>
                      <span>Hạn nộp bài</span>
                      <strong>{dateTime(a.dueAt)}</strong>
                      <small>Giờ Việt Nam (GMT+7)</small>
                    </div>
                  </div>
                  <div className="sidebar-divider" />
                  <div className="policy-row">
                    <span>Nộp trễ</span>
                    <Tag color={a.allowLate ? 'green' : 'default'}>
                      {a.allowLate ? 'Cho phép' : 'Không cho phép'}
                    </Tag>
                  </div>
                  <div className="policy-row">
                    <span>Nộp lại</span>
                    <Tag color={a.allowResubmit ? 'green' : 'default'}>
                      {a.allowResubmit ? 'Cho phép' : 'Không cho phép'}
                    </Tag>
                  </div>
                  <div className="policy-row">
                    <span>Số file tối đa</span>
                    <strong>{a.maxFiles} file</strong>
                  </div>
                  <div className="policy-row">
                    <span>Dung lượng mỗi file</span>
                    <strong>{formatBytes(a.maxFileBytes)}</strong>
                  </div>
                </section>
                <div className="sidebar-note">
                  <InfoCircleOutlined />
                  <h3>Đừng quên biên nhận</h3>
                  <p>
                    Mã biên nhận và mã bí mật sẽ được gửi qua email sau khi nộp.
                    Bạn cũng có thể lưu biên nhận ngay trên màn hình để tra cứu
                    hoặc nộp lại.
                  </p>
                  <Link to="/lookup">
                    Tra cứu bài đã nộp <ArrowRightOutlined />
                  </Link>
                </div>
              </aside>
            </div>
            <Modal
              title={resubmit ? 'Xác nhận nộp lại bài' : 'Xác nhận nộp bài'}
              open={confirm}
              width={680}
              closable={!busy}
              maskClosable={false}
              keyboard={!busy}
              onCancel={() => {
                if (!busy) setConfirm(false);
              }}
              footer={
                <div className="flex justify-end gap-3">
                  <Button disabled={busy} onClick={() => setConfirm(false)}>
                    {attempt ? 'Đóng' : 'Kiểm tra lại'}
                  </Button>
                  <Button
                    type="primary"
                    loading={busy}
                    disabled={(!confirmed && !attempt) || retrySeconds > 0}
                    onClick={() => void send()}
                    icon={<CheckCircleOutlined />}
                  >
                    {retrySeconds > 0
                      ? `Thử lại sau ${retrySeconds} giây`
                      : attempt && error
                        ? 'Thử lại cùng yêu cầu'
                        : resubmit
                          ? 'Xác nhận nộp lại'
                          : 'Xác nhận nộp bài'}
                  </Button>
                </div>
              }
            >
              <p className="mb-5 text-muted">
                Kiểm tra đúng nơi nộp, thông tin và file trước khi gửi.
              </p>
              {resubmit && (
                <Alert
                  className="mb-5"
                  type="info"
                  showIcon
                  title="Lần nộp này tạo một phiên bản mới"
                  description="Kiểm tra lại toàn bộ file thay thế. Bản cũ và điểm cũ vẫn nằm trong lịch sử; bản mới sẽ được chấm riêng."
                />
              )}
              <Descriptions
                size="small"
                column={1}
                bordered
                items={[
                  {
                    key: 'semester',
                    label: 'Học kỳ',
                    children: `${refName(a.courseSection?.semesterId)}${typeof a.courseSection?.semesterId === 'object' ? ` · ${a.courseSection.semesterId.academicYear}` : ''}`,
                  },
                  {
                    key: 'class',
                    label: 'Lớp',
                    children: refName(a.courseSection?.classId),
                  },
                  {
                    key: 'subject',
                    label: 'Môn học',
                    children: refName(a.courseSection?.subjectId),
                  },
                  {
                    key: 'section',
                    label: 'Mã học phần',
                    children: a.courseSection?.code,
                  },
                  { key: 'assignment', label: 'Bài tập', children: a.title },
                  {
                    key: 'student',
                    label: 'Sinh viên',
                    children: `${draft?.studentCode} · ${draft?.fullName}`,
                  },
                  {
                    key: 'email',
                    label: 'Email nhận mã',
                    children: draft?.email,
                  },
                ]}
              />
              <div className="my-5">
                <FileList
                  files={(attempt?.files ?? rawFiles).map((f) => ({
                    originalName: f.name,
                    bytes: f.size,
                    format: f.name.split('.').pop()?.toLowerCase() ?? '',
                  }))}
                />
              </div>
              {status.code === 'expired' && status.accepting && (
                <Alert
                  className="mb-4"
                  type="warning"
                  showIcon
                  title="Bài này sẽ được ghi nhận là nộp trễ."
                />
              )}
              {!attempt && (
                <Checkbox
                  checked={confirmed}
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                >
                  Tôi đã kiểm tra và xác nhận thông tin bài nộp.
                </Checkbox>
              )}
              {busy && (
                <div className="mt-5" role="status">
                  <Progress percent={progress} status="active" />
                  <p className="text-muted">
                    {progress >= 100
                      ? 'Đã gửi file. Máy chủ đang kiểm tra và lưu bài, vui lòng giữ trang mở…'
                      : 'Đang tải bài nộp…'}
                  </p>
                </div>
              )}
              {error && (
                <Alert
                  className="mt-5"
                  type="error"
                  showIcon
                  title="Chưa thể hoàn tất nộp bài"
                  description={error}
                />
              )}
            </Modal>
          </>
        )}
      </QueryState>
    </>
  );
}
