import { useEffect, useRef, useState } from 'react';
import { App, Button } from 'antd';
import type { UploadFile } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { createFolderZip } from '../lib/folder-upload';
import { errorMessage } from '../lib/api';

export default function FolderUploadButton({
  disabled,
  maxFileBytes,
  onFile,
  onBusyChange,
}: {
  disabled?: boolean;
  maxFileBytes: number;
  onFile: (file: UploadFile) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { notification } = App.useApp();
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [packing, setPacking] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  async function select(files: File[]) {
    if (!files.length || disabled || packing) return;
    controller.current = new AbortController();
    setPacking(true);
    onBusyChange(true);
    try {
      const result = await createFolderZip(
        files,
        maxFileBytes,
        controller.current.signal,
      );
      const uid = crypto.randomUUID();
      onFile({
        uid,
        name: result.file.name,
        size: result.file.size,
        type: result.file.type,
        originFileObj: Object.assign(result.file, { uid }) as NonNullable<
          UploadFile['originFileObj']
        >,
      });
      notification.success({
        title: 'Đã chuẩn bị thư mục để nộp',
        description: `${result.file.name} · ${result.count} file${result.excluded ? ` · Bỏ ${result.excluded} file trong node_modules/.git` : ''}`,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        notification.error({
          title: 'Chưa nén được thư mục',
          description: errorMessage(error),
        });
    } finally {
      setPacking(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="mt-3">
      <input
        type="file"
        multiple
        hidden
        aria-label="Chọn thư mục để nộp"
        disabled={disabled || packing}
        ref={(element) => {
          input.current = element;
          if (element) element.webkitdirectory = true;
        }}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void select(files);
        }}
      />
      <Button
        icon={<FolderOpenOutlined />}
        loading={packing}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {packing ? 'Đang nén thư mục…' : 'Chọn thư mục'}
      </Button>
      <p className="mt-2 mb-0 text-sm text-muted">
        Thư mục được tự nén thành một ZIP; bỏ node_modules và .git.
      </p>
    </div>
  );
}
