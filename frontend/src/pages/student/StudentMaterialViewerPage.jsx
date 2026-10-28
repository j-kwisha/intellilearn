import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { downloadMaterial } from '../../services/materialDownload';
import { materialFormat, materialPreviewUrl } from '../../services/materialPreview';
import { materialChatHistory, materialChatSources } from '../../services/materialChat';
import DocxViewer from '../../components/DocxViewer';
import AnimatedAssistantButton from '../../components/shared/AnimatedAssistantButton';
import chatbotAvatar from '../../assets/mascot_chathead.jpg';

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
  const { state } = useLocation();
  return <MaterialViewer key={`${courseId}/${lessonId}/${materialId}`}
    courseId={courseId} lessonId={lessonId} materialId={materialId} initialMaterial={state?.material} />;
}

function MaterialViewer({ courseId, lessonId, materialId, initialMaterial }) {
  const navigate = useNavigate();
  const [material, setMaterial] = useState(() => String(initialMaterial?.id) === String(materialId) ? initialMaterial : null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I can answer questions about this material. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [contextStatus, setContextStatus] = useState('loading');
  const [loadedContextId, setLoadedContextId] = useState(null);
  const [fileAvailable, setFileAvailable] = useState(null);
  const bottomRef = useRef(null);
  const chatRequestRef = useRef(null);
  const contextMaterialId = materialId || material?.id;
  const contextReady = loadedContextId === String(contextMaterialId);
  const fileMissing = contextReady && fileAvailable === false;

  // Fetch material from API if state was lost (page reload)
  useEffect(() => {
    let active = true;
    if (materialId && String(material?.id) !== String(materialId)) {
      api.get(`/courses/${courseId}/lessons/${lessonId}`)
        .then(res => {
          const found = res.data.lesson?.materials?.find(m => String(m.id) === String(materialId));
          if (active && found) setMaterial(found);
        })
        .catch(console.error);
    }
    return () => { active = false; };
  }, [materialId, courseId, lessonId, material]);

  // Only check readiness here. The server resolves the authorized document for
  // every chat request; the browser never sends document text as AI evidence.
  useEffect(() => {
    const id = contextMaterialId;
    if (!id) return;
    let active = true;
    const controller = new AbortController();
    api.get(`/ai/materials/${id}/context`, { signal: controller.signal })
      .then(res => {
        if (!active) return;
        setLoadedContextId(String(id));
        setFileAvailable(res.data.file_available ?? null);
        setHasContext(res.data.has_text === true);
        setContextStatus(res.data.has_text ? 'ready' : res.data.context_status || 'unavailable');
        if (res.data.has_text) {
          setMessages([{ from: 'bot', text: 'Hi! I can search the readable text in this material. What would you like to know?' }]);
        } else {
          setMessages([{ from: 'bot', text: res.data.file_available === false
            ? 'The original uploaded file is unavailable. Ask your instructor to re-upload it before using the material assistant.'
            : res.data.context_status === 'unsupported'
            ? 'I cannot read this file format. Ask your instructor to upload a text-based PDF, DOCX or PPTX. Legacy DOC/PPT files need conversion to DOCX/PPTX.'
            : 'I could not read this material. It may be unavailable or contain only images. Ask your instructor for a text-based PDF, DOCX or PPTX.' }]);
        }
      })
      .catch(() => {
        if (!active) return;
        setLoadedContextId(String(id));
        setFileAvailable(null);
        setHasContext(false);
        setContextStatus('unavailable');
        setMessages([{ from: 'bot', text: 'I could not load the material content. Please reopen the material or contact your instructor.' }]);
      });
    return () => { active = false; controller.abort(); };
  }, [contextMaterialId]);

  // Route changes remount this viewer. Cancel the outgoing chat and invalidate
  // its callbacks so they cannot append to a different material's conversation.
  useEffect(() => () => {
    chatRequestRef.current?.controller.abort();
    chatRequestRef.current = null;
  }, []);

  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || text.length > 500 || chatRequestRef.current || !contextReady || contextStatus !== 'ready' || !hasContext) return;
    const request = { controller: new AbortController(), materialId: String(contextMaterialId) };
    chatRequestRef.current = request;
    setMessages(prev => [...prev, { from: 'user', text, includeInHistory: true }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chatbot', {
        message: text,
        material_id: Number(contextMaterialId),
        history: materialChatHistory(messages),
      }, { signal: request.controller.signal });
      if (chatRequestRef.current !== request || request.controller.signal.aborted) return;
      // Strip <think>...</think> tags from response
      if (typeof res.data.response !== 'string' || !res.data.response.trim()) throw new Error('Invalid assistant response');
      const cleaned = res.data.response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (!cleaned) throw new Error('Empty assistant response');
      setMessages(prev => [...prev, {
        from: 'bot', text: cleaned, includeInHistory: res.data.in_scope !== false,
        sources: materialChatSources(res.data.sources),
      }]);
    } catch (error) {
      if (chatRequestRef.current !== request || request.controller.signal.aborted) return;
      const response = error.response?.data?.response;
      setMessages(prev => [...prev, { from: 'bot', text: typeof response === 'string'
        ? response : 'Sorry, the assistant is unavailable right now. Please try again.' }]);
      setInput(current => current || text);
    } finally {
      if (chatRequestRef.current === request) {
        chatRequestRef.current = null;
        setLoading(false);
      }
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
  const previewUrl = materialPreviewUrl(material);
  const format = materialFormat(material);

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
        {material.type === 'link' ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg">Open in new tab</a>
        ) : (
          <button type="button" onClick={() => downloadMaterial(courseId, lessonId, material).catch(() => alert('Could not download the material.'))}
            disabled={fileMissing} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Download</button>
        )}
      </div>

      <div className="flex-1">
        {fileMissing ? (
          <div role="alert" className="bg-white border border-slate-200 rounded-xl m-6 p-6 text-slate-700">
            <h2 className="font-semibold text-lg mb-2">File unavailable</h2>
            <p>The original uploaded file could not be found. Ask your instructor to re-upload this material.</p>
          </div>
        ) : format === 'docx' ? (
          <DocxViewer key={`${courseId}/${lessonId}/${materialId}`} courseId={courseId} lessonId={lessonId} materialId={materialId} />
        ) : ['pdf', 'doc', 'ppt', 'pptx'].includes(format) && previewUrl ? (
          <iframe
            src={previewUrl}
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
          @keyframes mcSlideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes mcDot {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
            40%            { transform: scale(1);   opacity: 1; }
          }
          .mc-window { animation: mcSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
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
                  {hasContext ? `📄 ${material?.title || 'Material Assistant'}` : 'IntelliLearn Assistant'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                  <p style={{ color: '#c7d2fe', fontSize: 11, margin: 0 }}>
                  {!contextReady || contextStatus === 'loading' ? 'Reading material...' : hasContext ? 'Searching this material' : 'Material content unavailable'}
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
                    {msg.from === 'bot' && msg.sources?.length > 0 && (
                      <p style={{ margin: '8px 0 0', paddingTop: 6, borderTop: '1px solid #cbd5e1', fontSize: 11, color: '#475569' }}>
                        Source excerpts: {msg.sources.join(' · ')}
                      </p>
                    )}
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
                placeholder="Ask about this material..." aria-label="Question about this material" maxLength={500}
                style={{ flex: 1, padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif", background: 'white', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
              <button onClick={sendMessage} disabled={loading || !input.trim() || !contextReady || contextStatus !== 'ready'}
                style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: loading || !input.trim() || !contextReady || contextStatus !== 'ready' ? 0.45 : 1, transition: 'opacity 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Send
              </button>
            </div>
          </div>
        )}

        <AnimatedAssistantButton open={chatOpen} onToggle={() => setChatOpen(value => !value)} />
      </div>
    </div>
  );
}
