import { useState } from 'react';
import { App, Button, Tooltip } from 'antd';
import { DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import type { LessonFile } from '../lib/types';
import { download, errorMessage } from '../lib/api';
import { FileList } from './common';

export default function LessonFiles({
  files,
  lessonId,
  role,
  onRemove,
  disabled = false,
}: {
  files: LessonFile[];
  lessonId: string;
  role: 'lecturer' | 'student';
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState('');
  async function save(file: LessonFile) {
    if (busy) return;
    setBusy(file.id);
    try {
      await download(
        `/${role}/lessons/${lessonId}/files/${file.id}`,
        file.originalName,
      );
    } catch (error) {
      void message.error(errorMessage(error));
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="space-y-3">
      {files.map((file) => (
        <FileList
          key={file.id}
          files={[file]}
          version={0}
          access={{ kind: 'lesson', role, lessonId, fileId: file.id }}
          action={() => (
            <>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                aria-label={`Tải ${file.originalName}`}
                loading={busy === file.id}
                disabled={!!busy || disabled}
                onClick={() => void save(file)}
              >
                Tải file
              </Button>
              {onRemove && (
                <Tooltip title="Gỡ file khi lưu bài học">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={disabled}
                    aria-label={`Gỡ ${file.originalName}`}
                    onClick={() => onRemove(file.id)}
                  />
                </Tooltip>
              )}
            </>
          )}
        />
      ))}
    </div>
  );
}
