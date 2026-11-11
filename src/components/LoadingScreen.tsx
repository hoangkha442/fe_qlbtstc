import { Button } from 'antd';
import WaitingAnimation from './WaitingAnimation';

export default function LoadingScreen({
  failed = false,
  onRetry,
}: {
  failed?: boolean;
  onRetry?: () => void;
}) {
  return (
    <main className="startup-page" aria-busy={!failed}>
      <div className="startup-content">
        {!failed && <WaitingAnimation />}
        <p role="status" aria-live="polite">
          {failed ? 'Chưa thể kết nối.' : 'Chờ một chút...'}
        </p>
        {failed && onRetry && <Button onClick={onRetry}>Thử lại</Button>}
      </div>
    </main>
  );
}
