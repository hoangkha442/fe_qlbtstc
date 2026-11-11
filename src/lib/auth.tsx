import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get, TOKEN_KEY } from './api';
import type { Lecturer } from './types';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () => get<Lecturer>('/auth/me'),
    enabled: !!token,
    retry: false,
    staleTime: 60000,
  });
  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    void client.cancelQueries({ queryKey: ['lecturer'] });
    client.removeQueries({ queryKey: ['lecturer'] });
    client.removeQueries({ queryKey: ['auth'] });
  };
  useEffect(() => {
    const expired = () => {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      void client.cancelQueries({ queryKey: ['lecturer'] });
      client.removeQueries({ queryKey: ['lecturer'] });
      client.removeQueries({ queryKey: ['auth'] });
    };
    window.addEventListener('nopbai:session-expired', expired);
    return () => window.removeEventListener('nopbai:session-expired', expired);
  }, [client]);
  async function login(email: string, password: string) {
    const { data } = await api.post<{
      accessToken: string;
      lecturer: Lecturer;
    }>('/auth/login', { email: email.trim().toLowerCase(), password });
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    client.setQueryData(['auth', 'me', data.accessToken], data.lecturer);
    setToken(data.accessToken);
  }
  return (
    <AuthContext.Provider
      value={{
        lecturer: token ? me.data : undefined,
        loading: !!token && me.isPending,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
