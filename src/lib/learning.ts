export const levels = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};
export function duration(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes ? `${minutes} phút` : 'Tự học';
}
export function safeHttps(value?: string) {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
