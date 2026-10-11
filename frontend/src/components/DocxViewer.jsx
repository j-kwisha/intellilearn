import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

export default function DocxViewer({ courseId, lessonId, materialId }) {
  const hostRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const host = hostRef.current;
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const styles = document.createElement('div');
    const content = document.createElement('div');
    const layout = document.createElement('style');
    layout.textContent = ':host { display: block; overflow: auto; } .intellilearn-docx-wrapper { padding: 16px; } section.intellilearn-docx { max-width: 100%; box-sizing: border-box; }';
    shadow.replaceChildren(layout, styles, content);

    Promise.all([
      api.get(`/courses/${courseId}/lessons/${lessonId}/materials/${materialId}/download`, { responseType: 'blob', signal: controller.signal }),
      import('docx-preview'),
    ]).then(async ([response, { renderAsync }]) => {
      if (!active) return;
      if (response.data.size > 50 * 1024 * 1024) throw new Error('Document too large to preview');
      await renderAsync(await response.data.arrayBuffer(), content, styles, {
        className: 'intellilearn-docx', ignoreWidth: true, ignoreHeight: true,
        useBase64URL: true, renderAltChunks: false,
      });
      for (const link of content.querySelectorAll('a')) {
        if (!/^(https?:|mailto:)/i.test(link.getAttribute('href') || '')) link.removeAttribute('href');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('target', '_blank');
      }
    }).catch(() => {
      if (active) setError('This Word document could not be previewed. Use Download to open it in Word, or ask your instructor for a PDF copy.');
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; controller.abort(); shadow.replaceChildren(); };
  }, [courseId, lessonId, materialId]);

  return (
    <div className="bg-slate-100 min-h-64">
      {loading && <p role="status" className="p-6 text-slate-600">Opening Word document...</p>}
      {error && <p role="alert" className="p-6 text-red-700">{error}</p>}
      <div ref={hostRef} hidden={loading || Boolean(error)} />
    </div>
  );
}
