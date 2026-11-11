import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { StyleProvider } from '@ant-design/cssinjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { StudentAuthProvider } from './lib/student-auth';
import ServerStartupGate from './components/ServerStartupGate';
import { appTheme } from './theme';
import './index.css';
import './learning.css';
import './workspace.css';
import App from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider
        locale={viVN}
        theme={appTheme}
        form={{
          validateMessages: {
            required: 'Vui lòng nhập ${label}.',
            types: {
              email: 'Email không hợp lệ.',
              number: '${label} phải là số.',
            },
          },
        }}
      >
        <AntApp
          message={{ maxCount: 3 }}
          notification={{ placement: 'bottomRight', maxCount: 3 }}
        >
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <ServerStartupGate>
                <AuthProvider>
                  <StudentAuthProvider>
                    <App />
                  </StudentAuthProvider>
                </AuthProvider>
              </ServerStartupGate>
            </BrowserRouter>
          </QueryClientProvider>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
);
