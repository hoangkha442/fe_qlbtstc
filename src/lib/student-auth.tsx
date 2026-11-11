import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get, STUDENT_TOKEN_KEY } from './api';
import type { StudentProfile, StudentSession } from './types';
import { StudentContext } from './student-context';

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() =>
    sessionStorage.getItem(STUDENT_TOKEN_KEY),
  );
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ['student', 'me', token],
    queryFn: ({ signal }) =>
      get<StudentProfile>('/student/auth/me', undefined, signal),
    enabled: !!token,
    retry: false,
    staleTime: 0,
  });
  function clearSession() {
    sessionStorage.removeItem(STUDENT_TOKEN_KEY);
    setToken(null);
    void client.cancelQueries({ queryKey: ['student'] });
    client.removeQueries({ queryKey: ['student'] });
  }
  useEffect(() => {
    const expired = () => {
      sessionStorage.removeItem(STUDENT_TOKEN_KEY);
      setToken(null);
      void client.cancelQueries({ queryKey: ['student'] });
      client.removeQueries({ queryKey: ['student'] });
    };
    const requirePassword = () => {
      client.setQueryData<StudentProfile>(['student', 'me', token], (old) =>
        old ? { ...old, mustChangePassword: true } : old,
      );
    };
    window.addEventListener('nopbai:student-session-expired', expired);
    window.addEventListener(
      'nopbai:student-password-required',
      requirePassword,
    );
    return () => {
      window.removeEventListener('nopbai:student-session-expired', expired);
      window.removeEventListener(
        'nopbai:student-password-required',
        requirePassword,
      );
    };
  }, [client, token]);
  function setSession(data: StudentSession) {
    sessionStorage.setItem(STUDENT_TOKEN_KEY, data.accessToken);
    client.setQueryData(['student', 'me', data.accessToken], data.student);
    setToken(data.accessToken);
  }
  async function login(username: string, password: string) {
    const { data } = await api.post<StudentSession>('/student/auth/login', {
      username: username.trim().toLowerCase(),
      password,
    });
    void client.cancelQueries({ queryKey: ['student'] });
    client.removeQueries({ queryKey: ['student'] });
    setSession(data);
    return data.student;
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.post<StudentSession>(
      '/student/auth/change-password',
      { currentPassword, newPassword },
    );
    setSession(data);
  }
  async function logout() {
    try {
      await api.post('/student/auth/logout');
    } finally {
      clearSession();
    }
  }
  return (
    <StudentContext.Provider
      value={{
        student: token ? me.data : undefined,
        loading: !!token && me.isPending,
        error: token ? me.error : undefined,
        retry: () => {
          void me.refetch();
        },
        login,
        changePassword,
        logout,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}
