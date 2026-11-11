import type { Dayjs } from 'dayjs';
import { TIMEZONE } from './utils';

export interface AssignmentDraft {
  title: string;
  instructions?: string;
  opensAt: Dayjs;
  dueAt: Dayjs;
  allowResubmit?: boolean;
  allowLate?: boolean;
  manuallyClosed?: boolean;
}

export function assignmentPayload(values: AssignmentDraft) {
  if (!values.opensAt?.isValid() || !values.dueAt?.isValid())
    throw new Error('Vui lòng chọn thời gian mở và hạn nộp.');
  const opensAt = values.opensAt.tz(TIMEZONE, true);
  const dueAt = values.dueAt.tz(TIMEZONE, true);
  if (dueAt.valueOf() <= opensAt.valueOf())
    throw new Error('Hạn nộp phải sau thời gian mở.');
  return {
    title: values.title.trim(),
    instructions: values.instructions?.trim() ?? '',
    opensAt: opensAt.format(),
    dueAt: dueAt.format(),
    allowResubmit: values.allowResubmit ?? false,
    allowLate: values.allowLate ?? false,
    manuallyClosed: values.manuallyClosed ?? false,
  };
}

export interface AssignmentAttachmentsDraft {
  assignmentIds?: string[];
  assignments?: AssignmentDraft[];
}

export function attachmentsPayload(values: AssignmentAttachmentsDraft) {
  return {
    assignmentIds: values.assignmentIds ?? [],
    assignments: (values.assignments ?? []).map(assignmentPayload),
  };
}
