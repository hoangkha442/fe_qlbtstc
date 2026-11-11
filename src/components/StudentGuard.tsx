import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useStudentAuth } from '../lib/student-context';
import { QueryState } from './common';

export default function StudentGuard() {
  const auth = useStudentAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <div className="route-loading">
        <Spin />
        <span>Đang kiểm tra tài khoản…</span>
      </div>
    );
  if (auth.error)
    return (
      <QueryState pending={false} error={auth.error} retry={auth.retry}>
        {null}
      </QueryState>
    );
  if (!auth.student)
    return (
      <Navigate
        to="/specialized/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (auth.student.mustChangePassword)
    return (
      <Navigate
        to="/specialized/change-password"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  return <Outlet />;
}
