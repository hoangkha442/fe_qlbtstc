import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';
export default function NotFoundPage({
  homeTo = '/',
  homeLabel = 'Về trang chủ',
}: {
  homeTo?: string;
  homeLabel?: string;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Result
        status="404"
        title="Không tìm thấy trang"
        subTitle="Đường dẫn có thể không chính xác hoặc trang không còn tồn tại."
        extra={
          <Link to={homeTo}>
            <Button type="primary">{homeLabel}</Button>
          </Link>
        }
      />
    </div>
  );
}
