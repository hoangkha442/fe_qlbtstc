import { createContext, useContext } from 'react';
import type { StudentProfile } from './types';

export interface StudentAuth {
  student?: StudentProfile;
  loading: boolean;
  error: unknown;
  retry: () => void;
  login: (username: string, password: string) => Promise<StudentProfile>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}
export const StudentContext = createContext<StudentAuth | null>(null);
export function useStudentAuth() {
  const context = useContext(StudentContext);
  if (!context) throw new Error('Thiếu StudentAuthProvider');
  return context;
}
export function studentReturn(value: unknown) {
  return typeof value === 'string' &&
    /^\/specialized(?:\/|\?|$)/.test(value) &&
    !/^\/specialized\/(login|change-password)(?:\/|\?|$)/.test(value)
    ? value
    : '/specialized';
}
