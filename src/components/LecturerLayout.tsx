import { useState } from 'react';
import { App, Avatar, Button, Drawer, Dropdown, Grid, Menu, Spin } from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  CalendarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuOutlined,
  ReadOutlined,
  TeamOutlined,
  DownOutlined,
  CodeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from './common';
import { useAuth } from '../lib/auth-context';
import { brand } from '../lib/brand';

const navigation = [
  {
    key: '/lecturer/dashboard',
    icon: <AppstoreOutlined />,
    label: 'Tổng quan',
  },
  {
    type: 'group' as const,
    label: 'ĐẠI CƯƠNG · DANH MỤC',
    children: [
      {
        key: '/lecturer/semesters',
        icon: <CalendarOutlined />,
        label: 'Học kỳ',
      },
      { key: '/lecturer/subjects', icon: <BookOutlined />, label: 'Môn học' },
      { key: '/lecturer/classes', icon: <TeamOutlined />, label: 'Lớp' },
      {
        key: '/lecturer/course-sections',
        icon: <ReadOutlined />,
        label: 'Lớp học phần',
      },
    ],
  },
  {
    type: 'group' as const,
    label: 'ĐẠI CƯƠNG · BÀI NỘP',
    children: [
      {
        key: '/lecturer/assignments',
        icon: <FileTextOutlined />,
        label: 'Bài tập',
      },
      {
        key: '/lecturer/submissions',
        icon: <FileDoneOutlined />,
        label: 'Bài đã nộp',
      },
    ],
  },
  {
    type: 'group' as const,
    label: 'CHUYÊN NGÀNH',
    children: [
      {
        key: '/lecturer/learning-paths',
        icon: <CodeOutlined />,
        label: 'Lộ trình & bài học',
      },
      {
        key: '/lecturer/students',
        icon: <UserOutlined />,
        label: 'Tài khoản sinh viên',
      },
      {
        key: '/lecturer/specialized-assignments',
        icon: <FileTextOutlined />,
        label: 'Bài tập mã nguồn',
      },
      {
        key: '/lecturer/specialized-submissions',
        icon: <FileDoneOutlined />,
        label: 'Bài nộp mã nguồn',
      },
    ],
  },
];
const titles: Record<string, string> = {
  dashboard: 'Tổng quan',
  semesters: 'Học kỳ',
  subjects: 'Môn học',
  classes: 'Lớp',
  'course-sections': 'Lớp học phần',
  assignments: 'Bài tập',
  submissions: 'Bài đã nộp',
  students: 'Tài khoản sinh viên',
  'learning-paths': 'Lộ trình & bài học',
  'specialized-assignments': 'Bài tập mã nguồn',
  'specialized-submissions': 'Bài nộp mã nguồn',
};
export default function LecturerLayout() {
  const auth = useAuth();
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('nephoc.sidebar.collapsed') === 'true',
  );
  const screens = Grid.useBreakpoint();
  if (auth.loading)
    return (
      <div className="full-loading">
        <Spin size="large" />
        <span>Đang kiểm tra phiên đăng nhập…</span>
      </div>
    );
  if (!auth.lecturer)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  const selected = `/lecturer/${location.pathname.split('/')[2]}`;
  const title = titles[location.pathname.split('/')[2]] ?? 'Quản lý';
  const name = auth.lecturer.fullName;
  const initial = name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase();
  const sidebar = (compact = false) => (
    <>
      <div className="sidebar-brand">
        <Brand compact={compact} to="/lecturer/dashboard" />
      </div>
      {!compact && (
        <div className="workspace-label">
          <span className="live-dot" /> KHÔNG GIAN GIẢNG VIÊN
        </div>
      )}
      <Menu
        mode="inline"
        theme="dark"
        inlineCollapsed={compact}
        selectedKeys={[selected]}
        items={
          compact
            ? navigation.flatMap((item) => item.children ?? [item])
            : navigation
        }
        onClick={({ key }) => {
          navigate(key);
          setMobile(false);
        }}
      />
    </>
  );
  return (
    <div className={`lecturer-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <aside id="lecturer-navigation" className="lecturer-sidebar">
        {sidebar(collapsed)}
      </aside>
      <div className="lecturer-body">
        <header className="lecturer-header">
          <div className="flex items-center gap-3">
            <Button
              aria-label={
                screens.lg
                  ? collapsed
                    ? 'Mở rộng sidebar'
                    : 'Thu gọn sidebar'
                  : 'Mở menu quản lý'
              }
              aria-expanded={screens.lg ? !collapsed : mobile}
              aria-controls={screens.lg ? 'lecturer-navigation' : undefined}
              icon={<MenuOutlined />}
              onClick={() => {
                if (screens.lg) {
                  setCollapsed((value) => {
                    localStorage.setItem(
                      'nephoc.sidebar.collapsed',
                      String(!value),
                    );
                    return !value;
                  });
                } else setMobile(true);
              }}
            />
            <span className="header-breadcrumb">
              Không gian làm việc <span>/</span> <strong>{title}</strong>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    label: 'Đăng xuất',
                    icon: <LogoutOutlined />,
                  },
                ],
                onClick: () => {
                  auth.logout();
                  void message.success('Đã đăng xuất.');
                  navigate('/login', { replace: true });
                },
              }}
            >
              <button className="profile-button">
                <Avatar
                  style={{ backgroundColor: '#edf2fd', color: '#203e7e' }}
                >
                  {initial}
                </Avatar>
                <span className="hidden sm:block">{name}</span>
                <DownOutlined className="text-xs text-muted" />
              </button>
            </Dropdown>
          </div>
        </header>
        <main id="main-content" className="lecturer-main">
          <Outlet />
        </main>
        <footer className="lecturer-footer">
          {brand.name} · Không gian giảng viên
        </footer>
      </div>
      <Drawer
        className="lecturer-navigation-drawer"
        title="Không gian giảng viên"
        placement="left"
        open={mobile}
        onClose={() => setMobile(false)}
        styles={{ body: { padding: 0 } }}
      >
        {sidebar()}
      </Drawer>
    </div>
  );
}
