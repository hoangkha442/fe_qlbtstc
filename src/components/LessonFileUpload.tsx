import { App, Button, Upload } from 'antd';
import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { submissionFileExtension } from '../lib/utils';
import { FileList } from './common';

const extensions = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'tif',
  'tiff',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'tar.gz',
  'txt',
  'csv',
  'md',
  'json',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'tsx',
  'vue',
  'svelte',
  'php',
  'py',
  'java',
  'cs',
  'go',
  'rs',
  'sql',
  'c',
  'cpp',
  'h',
  'hpp',
  'rb',
  'kt',
  'swift',
  'dart',
  'yaml',
  'yml',
  'ipynb',
];
export default function LessonFileUpload({
  value,
  onChange,
  existingCount,
  disabled,
}: {
  value: UploadFile[];
  onChange: (files: UploadFile[]) => void;
  existingCount: number;
  disabled: boolean;
}) {
  const { message } = App.useApp();
  const available = Math.max(0, 10 - existingCount);
  return (
    <>
      <Upload.Dragger
        multiple
        accept={extensions.map((extension) => `.${extension}`).join(',')}
        fileList={value}
        showUploadList={false}
        maxCount={available || undefined}
        disabled={disabled || available === 0}
        beforeUpload={(file, batch) => {
          if (!submissionFileExtension(file.name, extensions)) {
            void message.error(
              `File ${file.name}: định dạng không được hỗ trợ.`,
            );
            return Upload.LIST_IGNORE;
          }
          if (!file.size || file.size > 10 * 1024 * 1024) {
            void message.error(
              `File ${file.name}: cần có nội dung và không vượt quá 10 MB.`,
            );
            return Upload.LIST_IGNORE;
          }
          const valid = batch.filter(
            (item) =>
              item.size > 0 &&
              item.size <= 10 * 1024 * 1024 &&
              submissionFileExtension(item.name, extensions),
          );
          const remaining = Math.max(0, available - value.length);
          if (valid.indexOf(file) >= remaining) {
            if (valid.indexOf(file) === remaining)
              void message.warning('Mỗi bài học có tối đa 10 file đính kèm.');
            return Upload.LIST_IGNORE;
          }
          return false;
        }}
        onChange={({ fileList }) => {
          onChange(fileList.slice(0, available));
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Chọn hoặc kéo file vào đây</p>
        <p className="ant-upload-hint">
          Tài liệu, hình ảnh, mã nguồn, ZIP, RAR, 7Z · 10 MB/file
        </p>
      </Upload.Dragger>
      {value.length > 0 && (
        <div className="mt-3" data-lesson-upload-list>
          <FileList
            files={value.map((file) => ({
              originalName: file.name,
              bytes: file.size ?? 0,
              format: submissionFileExtension(file.name, extensions),
            }))}
            action={(_, index) => (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={disabled}
                aria-label={`Bỏ file ${value[index].name}`}
                onClick={() =>
                  onChange(
                    value.filter((file) => file.uid !== value[index].uid),
                  )
                }
              />
            )}
          />
        </div>
      )}
      <p className="mt-2 mb-5 text-sm text-muted">
        {existingCount + value.length}/10 file · File mới được tải lên khi lưu
        bài học.
      </p>
    </>
  );
}
