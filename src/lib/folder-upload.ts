import { zip } from 'fflate';
import type { AsyncZippable } from 'fflate';

export async function createFolderZip(
  files: File[],
  maxBytes: number,
  signal?: AbortSignal,
) {
  if (!files.length) throw new Error('Thư mục không có file để nộp.');
  const entries: AsyncZippable = Object.create(null) as AsyncZippable;
  const paths = new Set<string>();
  let total = 0;
  let excluded = 0;
  let root = '';
  for (const file of files) {
    if (signal?.aborted)
      throw new DOMException('Đã hủy nén thư mục.', 'AbortError');
    const filename = (file.webkitRelativePath || file.name).normalize('NFKC');
    const segments = filename.split('/');
    if (
      segments.some((segment) =>
        ['node_modules', '.git'].includes(segment.toLowerCase()),
      )
    ) {
      excluded++;
      continue;
    }
    if (
      segments.some(
        (segment) =>
          !segment ||
          segment === '.' ||
          segment === '..' ||
          /[\\\0:]/.test(segment),
      )
    )
      throw new Error('Thư mục chứa đường dẫn file không hợp lệ.');
    if (paths.has(filename.toLowerCase()))
      throw new Error(`Tên file bị trùng: ${filename}`);
    if (
      paths.size >= 5000 ||
      file.size > 20 * 1024 * 1024 ||
      total + file.size > 100 * 1024 * 1024
    )
      throw new Error(
        'Thư mục tối đa 5.000 file, 20 MB/file và tổng dung lượng 100 MB trước khi nén.',
      );
    root ||= segments.length > 1 ? segments[0] : 'bai-tap';
    paths.add(filename.toLowerCase());
    total += file.size;
    entries[filename] = new Uint8Array(await file.arrayBuffer());
  }
  if (!paths.size || total === 0)
    throw new Error(
      'Thư mục không có nội dung sau khi bỏ node_modules và .git.',
    );
  const data = await new Promise<Uint8Array>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Đã hủy nén thư mục.', 'AbortError'));
      return;
    }
    let cancel = () => {};
    const abort = () => {
      cancel();
      reject(new DOMException('Đã hủy nén thư mục.', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    cancel = zip(entries, { level: 6 }, (error, zipped) => {
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(zipped);
    });
  });
  if (signal?.aborted)
    throw new DOMException('Đã hủy nén thư mục.', 'AbortError');
  if (data.byteLength > maxBytes)
    throw new Error(
      'ZIP sau khi nén vượt dung lượng mỗi file mà giảng viên cho phép. Hãy giảm nội dung thư mục.',
    );
  const name =
    root.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 100) || 'bai-tap';
  return {
    file: new File([new Uint8Array(data)], `${name}.zip`, {
      type: 'application/zip',
    }),
    count: paths.size,
    excluded,
  };
}
