import { lazy, Suspense, useState } from 'react';
import { Button, Skeleton, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { SubmissionFile } from '../lib/types';
import type { SubmissionFileAccess } from '../lib/api';
import { canPreview } from '../lib/file-preview';

const FilePreviewModal = lazy(() => import('./preview/FilePreviewModal'));
export default function SubmissionFilePreview({
  file,
  access,
  version,
  fileIndex,
}: {
  file: SubmissionFile;
  access: SubmissionFileAccess;
  version: number;
  fileIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const supported = canPreview(file.format);
  return (
    <>
      <Tooltip
        title={
          supported
            ? 'Xem nội dung trực tiếp'
            : 'Định dạng này cần tải về để mở'
        }
      >
        <Button
          size="small"
          icon={<EyeOutlined />}
          disabled={!supported}
          aria-label={`Xem trước ${file.originalName}`}
          onClick={() => setOpen(true)}
        >
          Xem trước
        </Button>
      </Tooltip>
      {open && (
        <Suspense fallback={<Skeleton active paragraph={{ rows: 2 }} />}>
          <FilePreviewModal
            file={file}
            access={access}
            version={version}
            fileIndex={fileIndex}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
