import { Button, Form, InputNumber, Select } from 'antd';
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
  const update = (values: string[]) =>
    onChange?.([...new Set(values.map(normalizeExtension).filter(Boolean))]);
  return (
    <div>
      <Select
        id={id}
        className="w-full"
        mode="tags"
        value={value}
        disabled={disabled}
        onChange={update}
        placeholder="Chọn định dạng hoặc nhập phần mở rộng rồi Enter"
        tokenSeparators={[',', ';', ' ']}
        maxTagCount="responsive"
        options={groups.map((group) => ({
          label: group.label,
          options: group.extensions.map((extension) => ({
            value: extension,
            label: extension === 'zip' ? '.zip / Thư mục' : `.${extension}`,
          })),
        }))}
      />
      <div
        className="mt-3 flex flex-wrap gap-2"
        aria-label="Chọn nhanh nhóm định dạng"
      >
        {groups.map((group) => {
          const selected = group.extensions.every((extension) =>
            value.includes(extension),
          );
          return (
            <Button
              key={group.label}
              size="small"
              type={selected ? 'primary' : 'default'}
              disabled={disabled}
              onClick={() =>
                update(
                  selected
                    ? value.filter(
                        (extension) => !group.extensions.includes(extension),
                      )
                    : [...value, ...group.extensions],
                )
              }
            >
              {group.label}
            </Button>
          );
        })}
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
        extra="Có thể chọn nhiều loại hoặc nhập thêm: .pdf, .zip, .csv... Chọn ZIP để nhận cả thư mục được tự nén."
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
              max: 5,
              message: 'Chọn từ 1 đến 5 file.',
            },
          ]}
        >
          <InputNumber className="w-full" min={1} max={5} />
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
