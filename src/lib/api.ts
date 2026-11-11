import axios from 'axios';
import type { Page } from './types';

export const TOKEN_KEY = 'nopbai.lecturer.token';
export const STUDENT_TOKEN_KEY = 'nopbai.student.token';
const configured = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
export const api = axios.create({
  baseURL: configured,
  timeout: 30000,
  headers: { Accept: 'application/json' },
});
api.interceptors.request.use((config) => {
  const studentRoute = config.url?.startsWith('/student/');
  const token = sessionStorage.getItem(
    studentRoute ? STUDENT_TOKEN_KEY : TOKEN_KEY,
  );
  if (
    token &&
    (studentRoute ||
      config.url?.startsWith('/lecturer') ||
      config.url?.startsWith('/auth/me'))
  )
    config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.config?.url?.startsWith('/student/')
    ) {
      const path = error.config.url;
      if (
        error.response?.status === 401 &&
        !['/student/auth/login', '/student/auth/change-password'].includes(path)
      )
        window.dispatchEvent(new Event('nopbai:student-session-expired'));
      if (
        error.response?.status === 403 &&
        error.response.data?.code === 'PASSWORD_CHANGE_REQUIRED'
      )
        window.dispatchEvent(new Event('nopbai:student-password-required'));
    }
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      (error.config?.url?.startsWith('/lecturer') ||
        error.config?.url?.startsWith('/auth/me'))
    )
      window.dispatchEvent(new Event('nopbai:session-expired'));
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429)
      return 'Bạn thao tác quá nhanh. Vui lòng chờ một phút rồi thử lại.';
    const message: unknown = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('. ');
    if (error.response?.status === 413)
      return 'File hoặc yêu cầu vượt quá dung lượng cho phép.';
    if (error.code === 'ECONNABORTED')
      return 'Kết nối quá thời gian chờ. Bạn có thể thử lại yêu cầu.';
    if (!error.response)
      return 'Chưa thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
  }
  return error instanceof Error
    ? error.message
    : 'Có lỗi xảy ra. Vui lòng thử lại.';
}

export async function get<T>(
  path: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
) {
  return (await api.get<T>(path, { params, signal })).data;
}
export async function allPages<T>(
  path: string,
  params: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const response = await get<Page<T>>(
      path,
      { ...params, page, limit: 100 },
      signal,
    );
    items.push(...response.items);
    if (items.length >= response.total || response.items.length === 0)
      return items;
    page++;
  }
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function download(
  path: string,
  filename: string,
  params?: Record<string, unknown>,
) {
  try {
    const response = await api.get<Blob>(path, {
      params,
      responseType: 'blob',
      timeout: 180000,
    });
    saveBlob(response.data, filename);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const parsed = JSON.parse(await error.response.data.text()) as {
          message?: string;
        };
        if (parsed.message) throw new Error(parsed.message);
      } catch (parsedError) {
        if (
          parsedError instanceof Error &&
          !(parsedError instanceof SyntaxError)
        )
          throw parsedError;
      }
    }
    throw error;
  }
}

export async function downloadReceiptFile(
  receiptCode: string,
  secret: string,
  version: number,
  fileIndex: number,
  filename: string,
) {
  try {
    const response = await api.post<Blob>(
      '/public/receipts/file',
      {
        receiptCode,
        secret,
        version,
        fileIndex,
      },
      { responseType: 'blob', timeout: 180000 },
    );
    saveBlob(response.data, filename);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const parsed = JSON.parse(await error.response.data.text()) as {
          message?: string | string[];
        };
        if (parsed.message)
          throw new Error(
            Array.isArray(parsed.message)
              ? parsed.message.join('. ')
              : parsed.message,
          );
      } catch (parsedError) {
        if (
          parsedError instanceof Error &&
          !(parsedError instanceof SyntaxError)
        )
          throw parsedError;
      }
    }
    throw error;
  }
}
