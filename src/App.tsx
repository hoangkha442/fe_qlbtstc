import { Component, lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Button, Result } from 'antd';
import LoadingScreen from './components/LoadingScreen';
import { brand } from './lib/brand';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import StudentLayout from './components/StudentLayout';
import LecturerLayout from './components/LecturerLayout';
import StudentGuard from './components/StudentGuard';

const HomePage = lazy(() => import('./pages/HomePage'));
const AssignmentPage = lazy(() => import('./pages/AssignmentPage'));
const LookupPage = lazy(() => import('./pages/LookupPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/lecturer/DashboardPage'));
const ResourcesPage = lazy(() => import('./pages/lecturer/ResourcesPage'));
const AssignmentsPage = lazy(() => import('./pages/lecturer/AssignmentsPage'));
const SubmissionsPage = lazy(() => import('./pages/lecturer/SubmissionsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const StudentLoginPage = lazy(() => import('./pages/student/StudentLoginPage'));
const ChangePasswordPage = lazy(
  () => import('./pages/student/ChangePasswordPage'),
);
const LearningPathsPage = lazy(
  () => import('./pages/student/LearningPathsPage'),
);
const LearningPathPage = lazy(() => import('./pages/student/LearningPathPage'));
const StudentsPage = lazy(() => import('./pages/lecturer/StudentsPage'));
const LecturerLearningPathsPage = lazy(
  () => import('./pages/lecturer/LearningPathsPage'),
);
const LearningPathEditorPage = lazy(
  () => import('./pages/lecturer/LearningPathEditorPage'),
);
const SpecializedAssignmentsPage = lazy(
  () => import('./pages/lecturer/SpecializedAssignmentsPage'),
);
const SpecializedSubmissionsPage = lazy(
  () => import('./pages/lecturer/SpecializedSubmissionsPage'),
);
const SourceAssignmentPage = lazy(
  () => import('./pages/student/SourceAssignmentPage'),
);

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Result
        status="error"
        title="Trang chưa thể hiển thị"
        subTitle="Vui lòng tải lại trang để tiếp tục."
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>
        }
      />
    ) : (
      this.props.children
    );
  }
}
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = pathname.startsWith('/lecturer')
      ? `Giảng viên · ${brand.name}`
      : pathname.startsWith('/specialized')
        ? `Chuyên ngành · ${brand.name}`
        : pathname === '/lookup'
          ? `Tra cứu bài nộp · ${brand.name}`
          : pathname === '/login'
            ? `Đăng nhập giảng viên · ${brand.name}`
            : `Đại cương · ${brand.name}`;
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <ErrorBoundary>
      <RouteEffects />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<StudentLayout />}>
            <Route index element={<HomePage />} />
            <Route path="assignments/:id" element={<AssignmentPage />} />
            <Route path="lookup" element={<LookupPage />} />
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
            <Route path="specialized">
              <Route path="change-password" element={<ChangePasswordPage />} />
              <Route element={<StudentGuard />}>
                <Route index element={<LearningPathsPage />} />
                <Route
                  path="assignments/:id"
                  element={<SourceAssignmentPage />}
                />
                <Route path="paths/:pathId" element={<LearningPathPage />} />
                <Route
                  path="paths/:pathId/lessons/:lessonId"
                  element={<LearningPathPage />}
                />
              </Route>
              <Route
                path="*"
                element={
                  <NotFoundPage
                    homeTo="/specialized"
                    homeLabel="Về lộ trình học"
                  />
                }
              />
            </Route>
          </Route>
          <Route path="login" element={<LoginPage />} />
          <Route path="specialized/login" element={<StudentLoginPage />} />
          <Route path="lecturer" element={<LecturerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route
              path="learning-paths"
              element={<LecturerLearningPathsPage />}
            />
            <Route
              path="learning-paths/:id"
              element={<LearningPathEditorPage />}
            />
            <Route
              path="specialized-assignments"
              element={<SpecializedAssignmentsPage />}
            />
            <Route
              path="specialized-submissions"
              element={<SpecializedSubmissionsPage />}
            />
            <Route
              path="not-found"
              element={
                <NotFoundPage
                  homeTo="/lecturer/dashboard"
                  homeLabel="Về không gian làm việc"
                />
              }
            />
            <Route path=":resource" element={<ResourcesPage />} />
            <Route
              path="*"
              element={
                <NotFoundPage
                  homeTo="/lecturer/dashboard"
                  homeLabel="Về không gian làm việc"
                />
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
