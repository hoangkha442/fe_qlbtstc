import { App, Avatar, Button, Drawer, Collapse, Dropdown } from 'antd';
import {
  QuestionCircleOutlined,
  MenuOutlined,
  UserOutlined,
  LockOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Brand } from './common';
import { useStudentAuth } from '../lib/student-context';
import { errorMessage } from '../lib/api';
import { brand } from '../lib/brand';

const CURRENT_YEAR = new Date().getFullYear();
export default function StudentLayout() {
  const auth = useStudentAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const links = (
    <>
      <NavLink to="/" end onClick={() => setMenu(false)}>
        Nộp bài Đại cương
      </NavLink>
      <NavLink to="/specialized" onClick={() => setMenu(false)}>
        Chuyên ngành
      </NavLink>
      <NavLink to="/lookup" onClick={() => setMenu(false)}>
        Tra cứu bài nộp
      </NavLink>
    </>
  );
  return (
    <div className="student-shell">
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <header className="student-header">
        <div className="site-container header-inner">
          <Brand />
          <nav
            className="student-nav hidden lg:flex"
            aria-label="Điều hướng chính"
          >
            {links}
          </nav>
          <div className="flex items-center gap-3">
            {auth.student && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'password',
                      label: 'Đổi mật khẩu',
                      icon: <LockOutlined />,
                    },
                    {
                      key: 'logout',
                      label: 'Đăng xuất',
                      icon: <LogoutOutlined />,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'password')
                      navigate('/specialized/change-password');
                    else {
                      setLoggingOut(true);
                      void auth
                        .logout()
                        .then(() => message.success('Đã đăng xuất.'))
                        .catch((err: unknown) =>
                          message.error(errorMessage(err)),
                        )
                        .finally(() => {
                          setLoggingOut(false);
                          navigate('/specialized/login');
                        });
                    }
                  },
                }}
              >
                <Button
                  type="text"
                  aria-label="Tài khoản sinh viên"
                  loading={loggingOut}
                  icon={<Avatar size={28} icon={<UserOutlined />} />}
                >
                  <span className="hidden xl:inline">
                    {auth.student.fullName}
                  </span>
                </Button>
              </Dropdown>
            )}
            <Button
              type="text"
              className="hidden sm:inline-flex"
              icon={<QuestionCircleOutlined />}
              onClick={() => setHelp(true)}
            >
              Hướng dẫn
            </Button>
            <Button
              className="lg:hidden"
              aria-label="Mở menu"
              icon={<MenuOutlined />}
              onClick={() => setMenu(true)}
            />
          </div>
        </div>
      </header>
      <main id="main-content" className="site-container student-main">
        <Outlet />
      </main>
      <footer className="student-footer">
        <div className="site-container flex flex-wrap items-center justify-between gap-4">
          <span>
            © {CURRENT_YEAR} {brand.name}
          </span>
          <div className="flex flex-wrap gap-6">
            <button onClick={() => setHelp(true)}>Cần hỗ trợ?</button>
          </div>
        </div>
      </footer>
      <Drawer
        title="Điều hướng"
        open={menu}
        onClose={() => setMenu(false)}
        size="default"
      >
        <nav className="mobile-nav">
          {links}
          <button
            onClick={() => {
              setMenu(false);
              setHelp(true);
            }}
          >
            Hướng dẫn nộp bài
          </button>
        </nav>
      </Drawer>
      <Drawer
        title="Hướng dẫn nộp bài"
        open={help}
        onClose={() => setHelp(false)}
        size="default"
      >
        <p className="mb-6 text-muted">
          Nộp bài Đại cương bằng email, không cần tài khoản.
        </p>
        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: '1. Chọn đúng nơi nộp',
              children:
                'Chọn học kỳ, lớp và lớp học phần. Kiểm tra tên môn, mã học phần và tên bài tập. Nếu có liên kết từ giảng viên, bạn có thể mở trực tiếp.',
            },
            {
              key: '2',
              label: '2. Chuẩn bị file',
              children:
                'Hệ thống hỗ trợ Word, Excel, PowerPoint và ảnh JPG/JPEG, PNG, WebP, GIF, AVIF, TIFF. Kiểm tra các định dạng, số lượng và dung lượng được giảng viên cho phép.',
            },
            {
              key: '3',
              label: '3. Nộp và lưu biên nhận',
              children:
                'Nhập mã sinh viên, họ tên, email và chọn file rồi xác nhận. Mã xem lại bài được gửi qua email. Bạn cũng có thể tải biên nhận và giữ kín mã bí mật để tra cứu hoặc nộp lại.',
            },
            {
              key: '4',
              label: 'Muốn nộp lại bài?',
              children:
                'Giảng viên cần bật quyền nộp lại. Dùng cùng mã sinh viên và mã bí mật từ lần nộp đầu tiên. Lịch sử phiên bản sẽ được giữ nguyên.',
            },
            {
              key: '5',
              label: 'Mất mã bí mật hoặc không thể nộp?',
              children:
                'Kiểm tra email xác nhận, kể cả thư rác, hoặc biên nhận đã tải. Nếu vẫn không còn mã bí mật, hãy liên hệ giảng viên phụ trách.',
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
