import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Skeleton, Space } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { errorMessage, fetchSubmissionFile, saveBlob } from '../../lib/api';
import type { SubmissionFileAccess } from '../../lib/api';
import type { SubmissionFile } from '../../lib/types';
import FilePreviewContent from './FilePreviewContent';
import './preview.css';

export default function FilePreviewModal({
  file,
  access,
  version,
  fileIndex,
  onClose,
}: {
  file: SubmissionFile;
  access: SubmissionFileAccess;
  version: number;
  fileIndex: number;
  onClose: () => void;
}) {
  const [blob, setBlob] = useState<Blob>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const kind = access.kind;
  const submissionId =
    'submissionId' in access ? access.submissionId : undefined;
  const receiptCode = 'receiptCode' in access ? access.receiptCode : undefined;
  const secret = 'secret' in access ? access.secret : undefined;
  const role = access.kind === 'lesson' ? access.role : undefined;
  const lessonId = access.kind === 'lesson' ? access.lessonId : undefined;
  const fileId = access.kind === 'lesson' ? access.fileId : undefined;
  useEffect(() => {
    const controller = new AbortController();
    setBlob(undefined);
    setError('');
    const current: SubmissionFileAccess =
      kind === 'receipt'
        ? { kind, receiptCode: receiptCode!, secret: secret! }
        : kind === 'lesson'
          ? { kind, role: role!, lessonId: lessonId!, fileId: fileId! }
          : { kind, submissionId: submissionId! };
    void fetchSubmissionFile(current, version, fileIndex, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setBlob(value);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      });
    return () => controller.abort();
  }, [
    kind,
    submissionId,
    receiptCode,
    secret,
    role,
    lessonId,
    fileId,
    version,
    fileIndex,
    attempt,
  ]);
  return (
    <Modal
      open
      title={
        <span className="break-words">
          {file.originalName}{' '}
          <span className="text-sm font-normal text-muted">
            {kind === 'lesson'
              ? '· Tài liệu bài học'
              : `· Phiên bản ${version}`}
          </span>
        </span>
      }
      width="min(1200px, 96vw)"
      onCancel={onClose}
      destroyOnHidden
      footer={
        <Space>
          {blob && (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => saveBlob(blob, file.originalName)}
            >
              Tải file gốc
            </Button>
          )}
          <Button onClick={onClose}>Đóng</Button>
        </Space>
      }
    >
      <div className="file-preview-container">
        {error ? (
          <Alert
            type="error"
            showIcon
            title="Chưa mở được file"
            description={error}
            action={
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setAttempt((value) => value + 1)}
              >
                Thử lại
              </Button>
            }
          />
        ) : !blob ? (
          <div role="status" aria-label="Đang tải nội dung file">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : (
          <FilePreviewContent
            blob={blob}
            filename={file.originalName}
            format={file.format}
          />
        )}
      </div>
    </Modal>
  );
}
