import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { assessmentFileFormat, downloadAssessmentFile } from '../services/assessmentFiles';

export default function AssessmentFileViewer({ courseId, assessment }) {
  const hostRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const format = assessmentFileFormat(assessment);

  useEffect(() => {
    if (!assessment?.file_path) return undefined;
    let active = true;
    let objectUrl = '';
    const previewHost = hostRef.current;
    const controller = new AbortController();
    setError('');
    setLoading(true);
    if (['ppt', 'pptx', 'doc'].includes(format)) {
      if (assessment.file_url) setPreviewUrl(`https://docs.google.com/viewer?url=${encodeURIComponent(assessment.file_url)}&embedded=true`);
      else setError('Preview is unavailable. Download the file to open it.');
      setLoading(false);
      return () => { active = false; controller.abort(); };
    }
    if (!['pdf', 'docx'].includes(format)) {
      setError('This file cannot be previewed here. Download it to open it.');
      setLoading(false);
      return undefined;
    }
    api.get(`/courses/${courseId}/assessments/${assessment.id}/file/download`, { responseType: 'blob', signal: controller.signal })
      .then(async response => {
        if (!active) return;
        if (format === 'pdf') {
          objectUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
          setPreviewUrl(objectUrl);
          return;
        }
        if (response.data.size > 50 * 1024 * 1024) throw new Error('Document too large to preview');
        const { renderAsync } = await import('docx-preview');
        if (!active) return;
        const host = previewHost;
        const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
        const styles = document.createElement('div');
        const content = document.createElement('div');
        const layout = document.createElement('style');
        layout.textContent = ':host { display:block; overflow:auto; } .activity-docx-wrapper { padding:16px; } section.activity-docx { max-width:100%; box-sizing:border-box; }';
        shadow.replaceChildren(layout, styles, content);
        await renderAsync(await response.data.arrayBuffer(), content, styles, {
          className: 'activity-docx', ignoreWidth: true, ignoreHeight: true,
          useBase64URL: true, renderAltChunks: false,
        });
        for (const link of content.querySelectorAll('a')) {
          if (!/^(https?:|mailto:)/i.test(link.getAttribute('href') || '')) link.removeAttribute('href');
          link.setAttribute('rel', 'noopener noreferrer');
          link.setAttribute('target', '_blank');
        }
      })
      .catch(() => { if (active) setError('This file could not be previewed. Use Download to open it.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      previewHost?.shadowRoot?.replaceChildren();
    };
  }, [assessment?.id, assessment?.file_path, assessment?.file_url, courseId, format]);

  if (!assessment?.file_path) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No activity file has been uploaded yet.</p>;

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div><p className="font-semibold text-slate-800">Activity file</p><p className="text-sm text-slate-500">{assessment.original_filename || assessment.title}</p></div>
      <button type="button" onClick={() => { setDownloadError(''); downloadAssessmentFile(courseId, assessment).catch(() => setDownloadError('Download failed. Please try again.')); }}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Download file</button>
    </div>
    {downloadError && <p role="alert" className="text-sm text-red-600">{downloadError}</p>}
    <div className="min-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {loading && <p role="status" className="p-6 text-sm text-slate-600">Opening file...</p>}
      {error && <p role="alert" className="p-6 text-sm text-red-600">{error}</p>}
      {format === 'docx' ? <div ref={hostRef} hidden={loading || Boolean(error)} className="h-[min(65vh,700px)] overflow-auto bg-slate-100" />
        : previewUrl && <iframe src={previewUrl} title={`${assessment.title} file preview`} className="h-[min(65vh,700px)] w-full border-0" />}
    </div>
  </div>;
}
