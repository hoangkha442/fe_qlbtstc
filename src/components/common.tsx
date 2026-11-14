import { Alert, Button, Empty, Skeleton, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  FileZipOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileWordOutlined,
  FileImageOutlined,
  ReloadOutlined,
  ExclamationCircleFilled,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AssignmentStatus, SubmissionFile } from '../lib/types';
import { errorMessage } from '../lib/api';
import { extensionColors, formatBytes, imageExtensions } from '../lib/utils';
import { brand } from '../lib/brand';

export function Brand({
  compact = false,
  to = '/',
}: {
  compact?: boolean;
  to?: string;
}) {
  return (
    <Link className="brand" to={to} aria-label={`${brand.name} - Trang chủ`}>
      <img src={brand.logo} width={36} height={36} alt="" />
      {!compact && (
        <span className="brand-wordmark" aria-hidden="true">
          <span className="brand-name">{brand.owner}</span>
          <span className="brand-descriptor">{brand.descriptor}</span>
        </span>
      )}
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  extra,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {extra && <div className="flex flex-wrap gap-2">{extra}</div>}
    </div>
  );
}
export function QueryState({
  pending,
  error,
  retry,
  children,
  empty = false,
  emptyText = 'Chưa có dữ liệu',
  emptyAction,
}: {
  pending: boolean;
  error?: unknown;
  retry?: () => void;
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
  emptyAction?: ReactNode;
}) {
  if (pending)
    return (
      <div className="surface p-6" aria-label="Đang tải dữ liệu">
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  if (error)
    return (
      <Alert
        type="error"
        showIcon
        title="Chưa tải được dữ liệu"
        description={errorMessage(error)}
        action={
          retry && (
            <Button icon={<ReloadOutlined />} onClick={retry}>
              Thử lại
            </Button>
          )
        }
      />
    );
  if (empty)
    return (
      <div className="surface empty-panel">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText}>
          {emptyAction}
        </Empty>
      </div>
    );
  return <>{children}</>;
}
export function StatusTag({ status }: { status: AssignmentStatus }) {
  const colors = {
    open: 'green',
    scheduled: 'blue',
    expired: 'orange',
    closed: 'default',
  };
  const icons = {
    open: <CheckCircleOutlined />,
    scheduled: <ClockCircleOutlined />,
    expired: <ExclamationCircleOutlined />,
    closed: <StopOutlined />,
  };
  return (
    <Tag
      className="status-tag"
      color={colors[status.code]}
      icon={icons[status.code]}
    >
      <span className="status-dot" />
      {status.label}
      {status.code === 'expired' && status.accepting ? ' · Cho nộp trễ' : ''}
    </Tag>
  );
}
export function ImportantNotice({
  children,
  title = 'Quan trọng',
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <aside className="important-notice" role="note">
      <ExclamationCircleFilled />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </aside>
  );
}
export function FileIcon({
  format,
  small = false,
}: {
  format: string;
  small?: boolean;
}) {
  const Icon =
    format === 'zip'
      ? FileZipOutlined
      : format.startsWith('xls')
        ? FileExcelOutlined
        : format.startsWith('ppt')
          ? FilePptOutlined
          : imageExtensions.includes(format)
            ? FileImageOutlined
            : FileWordOutlined;
  return (
    <span
      className={small ? 'file-icon small' : 'file-icon'}
      style={{
        color: extensionColors[format] ?? '#203e7e',
        backgroundColor: `${extensionColors[format] ?? '#203e7e'}12`,
      }}
    >
      <Icon />
    </span>
  );
}
export function FileList({
  files,
  action,
}: {
  files: SubmissionFile[];
  action?: (file: SubmissionFile, index: number) => ReactNode;
}) {
  return (
    <div className="file-list">
      {files.map((file, index) => (
        <div className="file-row" key={`${file.originalName}-${index}`}>
          <FileIcon format={file.format} />
          <div className="min-w-0 flex-1">
            <div className="font-medium break-words">{file.originalName}</div>
            <div className="mt-1 text-xs text-muted">
              {formatBytes(file.bytes)} · {file.format.toUpperCase()}
            </div>
          </div>
          {action?.(file, index)}
        </div>
      ))}
    </div>
  );
}
export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <Button
      type="text"
      className="back-button"
      icon={<ArrowLeftOutlined />}
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      Quay lại
    </Button>
  );
}
