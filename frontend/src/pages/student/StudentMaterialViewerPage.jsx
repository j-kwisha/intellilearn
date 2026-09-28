import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import chatbotAvatar from '../../assets/chatbot_avatar.png';

// Simple markdown renderer — handles bold, italic, bullets, numbered lists
function MarkdownText({ text }) {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, i) => {
        // Bullet point
        if (/^[-*]\s/.test(line)) {
          return (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>•</span>
              <span>{renderInline(line.replace(/^[-*]\s/, ''))}</span>
            </div>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)[1];
          return (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>{num}.</span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
            </div>
          );
        }
        // Empty line = spacing
        if (line.trim() === '') return <div key={i} style={{ height: 4 }} />;
        // Normal line
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

function renderInline(text) {
  // Handle **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function StudentMaterialViewerPage() {
  const { courseId, lessonId, materialId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [material, setMaterial] = useState(state?.material || null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I can answer questions about this material. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lessonContext, setLessonContext] = useState(null);
  const bottomRef = useRef(null);

  // Fetch material from API if state was lost (page reload)
  useEffect(() => {
    if (!material && materialId) {
      api.get(`/courses/${courseId}/lessons/${lessonId}`)
        .then(res => {
          const found = res.data.lesson?.materials?.find(m => String(m.id) === String(materialId));
          if (found) setMaterial(found);
        })
        .catch(console.error);
    }
  }, [materialId]);

  // Fetch extracted text for AI — use materialId directly so it works even before material loads
  useEffect(() => {
    const id = materialId || material?.id;
    if (!id) return;
    api.get(`/ai/materials/${id}/context`)
      .then(res => {
        if (res.data.has_text) {
          setLessonContext(res.data.extracted_text);
          setMessages([{ from: 'bot', text: 'Hi! I have read this lesson material. Ask me anything about it!' }]);
        }
      })
      .catch(() => {});
  }, [materialId]);

  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { from: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chatbot', {
        message: text,
        lesson_context: lessonContext,
        material_title: material?.title,
      });
      // Strip <think>...</think> tags from response
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

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Loading material...</p>
      </div>
    );
  }

  const fileUrl = material.file_url || material.url;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/student/courses/${courseId}/lessons/${lessonId}`)}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            Back to lesson
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-medium text-slate-800">{material.title}</span>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">{material.type}</span>
        </div>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={material.type !== 'link'}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
          {material.type === 'link' ? 'Open in new tab' : 'Download'}
        </a>
      </div>

      <div className="flex-1">
        {material.type === 'pdf' && fileUrl ? (
          <iframe
            src={fileUrl}
            title={material.title}
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 112px)', border: 'none' }}
          />
        ) : material.type === 'docx' && fileUrl ? (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            title={material.title}
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 112px)', border: 'none' }}
          />
        ) : material.type === 'ppt' && fileUrl ? (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            title={material.title}
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 112px)', border: 'none' }}
          />
        ) : material.type === 'link' && fileUrl ? (
          <iframe src={fileUrl} title={material.title} className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 112px)', border: 'none' }} />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-50"
            style={{ minHeight: 'calc(100vh - 112px)' }}>
            <p className="text-slate-500">Cannot preview this file type.</p>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <style>{`
          @keyframes mcPulse {
            0%   { transform: scale(1);    opacity: 0.6; }
            70%  { transform: scale(1.55); opacity: 0; }
            100% { transform: scale(1.55); opacity: 0; }
          }
          @keyframes mcBounce {
            0%   { transform: scale(1); }
            30%  { transform: scale(1.18); }
            60%  { transform: scale(0.92); }
            80%  { transform: scale(1.06); }
            100% { transform: scale(1); }
          }
          @keyframes mcSlideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes mcDot {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
            40%            { transform: scale(1);   opacity: 1; }
          }
          .mc-window { animation: mcSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
          .mc-avatar-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
          .mc-avatar-btn:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(79,70,229,0.55) !important; }
          .mc-input:focus { border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.12); }
        `}</style>

        {/* Chat window */}
        {chatOpen && (
          <div className="mc-window" style={{ width: 340, height: 460, background: '#fff', borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a78bfa)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                <img src={chatbotAvatar} alt="Assistant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {lessonContext ? `📄 ${material?.title || 'Material Assistant'}` : 'IntelliLearn Assistant'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                  <p style={{ color: '#c7d2fe', fontSize: 11, margin: 0 }}>
                    {lessonContext ? 'Reading this material' : 'Ask about your courses'}
                  </p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                  {msg.from === 'bot' && (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      <img src={chatbotAvatar} alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ maxWidth: '78%', padding: '9px 13px', borderRadius: msg.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: 13, lineHeight: 1.6, background: msg.from === 'user' ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f1f5f9', color: msg.from === 'user' ? '#fff' : '#334155', boxShadow: msg.from === 'user' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none' }}>
                    {msg.from === 'user' ? msg.text : <MarkdownText text={msg.text} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    <img src={chatbotAvatar} alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '9px 13px', borderRadius: '16px 16px 16px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', animation: 'mcDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, background: '#fafafa' }}>
              <input className="mc-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask about this material..."
                style={{ flex: 1, padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif", background: 'white', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: loading || !input.trim() ? 0.45 : 1, transition: 'opacity 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Send
              </button>
            </div>
          </div>
        )}

        {/* Avatar toggle button */}
        <div style={{ position: 'relative' }}>
          {!chatOpen && (
            <>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(79,70,229,0.35)', animation: 'mcPulse 2s ease-out infinite', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(79,70,229,0.2)', animation: 'mcPulse 2s ease-out infinite', animationDelay: '0.6s', pointerEvents: 'none' }} />
            </>
          )}
          <button className="mc-avatar-btn" onClick={() => setChatOpen(v => !v)} title="Course Assistant"
            style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: '3px solid white', cursor: 'pointer', padding: 0, boxShadow: '0 4px 20px rgba(79,70,229,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            {chatOpen
              ? <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>✕</span>
              : <img src={chatbotAvatar} alt="Assistant" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
