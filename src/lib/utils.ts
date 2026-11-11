import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/vi';
import type { Assignment, AssignmentStatus, Ref } from './types';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('vi');
export { dayjs };
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
export function dateTime(date?: string, pattern = 'HH:mm · DD/MM/YYYY') {
  return date ? dayjs(date).tz(TIMEZONE).format(pattern) : '—';
}
export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? bytes < 1024
      ? `${bytes} B`
      : `${(bytes / 1024).toFixed(0)} KB`
    : `${Number((bytes / 1024 / 1024).toFixed(1))} MB`;
}
export function refId<T extends { _id: string }>(value: Ref<T>) {
  return typeof value === 'string' ? value : value._id;
}
export function refName<T extends { name?: string; fullName?: string }>(
  value?: Ref<T>,
) {
  return typeof value === 'object' && value
    ? (value.name ?? value.fullName ?? '—')
    : '—';
}
export function statusOf(
  a: Pick<
    Assignment,
    'archived' | 'manuallyClosed' | 'opensAt' | 'dueAt' | 'allowLate'
  >,
  now = Date.now(),
): AssignmentStatus {
  if (a.archived || a.manuallyClosed)
    return { code: 'closed', label: 'Đã đóng', accepting: false };
  if (now < Date.parse(a.opensAt))
    return { code: 'scheduled', label: 'Chưa mở', accepting: false };
  if (now > Date.parse(a.dueAt))
    return { code: 'expired', label: 'Đã hết hạn', accepting: a.allowLate };
  return { code: 'open', label: 'Đang nhận bài', accepting: true };
}
export const extensionColors: Record<string, string> = {
  zip: '#7b61a8',
  doc: '#2674c7',
  docx: '#2674c7',
  xls: '#21805b',
  xlsx: '#21805b',
  ppt: '#d86b3b',
  pptx: '#d86b3b',
};
export const mimeTypes: Record<string, string> = {
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export const initialFilters = { page: 1, limit: 10 };
