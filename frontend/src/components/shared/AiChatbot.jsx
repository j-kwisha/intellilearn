import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

import chatbotAvatar from '../../assets/chatbot_avatar.png';
const AVATAR_URL = chatbotAvatar;

// Simple markdown renderer
function MarkdownText({ text }) {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, i) => {
        if (/^[-*]\s/.test(line)) return (
          <div key={i} style={{ display: 'flex', gap: 6 }}>
            <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>•</span>
            <span>{renderInline(line.replace(/^[-*]\s/, ''))}</span>
          </div>
        );
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)[1];
          return (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>{num}.</span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: 4 }} />;
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function Avatar({ size = 32, style = {} }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden', ...style,
    }}>
      {AVATAR_URL
        ? <img src={AVATAR_URL} alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.45, lineHeight: 1 }}>🤖</span>
      }
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 2px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#94a3b8',
          animation: 'chatDot 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

export default function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm your course assistant. Ask me anything about your courses, grades, or assessments." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const greetingTimer = useRef(null);
  const dismissTimer = useRef(null);

  // Show greeting bubble after 3s, auto-dismiss after 5s
  useEffect(() => {
    greetingTimer.current = setTimeout(() => {
      if (!greetingDismissed) setShowGreeting(true);
    }, 3000);
    return () => clearTimeout(greetingTimer.current);
  }, []);

  useEffect(() => {
    if (showGreeting) {
      dismissTimer.current = setTimeout(() => {
        setShowGreeting(false);
        setGreetingDismissed(true);
      }, 5000);
    }
    return () => clearTimeout(dismissTimer.current);
  }, [showGreeting]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleToggle = () => {
    // Bounce animation on open
    if (!open) {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 500);
      setShowGreeting(false);
      setGreetingDismissed(true);
    }
    setOpen(v => !v);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { from: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chatbot', { message: text });
      const cleaned = res.data.response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      setMessages(prev => [...prev, { from: 'bot', text: cleaned }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, the assistant is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <style>{`
        @keyframes chatPulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes chatBounce {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.18); }
          60%  { transform: scale(0.92); }
          80%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes chatGreeting {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
        .chat-window {
          animation: chatSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .chat-greeting {
          animation: chatGreeting 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .chat-avatar-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .chat-avatar-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(79,70,229,0.55) !important;
        }
        .chat-send-btn:hover:not(:disabled) {
          background: #4338ca !important;
        }
        .chat-input:focus {
          border-color: #4f46e5 !important;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.12);
        }
      `}</style>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>

        {/* Chat window */}
        {open && (
          <div className="chat-window" style={{
            width: 340, height: 460, background: '#fff',
            borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Avatar size={38} style={{ border: '2px solid rgba(255,255,255,0.4)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  IntelliLearn Assistant
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                  <p style={{ color: '#c7d2fe', fontSize: 11, margin: 0 }}>Online · Ask me anything</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>
                ✕
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                  {msg.from === 'bot' && <Avatar size={26} />}
                  <div style={{
                    maxWidth: '78%', padding: '9px 13px', borderRadius: msg.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 13, lineHeight: 1.6,
                    background: msg.from === 'user' ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f1f5f9',
                    color: msg.from === 'user' ? '#fff' : '#334155',
                    boxShadow: msg.from === 'user' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                  }}>
                    {msg.from === 'user' ? msg.text : <MarkdownText text={msg.text} />}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <Avatar size={26} />
                  <div style={{ background: '#f1f5f9', padding: '9px 13px', borderRadius: '16px 16px 16px 4px' }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, background: '#fafafa' }}>
              <input
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a question..."
                style={{
                  flex: 1, padding: '9px 13px', borderRadius: 10,
                  border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none',
                  fontFamily: "'DM Sans', sans-serif", background: 'white',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
              <button
                className="chat-send-btn"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  background: '#4f46e5', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '9px 16px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, opacity: loading || !input.trim() ? 0.45 : 1,
                  transition: 'background 0.2s, opacity 0.2s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Greeting bubble */}
        {showGreeting && !open && (
          <div className="chat-greeting" style={{
            background: 'white', borderRadius: 14, padding: '10px 16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0',
            fontSize: 13, color: '#334155', maxWidth: 220, lineHeight: 1.5,
            position: 'relative', fontFamily: "'DM Sans', sans-serif",
          }}>
            <button onClick={() => { setShowGreeting(false); setGreetingDismissed(true); }}
              style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1 }}>
              ✕
            </button>
            👋 <strong>Hi there!</strong> Need help? Ask me anything about your courses!
            {/* Tail */}
            <div style={{
              position: 'absolute', bottom: -8, right: 22,
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid white',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.06))',
            }} />
          </div>
        )}

        {/* Avatar toggle button */}
        <div style={{ position: 'relative' }}>
          {/* Pulse ring — only when closed */}
          {!open && (
            <>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(79,70,229,0.35)',
                animation: 'chatPulse 2s ease-out infinite',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(79,70,229,0.2)',
                animation: 'chatPulse 2s ease-out infinite',
                animationDelay: '0.6s',
                pointerEvents: 'none',
              }} />
            </>
          )}

          <button
            className="chat-avatar-btn"
            onClick={handleToggle}
            title="Course Assistant"
            style={{
              width: 58, height: 58, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: '3px solid white',
              cursor: 'pointer', padding: 0, overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(79,70,229,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: bouncing ? 'chatBounce 0.5s ease both' : 'none',
              position: 'relative', zIndex: 1,
            }}
          >
            {open
              ? <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>✕</span>
              : AVATAR_URL
                ? <img src={AVATAR_URL} alt="Assistant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 26 }}>🤖</span>
            }
          </button>
        </div>
      </div>
    </>
  );
}
