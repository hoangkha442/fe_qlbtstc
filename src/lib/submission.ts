import type { StudentFields } from './types';
import { mimeTypes } from './utils';

export function submissionBody(fields: StudentFields, files: File[]) {
  const body = new FormData();
  body.append('studentCode', fields.studentCode);
  body.append('fullName', fields.fullName);
  body.append('email', fields.email);
  if (fields.note) body.append('note', fields.note);
  if (fields.secret) body.append('secret', fields.secret);
  for (const file of files)
    body.append(
      'files',
      file.type
        ? file
        : new File([file], file.name, {
            type: mimeTypes[file.name.split('.').pop()?.toLowerCase() ?? ''],
          }),
      file.name,
    );
  return body;
}

interface SavedAttempt {
  key: string;
  fingerprint: string;
  fields: Omit<StudentFields, 'secret'>;
}
export async function submissionKey(
  assignmentId: string,
  fields: StudentFields,
  files: File[],
) {
  const digests = await Promise.all(
    files.map(async (file) => {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        await file.arrayBuffer(),
      );
      return {
        name: file.name,
        size: file.size,
        digest: Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join(''),
      };
    }),
  );
  const fingerprint = JSON.stringify({
    studentCode: fields.studentCode,
    fullName: fields.fullName,
    email: fields.email,
    note: fields.note ?? '',
    files: digests,
  });
  const storageKey = `nopbai.attempt.${assignmentId}.${fields.studentCode}`;
  const previous = sessionStorage.getItem(storageKey);
  if (previous) {
    const saved = JSON.parse(previous) as SavedAttempt;
    if (saved.fingerprint !== fingerprint)
      throw new Error(
        'Có lần nộp trước chưa được xác nhận cho mã sinh viên này. Hãy chọn lại đúng file và thông tin của lần trước để thử lại, hoặc tra cứu biên nhận trước khi nộp lần mới.',
      );
    return { key: saved.key, storageKey };
  }
  const key = crypto.randomUUID();
  const { secret: _secret, ...safeFields } = fields;
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      key,
      fingerprint,
      fields: safeFields,
    } satisfies SavedAttempt),
  );
  return { key, storageKey };
}
