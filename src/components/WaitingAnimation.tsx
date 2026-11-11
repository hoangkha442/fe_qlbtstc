import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';

export default function WaitingAnimation() {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let animation: AnimationItem | undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      if (motion.matches) animation?.goToAndStop(15, true);
      else animation?.play();
    };
    void import('lottie-web/build/player/lottie_light')
      .then(({ default: lottie }) => {
        if (disposed || !container.current) return;
        animation = lottie.loadAnimation({
          container: container.current,
          renderer: 'svg',
          loop: true,
          autoplay: !motion.matches,
          path: '/animations/waiting.json',
          rendererSettings: { progressiveLoad: false, focusable: false },
        });
        animation.addEventListener('DOMLoaded', () => {
          if (!disposed) {
            setReady(true);
            updateMotion();
          }
        });
        animation.addEventListener('data_failed', () => {
          if (!disposed) setReady(false);
        });
      })
      .catch(() => {
        if (!disposed) setReady(false);
      });
    motion.addEventListener('change', updateMotion);
    return () => {
      disposed = true;
      motion.removeEventListener('change', updateMotion);
      animation?.destroy();
    };
  }, []);
  return (
    <div className="waiting-animation" aria-hidden="true">
      <div ref={container} />
      {!ready && <span className="waiting-fallback">···</span>}
    </div>
  );
}
