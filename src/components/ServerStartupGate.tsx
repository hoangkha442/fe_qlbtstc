import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../lib/api';
import LoadingScreen from './LoadingScreen';

export default function ServerStartupGate({
  children,
}: {
  children: ReactNode;
}) {
  const startedAt = useRef(0);
  const health = useQuery({
    queryKey: ['server', 'ready'],
    queryFn: async ({ signal }) => {
      if (!startedAt.current) startedAt.current = Date.now();
      const { data } = await api.get<{ status?: string; database?: string }>(
        '/health',
        { signal, timeout: 15000 },
      );
      if (data.status !== 'ok' || data.database !== 'connected')
        throw new Error('Server chưa sẵn sàng.');
      return true;
    },
    retry: (_count, error) => {
      if (
        Date.now() - startedAt.current >= 180000 ||
        !axios.isAxiosError(error)
      )
        return false;
      const status = error.response?.status;
      return !status || status >= 500 || status === 408 || status === 429;
    },
    retryDelay: 4000,
    staleTime: Infinity,
    gcTime: Infinity,
    networkMode: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
  if (health.isSuccess) return <>{children}</>;
  const failed = health.isError && !health.isFetching;
  return (
    <LoadingScreen
      failed={failed}
      onRetry={() => {
        startedAt.current = Date.now();
        void health.refetch();
      }}
    />
  );
}
