import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import chatbotAvatar from '../../assets/mascot_chathead.jpg';

const motionPreference = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (listener) => {
  const query = window.matchMedia(motionPreference);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
const prefersReducedMotion = () => window.matchMedia(motionPreference).matches;

export default function AnimatedAssistantButton({ open, onToggle }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => true);
  const [animation, setAnimation] = useState('peeking');
  const videoRef = useRef(null);
  const showVideo = !open && !reducedMotion && animation !== 'static';

  useEffect(() => {
    const video = videoRef.current;
    if (!showVideo || !video) return;
    let active = true;
    const play = async () => {
      try { await video.play(); }
      catch { if (active) setAnimation('static'); }
    };
    play();
    return () => { active = false; video.pause(); };
  }, [showVideo, animation]);

  const replayIdle = async () => {
    const video = videoRef.current;
    if (!showVideo || animation !== 'idle' || !video) return;
    try { video.currentTime = 0; await video.play(); }
    catch { if (videoRef.current === video) setAnimation('static'); }
  };

  return (
    <>
      <style>{`
        @keyframes materialAssistantBounce {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.18); }
          60% { transform: scale(.92); }
          80% { transform: scale(1.06); }
        }
        .material-assistant-launcher:focus-visible {
          outline: 3px solid #818cf8;
          outline-offset: 4px;
        }
      `}</style>
      <button type="button" className="material-assistant-launcher" onClick={onToggle}
        onMouseEnter={replayIdle} title="Course Assistant" aria-expanded={open}
        aria-label={open ? 'Close material assistant' : 'Open material assistant'}
        style={{ width: showVideo ? 140 : 58, height: showVideo ? 140 : 58,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          display: 'block', animation: open && !reducedMotion ? 'materialAssistantBounce .5s ease both' : 'none' }}>
        {showVideo ? (
          <video ref={videoRef}
            src={animation === 'peeking' ? '/videos/chatbot-peeking.mp4' : '/videos/chatbot-idle.mp4'}
            muted playsInline loop={animation === 'idle'} preload="metadata" aria-hidden="true"
            onEnded={() => setAnimation('idle')} onError={() => setAnimation('static')}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <span style={{ width: 58, height: 58, boxSizing: 'border-box', borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: '3px solid white',
            boxShadow: '0 4px 20px rgba(79,70,229,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {open ? <span aria-hidden="true" style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>×</span>
              : <img src={chatbotAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </span>
        )}
      </button>
    </>
  );
}
