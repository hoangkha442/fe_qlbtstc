import { DatePicker, Form, Input, Switch } from 'antd';
import RichTextEditor from './RichTextEditor';

export default function AssignmentContentFields({
  prefix = [],
}: {
  prefix?: (string | number)[];
}) {
  const field = (name: string) => [...prefix, name];
  return (
    <>
      <Form.Item
        name={field('title')}
        label="Tên bài tập"
        rules={[
          { required: true, whitespace: true },
          { min: 1, max: 200 },
        ]}
      >
        <Input placeholder="Nhập tên bài tập mã nguồn" />
      </Form.Item>
      <Form.Item
        name={field('instructions')}
        label="Yêu cầu bài tập"
        rules={[{ max: 20000 }]}
      >
        <RichTextEditor
          aria-label="Yêu cầu bài tập"
          maxLength={20000}
          placeholder="Nội dung cần thực hiện và yêu cầu về mã nguồn"
        />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name={field('opensAt')}
          label="Thời gian mở (giờ Việt Nam)"
          rules={[{ required: true }]}
        >
          <DatePicker
            className="w-full"
            showTime
            format="DD/MM/YYYY HH:mm"
            placeholder="Chọn ngày, giờ mở"
          />
        </Form.Item>
        <Form.Item
          name={field('dueAt')}
          label="Hạn nộp (giờ Việt Nam)"
          rules={[{ required: true }]}
        >
          <DatePicker
            className="w-full"
            showTime
            format="DD/MM/YYYY HH:mm"
            placeholder="Chọn hạn nộp"
          />
        </Form.Item>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Form.Item
          name={field('allowResubmit')}
          label="Cho nộp lại"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name={field('allowLate')}
          label="Cho nộp trễ"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name={field('manuallyClosed')}
          label="Đóng nhận bài"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </div>
    </>
  );
}
