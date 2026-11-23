import { unzipSync } from 'fflate';

export const previewImageTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
};
const textFormats = new Set([
  'txt',
  'csv',
  'md',
  'json',
  'xml',
  'svg',
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
  'd.ts',
  'log',
  'ini',
  'env',
]);
export function canPreview(format: string) {
  return (
    Object.hasOwn(previewImageTypes, format) ||
    textFormats.has(format) ||
    [
      'pdf',
      'docx',
      'xlsx',
      'pptx',
      'zip',
      'mp4',
      'webm',
      'mp3',
      'wav',
      'ogg',
    ].includes(format)
  );
}
export const isTextPreview = (format: string) => textFormats.has(format);
export interface PreviewZipEntry {
  name: string;
  bytes: number;
}

export function inspectPreviewZip(data: Uint8Array) {
  const entries: PreviewZipEntry[] = [];
  const names = new Set<string>();
  let total = 0;
  unzipSync(data, {
    filter: (entry) => {
      total += entry.originalSize;
      if (
        names.size >= 5000 ||
        total > 100 * 1024 * 1024 ||
        entry.originalSize > 30 * 1024 * 1024 ||
        names.has(entry.name.toLowerCase()) ||
        /(?:^\/|^[a-z]:|(?:^|\/)\.\.(?:\/|$)|[\\\0])/i.test(entry.name)
      )
        throw new Error(
          'File nén vượt giới hạn xem trước hoặc chứa đường dẫn không hợp lệ.',
        );
      names.add(entry.name.toLowerCase());
      if (!entry.name.endsWith('/'))
        entries.push({ name: entry.name, bytes: entry.originalSize });
      return false;
    },
  });
  return entries;
}
export function extractPreviewEntry(
  data: Uint8Array,
  name: string,
  limit = 10 * 1024 * 1024,
) {
  const files = unzipSync(data, {
    filter: (entry) => {
      if (entry.name !== name) return false;
      if (entry.originalSize > limit)
        throw new Error('File bên trong quá lớn để xem trước.');
      return true;
    },
  });
  if (!Object.hasOwn(files, name))
    throw new Error('Không tìm thấy file trong ZIP.');
  return files[name];
}
export function previewFormat(filename: string) {
  return filename.toLowerCase().split('.').pop() ?? '';
}
export function decodePreviewText(bytes: Uint8Array) {
  const encoding =
    bytes[0] === 0xff && bytes[1] === 0xfe
      ? 'utf-16le'
      : bytes[0] === 0xfe && bytes[1] === 0xff
        ? 'utf-16be'
        : 'utf-8';
  return new TextDecoder(encoding).decode(bytes.subarray(0, 2 * 1024 * 1024));
}
