import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from 'antd';
import { ExportOutlined, PlayCircleOutlined } from '@ant-design/icons';

import { safeHttps } from '../lib/learning';
export function LearningText({ children }: { children: string }) {
  return (
    <div className="learning-prose">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
                <ExportOutlined className="ml-1 text-xs" />
              </a>
            ) : (
              <span>{children}</span>
            ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
export function LessonVideo({ url, title }: { url: string; title: string }) {
  const safe = safeHttps(url);
  if (!safe) return null;
  const parsed = new URL(safe);
  const host = parsed.hostname.toLowerCase();
  let embed: string | undefined;
  if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be',
      'www.youtube-nocookie.com',
    ].includes(host)
  ) {
    const id =
      host === 'youtu.be'
        ? parsed.pathname.slice(1).split('/')[0]
        : (parsed.searchParams.get('v') ??
          parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1]);
    if (id && /^[\w-]{6,64}$/.test(id))
      embed = `https://www.youtube-nocookie.com/embed/${id}`;
  } else if (
    ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)
  ) {
    const id = parsed.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
    if (id) embed = `https://player.vimeo.com/video/${id}`;
  }
  if (embed)
    return (
      <iframe
        className="lesson-video"
        src={embed}
        title={title}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname))
    return (
      <video
        className="lesson-video"
        controls
        preload="metadata"
        src={safe}
        aria-label={title}
      >
        Trình duyệt của bạn không hỗ trợ phát video.
      </video>
    );
  return (
    <div className="video-link-panel">
      <PlayCircleOutlined />
      <h3>Video bài học</h3>
      <p>Video được cung cấp trên nền tảng của giảng viên.</p>
      <Button
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        icon={<ExportOutlined />}
      >
        Mở video
      </Button>
    </div>
  );
}
