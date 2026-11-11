import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import '../rich-text.css';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Form,
  Input,
  Modal,
  Tooltip,
} from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  CodeOutlined,
  SnippetsOutlined,
  UndoOutlined,
  RedoOutlined,
  ClearOutlined,
  DownOutlined,
  TableOutlined,
} from '@ant-design/icons';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  tall?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
};

export default function RichTextEditor({
  value = '',
  onChange,
  onBlur,
  id,
  disabled,
  placeholder = 'Nhập nội dung…',
  maxLength,
  tall = false,
  'aria-label': label,
  'aria-describedby': describedBy,
}: Props) {
  const { componentDisabled } = ConfigProvider.useConfig();
  const { status } = Form.Item.useStatus();
  const isDisabled = disabled ?? componentDisabled ?? false;
  const lastValue = useRef(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        underline: false,
        link: {
          openOnClick: false,
          defaultProtocol: 'https',
          isAllowedUri: (url) => /^(https?:\/\/|mailto:)/i.test(url),
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        },
      }),
      Markdown.configure({ markedOptions: { breaks: true } }),
      TableKit,
      Image.configure({ allowBase64: false }),
    ],
    content: value,
    contentType: 'markdown',
    editable: !isDisabled,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor }) => {
      const next = editor.isEmpty ? '' : editor.getMarkdown();
      lastValue.current = next;
      onChange?.(next);
    },
    onBlur: () => onBlur?.(),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold'),
      italic: editor?.isActive('italic'),
      strike: editor?.isActive('strike'),
      bullet: editor?.isActive('bulletList'),
      ordered: editor?.isActive('orderedList'),
      quote: editor?.isActive('blockquote'),
      code: editor?.isActive('codeBlock'),
      link: editor?.isActive('link'),
      table: editor?.isActive('table'),
      heading: editor?.isActive('heading', { level: 2 })
        ? 'h2'
        : editor?.isActive('heading', { level: 3 })
          ? 'h3'
          : 'paragraph',
      undo: editor?.can().undo(),
      redo: editor?.can().redo(),
      empty: editor?.isEmpty ?? true,
    }),
  });
  useEffect(() => {
    if (!editor || value === lastValue.current) return;
    editor.commands.setContent(value, {
      contentType: 'markdown',
      emitUpdate: false,
    });
    lastValue.current = value;
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!isDisabled);
  }, [editor, isDisabled]);
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        attributes: {
          id: id ?? '',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': label || 'Nội dung',
          ...(describedBy ? { 'aria-describedby': describedBy } : {}),
          'aria-invalid': String(status === 'error'),
          'aria-disabled': String(isDisabled),
          'data-placeholder': placeholder,
        },
      },
    });
  }, [editor, id, label, describedBy, status, placeholder, isDisabled]);

  function openLink() {
    if (!editor) return;
    setLinkUrl((editor.getAttributes('link').href as string) ?? '');
    setLinkError('');
    setLinkOpen(true);
  }
  function saveLink() {
    if (!editor || isDisabled) return;
    let href = linkUrl.trim();
    if (href && !/^[a-z][a-z\d+.-]*:/i.test(href)) href = `https://${href}`;
    try {
      const url = new URL(href);
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol))
        throw new Error();
      if (url.protocol === 'mailto:' && !url.pathname.includes('@'))
        throw new Error();
    } catch {
      setLinkError('Nhập liên kết HTTP, HTTPS hoặc email hợp lệ.');
      return;
    }
    if (editor.state.selection.empty && !editor.isActive('link')) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: href,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  }
  const controls = [
    {
      title: 'In đậm',
      icon: <BoldOutlined />,
      active: state?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      title: 'In nghiêng',
      icon: <ItalicOutlined />,
      active: state?.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      title: 'Gạch ngang',
      icon: <StrikethroughOutlined />,
      active: state?.strike,
      run: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      title: 'Danh sách dấu đầu dòng',
      icon: <UnorderedListOutlined />,
      active: state?.bullet,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Danh sách đánh số',
      icon: <OrderedListOutlined />,
      active: state?.ordered,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Trích dẫn',
      icon: <SnippetsOutlined />,
      active: state?.quote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Khối mã nguồn',
      icon: <CodeOutlined />,
      active: state?.code,
      run: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Chèn liên kết',
      icon: <LinkOutlined />,
      active: state?.link,
      run: openLink,
    },
    {
      title: 'Xóa định dạng',
      icon: <ClearOutlined />,
      active: false,
      run: () => editor?.chain().focus().clearNodes().unsetAllMarks().run(),
    },
  ];
  return (
    <div
      className={`rich-editor ${tall ? 'rich-editor-tall' : ''} ${state?.empty ? 'is-empty' : ''} ${isDisabled ? 'is-disabled' : ''} ${status === 'error' ? 'has-error' : ''}`}
    >
      <div
        className="rich-editor-toolbar"
        role="toolbar"
        aria-label="Định dạng nội dung"
      >
        <Dropdown
          disabled={isDisabled || !editor}
          menu={{
            selectedKeys: [state?.heading ?? 'paragraph'],
            items: [
              { key: 'paragraph', label: 'Đoạn văn' },
              { key: 'h2', label: 'Tiêu đề 2' },
              { key: 'h3', label: 'Tiêu đề 3' },
            ],
            onClick: ({ key }) => {
              if (key === 'paragraph')
                editor?.chain().focus().setParagraph().run();
              else
                editor
                  ?.chain()
                  .focus()
                  .toggleHeading({ level: key === 'h2' ? 2 : 3 })
                  .run();
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label="Kiểu đoạn văn"
            icon={<DownOutlined />}
            iconPlacement="end"
          >
            {state?.heading === 'h2'
              ? 'Tiêu đề 2'
              : state?.heading === 'h3'
                ? 'Tiêu đề 3'
                : 'Đoạn văn'}
          </Button>
        </Dropdown>
        {controls.map((control) => (
          <Tooltip title={control.title} key={control.title}>
            <Button
              type="text"
              size="small"
              aria-label={control.title}
              aria-pressed={!!control.active}
              disabled={isDisabled || !editor}
              icon={control.icon}
              onMouseDown={(event) => event.preventDefault()}
              onClick={control.run}
            />
          </Tooltip>
        ))}
        <Dropdown
          disabled={isDisabled || !editor}
          menu={{
            items: [
              {
                key: 'insert',
                label: 'Chèn bảng 3 × 3',
                disabled: !!state?.table,
              },
              { key: 'row', label: 'Thêm hàng', disabled: !state?.table },
              { key: 'column', label: 'Thêm cột', disabled: !state?.table },
              { key: 'removeRow', label: 'Xóa hàng', disabled: !state?.table },
              {
                key: 'removeColumn',
                label: 'Xóa cột',
                disabled: !state?.table,
              },
              {
                key: 'remove',
                label: 'Xóa bảng',
                danger: true,
                disabled: !state?.table,
              },
            ],
            onClick: ({ key }) => {
              if (!editor) return;
              const chain = editor.chain().focus();
              if (key === 'insert')
                chain
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run();
              if (key === 'row') chain.addRowAfter().run();
              if (key === 'column') chain.addColumnAfter().run();
              if (key === 'removeRow') chain.deleteRow().run();
              if (key === 'removeColumn') chain.deleteColumn().run();
              if (key === 'remove') chain.deleteTable().run();
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label="Bảng"
            aria-pressed={!!state?.table}
            icon={<TableOutlined />}
          />
        </Dropdown>
        <span className="rich-editor-divider" aria-hidden="true" />
        <Tooltip title="Hoàn tác">
          <Button
            type="text"
            size="small"
            aria-label="Hoàn tác"
            disabled={isDisabled || !state?.undo}
            icon={<UndoOutlined />}
            onClick={() => editor?.chain().focus().undo().run()}
          />
        </Tooltip>
        <Tooltip title="Làm lại">
          <Button
            type="text"
            size="small"
            aria-label="Làm lại"
            disabled={isDisabled || !state?.redo}
            icon={<RedoOutlined />}
            onClick={() => editor?.chain().focus().redo().run()}
          />
        </Tooltip>
      </div>
      <EditorContent editor={editor} />
      {maxLength && (
        <div
          className={`rich-editor-count ${value.length > maxLength ? 'over-limit' : ''}`}
        >
          {value.length.toLocaleString('vi-VN')} /{' '}
          {maxLength.toLocaleString('vi-VN')}
        </div>
      )}
      <Modal
        title="Chèn liên kết"
        open={linkOpen}
        onCancel={() => setLinkOpen(false)}
        onOk={saveLink}
        okText="Áp dụng"
        cancelText="Hủy"
        destroyOnHidden
        footer={(_, { OkBtn, CancelBtn }) => (
          <div className="flex flex-wrap justify-end gap-2">
            {state?.link && (
              <Button
                type="text"
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .extendMarkRange('link')
                    .unsetLink()
                    .run();
                  setLinkOpen(false);
                }}
              >
                Gỡ liên kết
              </Button>
            )}
            <CancelBtn />
            <OkBtn />
          </div>
        )}
      >
        <label htmlFor={`${id ?? 'content'}-link`}>Địa chỉ liên kết</label>
        <Input
          id={`${id ?? 'content'}-link`}
          className="mt-2"
          value={linkUrl}
          onChange={(event) => {
            setLinkUrl(event.target.value);
            setLinkError('');
          }}
          onPressEnter={saveLink}
          placeholder="https://"
          status={linkError ? 'error' : undefined}
          aria-invalid={!!linkError}
        />
        {linkError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {linkError}
          </p>
        )}
      </Modal>
    </div>
  );
}
