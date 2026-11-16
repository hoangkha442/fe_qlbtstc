import { useState } from 'react';
import { Button, Checkbox, Collapse, Form, Input, InputNumber } from 'antd';
import {
  imageExtensions,
  normalizeExtension,
  officeExtensions,
  submissionExtensionPattern,
} from '../lib/utils';

const groups = [
  {
    label: 'Tài liệu',
    extensions: [...officeExtensions, 'pdf', 'txt', 'csv', 'md'],
  },
  { label: 'Hình ảnh', extensions: imageExtensions },
  { label: 'ZIP / Thư mục', extensions: ['zip'] },
  { label: 'File nén khác', extensions: ['rar', '7z', 'tar', 'gz', 'tar.gz'] },
  {
    label: 'Mã nguồn',
    extensions: [
      'html',
      'css',
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      'xml',
      'sql',
      'py',
      'java',
      'php',
      'vue',
      'yaml',
    ],
  },
];
function FileFormatSelect({
  value = [],
  onChange,
  id,
  disabled,
}: {
  value?: string[];
  onChange?: (value: string[]) => void;
  id?: string;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState('');
  const update = (values: string[]) =>
    onChange?.([...new Set(values.map(normalizeExtension).filter(Boolean))]);
  const known = new Set(groups.flatMap((group) => group.extensions));
  function addCustom() {
    const extensions = custom
      .split(/[,;\s]+/)
      .map(normalizeExtension)
      .filter(Boolean);
    if (!extensions.length) return;
    if (
      extensions.some(
        (extension) => !submissionExtensionPattern.test(extension),
      )
    ) {
      setCustomError('Nhập phần mở rộng như pdf, zip hoặc tar.gz.');
      return;
    }
    update([...value, ...extensions]);
    setCustom('');
    setCustomError('');
  }
  return (
    <div id={id} role="group" aria-label="Các định dạng được nhận">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-medium">
          {value.length
            ? `Đã chọn ${value.length} định dạng`
            : 'Chưa chọn định dạng'}
        </span>
        {value.length > 0 && (
          <Button
            size="small"
            type="link"
            disabled={disabled}
            onClick={() => update([])}
          >
            Bỏ chọn tất cả
          </Button>
        )}
      </div>
      <Collapse
        accordion
        defaultActiveKey="Tài liệu"
        items={groups.map((group) => {
          const count = group.extensions.filter((extension) =>
            value.includes(extension),
          ).length;
          const all = count === group.extensions.length;
          return {
            key: group.label,
            label: (
              <span className="font-medium">
                {group.label}
                {count > 0 && (
                  <span className="ml-2 text-sm text-muted">
                    {count} đã chọn
                  </span>
                )}
              </span>
            ),
            extra: (
              <span
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Checkbox
                  checked={all}
                  indeterminate={count > 0 && !all}
                  disabled={disabled}
                  onChange={() =>
                    update(
                      all
                        ? value.filter(
                            (extension) =>
                              !group.extensions.includes(extension),
                          )
                        : [...value, ...group.extensions],
                    )
                  }
                >
                  Cả nhóm
                </Checkbox>
              </span>
            ),
            children: (
              <Checkbox.Group
                className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3"
                value={value.filter((extension) =>
                  group.extensions.includes(extension),
                )}
                disabled={disabled}
                options={group.extensions.map((extension) => ({
                  label: `.${extension}`,
                  value: extension,
                }))}
                onChange={(selected) =>
                  update([
                    ...value.filter(
                      (extension) => !group.extensions.includes(extension),
                    ),
                    ...selected.map(String),
                  ])
                }
              />
            ),
          };
        })}
      />
      {value.length > 0 && (
        <p className="mt-3 mb-0 break-words text-sm">
          Được nộp: {value.map((extension) => `.${extension}`).join(', ')}
        </p>
      )}
      <div className="mt-5">
        <label className="mb-2 block font-medium" htmlFor={`${id}-custom`}>
          Định dạng khác
        </label>
        <div className="flex gap-2">
          <Input
            id={`${id}-custom`}
            value={custom}
            disabled={disabled}
            placeholder="Ví dụ: .csv, .rar, .tar.gz"
            onChange={(event) => {
              setCustom(event.target.value);
              setCustomError('');
            }}
            onPressEnter={(event) => {
              event.preventDefault();
              addCustom();
            }}
          />
          <Button disabled={disabled} onClick={addCustom}>
            Thêm
          </Button>
        </div>
        {customError && (
          <p className="mt-2 text-red-600" role="alert">
            {customError}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {value
            .filter((extension) => !known.has(extension))
            .map((extension) => (
              <Checkbox
                key={extension}
                checked
                disabled={disabled}
                onChange={() =>
                  update(value.filter((item) => item !== extension))
                }
              >
                .{extension}
              </Checkbox>
            ))}
        </div>
      </div>
    </div>
  );
}
function FileSizeInput({
  value,
  onChange,
  id,
}: {
  value?: number;
  onChange?: (value: number | null) => void;
  id?: string;
}) {
  return (
    <InputNumber
      id={id}
      className="w-full"
      min={0.001}
      max={10}
      precision={3}
      step={0.5}
      value={value == null ? undefined : value / 1024 / 1024}
      onChange={(number) =>
        onChange?.(
          number == null ? null : Math.max(1, Math.floor(number * 1024 * 1024)),
        )
      }
    />
  );
}
export default function AssignmentFileRules({
  prefix = [],
}: {
  prefix?: (string | number)[];
}) {
  const field = (name: string) => [...prefix, name];
  return (
    <>
      <h3 className="mt-6 mb-4">Hình thức và định dạng nộp bài</h3>
      <Form.Item
        name={field('allowedExtensions')}
        label="Các định dạng được nhận"
        extra="Chọn từng định dạng hoặc cả nhóm. ZIP nhận cả thư mục được tự nén."
        rules={[
          {
            required: true,
            type: 'array',
            min: 1,
            max: 64,
            message: 'Chọn từ 1 đến 64 định dạng.',
          },
          {
            validator: (_, values: string[] | undefined) =>
              !values ||
              values.every((extension) =>
                submissionExtensionPattern.test(extension),
              )
                ? Promise.resolve()
                : Promise.reject(
                    new Error(
                      'Nhập phần mở rộng như pdf, zip hoặc tar.gz; không nhập đường dẫn hay ký tự *.',
                    ),
                  ),
          },
        ]}
      >
        <FileFormatSelect />
      </Form.Item>
      <div className="grid grid-cols-2 gap-5">
        <Form.Item
          name={field('maxFiles')}
          label="Số file tối đa"
          rules={[
            {
              required: true,
              type: 'integer',
              min: 1,
              max: 10,
              message: 'Chọn từ 1 đến 10 file.',
            },
          ]}
        >
          <InputNumber className="w-full" min={1} max={10} />
        </Form.Item>
        <Form.Item
          name={field('maxFileBytes')}
          label="Dung lượng mỗi file (MB)"
          rules={[
            {
              required: true,
              type: 'integer',
              min: 1,
              max: 10485760,
              message: 'Dung lượng tối đa 10 MB/file.',
            },
          ]}
        >
          <FileSizeInput />
        </Form.Item>
      </div>
    </>
  );
}
