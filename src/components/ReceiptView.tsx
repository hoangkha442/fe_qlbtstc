import { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { Receipt, SubmissionFile } from '../lib/types';
import { dateTime, refName } from '../lib/utils';
import { downloadReceiptFile, errorMessage, saveBlob } from '../lib/api';
import { FileList } from './common';
import { brand } from '../lib/brand';

export default function ReceiptView({
  receipt,
  secret,
  success = false,
  onReturn,
  accessSecret,
  onResendEmail,
  emailBusy = false,
  returnLabel = 'Đến bài tập / Nộp lại',
}: {
  receipt: Receipt;
  secret?: string;
  success?: boolean;
  onReturn?: () => void;
  accessSecret?: string;
  onResendEmail?: () => void;
  emailBusy?: boolean;
  returnLabel?: string;
}) {
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState('');
  const code = secret ?? accessSecret;
  async function downloadFile(
    file: SubmissionFile,
    version: number,
    index: number,
  ) {
    if (!code || downloading) return;
    setDownloading(`${version}-${index}`);
    try {
      await downloadReceiptFile(
        receipt.receiptCode,
        code,
        version,
        index,
        file.originalName,
      );
      void message.success('Đã tải file bài nộp.');
    } catch (err) {
      void message.error(errorMessage(err));
    } finally {
      setDownloading('');
    }
  }
  const fileAction =
    (version: number) => (file: SubmissionFile, index: number) =>
      code ? (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          aria-label={`Tải ${file.originalName}`}
          loading={downloading === `${version}-${index}`}
          disabled={!!downloading && downloading !== `${version}-${index}`}
          onClick={() => void downloadFile(file, version, index)}
        >
          Tải file
        </Button>
      ) : null;
  function saveReceipt() {
    const text = [
      `${brand.name} · BIÊN NHẬN NỘP BÀI`,
      `Mã biên nhận: ${receipt.receiptCode}`,
      ...(code ? [`Mã bí mật: ${code}`, 'GIỮ KÍN mã bí mật.'] : []),
      `Mã sinh viên: ${receipt.studentCode}`,
      `Họ tên: ${receipt.fullName}`,
      ...(receipt.email ? [`Email: ${receipt.email}`] : []),
      `Bài tập: ${receipt.assignment.title}`,
      `Học phần: ${receipt.courseSection.code}`,
      `Lớp: ${refName(receipt.courseSection.classId)}`,
      `Thời gian: ${dateTime(receipt.submittedAt)}`,
      `Phiên bản: ${receipt.version}`,
      `Trạng thái: ${receipt.late ? 'Trễ hạn' : 'Đúng hạn'}`,
      '',
      'File đã nộp:',
      ...receipt.files.map((f) => `- ${f.originalName} (${f.bytes} byte)`),
      '',
      receipt.identityNotice,
    ].join('\n');
    saveBlob(
      new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }),
      `${receipt.receiptCode}.txt`,
    );
  }
  return (
    <div className="receipt-wrap">
      {success && (
        <div className="receipt-success">
          <span>
            <CheckOutlined />
          </span>
          <div className="eyebrow">BÀI CỦA BẠN ĐÃ ĐƯỢC GỬI</div>
          <h1>Nộp bài thành công!</h1>
          <p>Hãy lưu biên nhận để tra cứu hoặc nộp lại khi cần.</p>
        </div>
      )}
      {success && receipt.emailSent !== undefined && (
        <Alert
          className="mb-5"
          showIcon
          type={receipt.emailSent ? 'success' : 'warning'}
          title={
            receipt.emailSent
              ? `Đã gửi mã xem lại bài tới ${receipt.email}`
              : 'Bài đã lưu, email nhận mã chưa gửi được'
          }
          description={
            receipt.emailSent
              ? 'Kiểm tra hộp thư đến hoặc thư rác. Dùng mã biên nhận và mã bí mật trong email để tra cứu, không cần đăng nhập.'
              : 'Bạn vẫn có thể tải file và lưu biên nhận bên dưới. Chọn gửi lại mã nếu muốn thử gửi email thêm lần nữa.'
          }
          action={
            onResendEmail ? (
              <Button loading={emailBusy} onClick={onResendEmail}>
                Gửi lại mã qua email
              </Button>
            ) : undefined
          }
        />
      )}
      <section className="surface receipt-card">
        <div className="receipt-header">
          <div className="flex items-center gap-3">
            <img src={brand.logo} width={36} height={36} alt="" />
            <div>
              <h2>Biên nhận nộp bài</h2>
              <p>
                {brand.name} · {dateTime(receipt.submittedAt)}
              </p>
            </div>
          </div>
          <Tag color={receipt.late ? 'orange' : 'green'}>
            {receipt.late ? 'Trễ hạn' : 'Đúng hạn'}
          </Tag>
        </div>
        <div className="receipt-code">
          <span>MÃ BIÊN NHẬN</span>
          <Typography.Text
            copyable={{
              icon: <CopyOutlined />,
              tooltips: ['Sao chép', 'Đã sao chép'],
            }}
          >
            {receipt.receiptCode}
          </Typography.Text>
        </div>
        {secret && (
          <div className="secret-panel">
            <div>Mã bí mật của bạn</div>
            <Typography.Text
              code
              copyable={{ tooltips: ['Sao chép mã bí mật', 'Đã sao chép'] }}
            >
              {secret}
            </Typography.Text>
            <p>Mã này dùng để tra cứu và nộp lại. Hãy lưu ngay và giữ kín.</p>
          </div>
        )}
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          size="small"
          items={[
            {
              key: 'student',
              label: 'Mã sinh viên',
              children: receipt.studentCode,
            },
            { key: 'name', label: 'Họ và tên', children: receipt.fullName },
            {
              key: 'email',
              label: 'Email nhận mã',
              children: receipt.email || 'Chưa có email',
              span: 2,
            },
            {
              key: 'assignment',
              label: 'Bài tập',
              children: receipt.assignment.title,
              span: 2,
            },
            {
              key: 'subject',
              label: 'Môn học',
              children: refName(receipt.courseSection.subjectId),
            },
            {
              key: 'class',
              label: 'Lớp',
              children: refName(receipt.courseSection.classId),
            },
            {
              key: 'course',
              label: 'Lớp học phần',
              children: receipt.courseSection.code,
            },
            {
              key: 'version',
              label: 'Phiên bản',
              children: `Lần ${receipt.version}${receipt.isLatest ? ' · Mới nhất' : ''}`,
            },
          ]}
        />
        <h3 className="mt-7 mb-4">File đã nộp</h3>
        <FileList files={receipt.files} action={fileAction(receipt.version)} />
        {receipt.note && (
          <div className="mt-5 text-muted">Ghi chú: {receipt.note}</div>
        )}
        <div className="receipt-actions">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={saveReceipt}
          >
            Lưu biên nhận
          </Button>
          {onReturn ? (
            <Button
              icon={<ReloadOutlined />}
              onClick={onReturn}
              disabled={emailBusy}
            >
              {returnLabel}
            </Button>
          ) : (
            <Link to={`/assignments/${receipt.assignment.id}`}>
              <Button icon={<ReloadOutlined />}>{returnLabel}</Button>
            </Link>
          )}
        </div>
        <Alert
          type="info"
          showIcon
          title="Thông tin sinh viên do người nộp tự khai"
          description="Biên nhận xác nhận bài đã được lưu; hệ thống không xác minh danh tính sinh viên."
        />
      </section>
      {receipt.versions && receipt.versions.length > 0 && (
        <section className="surface mt-6 p-6 sm:p-8">
          <h2 className="mb-7">Lịch sử nộp bài</h2>
          <Timeline
            items={receipt.versions.map((v) => ({
              color: v.isLatest ? 'green' : 'gray',
              content: (
                <div className="pb-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <strong>Phiên bản {v.version}</strong>
                    {v.isLatest && <Tag color="green">Mới nhất</Tag>}
                    <span className="text-sm text-muted">
                      {dateTime(v.submittedAt)}
                    </span>
                    <Tag color={v.late ? 'orange' : 'default'}>
                      {v.late ? 'Trễ hạn' : 'Đúng hạn'}
                    </Tag>
                  </div>
                  <p className="mb-3 text-muted">
                    {v.fullName}
                    {v.note ? ` · ${v.note}` : ''}
                  </p>
                  {v.email && (
                    <p className="mb-3 text-sm text-muted">Email: {v.email}</p>
                  )}
                  <FileList files={v.files} action={fileAction(v.version)} />
                </div>
              ),
            }))}
          />
        </section>
      )}
    </div>
  );
}
