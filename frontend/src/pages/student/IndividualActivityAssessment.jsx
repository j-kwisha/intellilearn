import { useEffect, useState } from 'react';
import api from '../../services/api';
import AssessmentSchedule from '../../components/AssessmentSchedule';
import AssessmentFileViewer from '../../components/AssessmentFileViewer';
import { downloadActivitySubmission } from '../../services/assessmentFiles';
import { canViewSubmissionScore } from '../../services/submissionResults';

export default function IndividualActivityAssessment({ courseId, assessment, submission, result, setResult, startActivity, error, setError, navigate }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previous, setPrevious] = useState(null);
  const [loadingPrevious, setLoadingPrevious] = useState(true);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/courses/${courseId}/assessments/${assessment.id}/submissions`)
      .then(response => {
        if (!active) return;
        const latest = (response.data.submissions || []).at(-1) || null;
        setPrevious(latest);
        if (latest && ['submitted', 'graded'].includes(latest.status)) setResult(latest);
      })
      .catch(() => { if (active) setError('Could not check your earlier activity attempts. Please refresh.'); })
      .finally(() => { if (active) setLoadingPrevious(false); });
    return () => { active = false; };
  }, [assessment.id, courseId, setError, setResult]);

  const now = Date.now();
  const dateMessage = assessment.available_from && now < Date.parse(assessment.available_from)
    ? 'This activity is not open yet.'
    : !assessment.allow_late_submissions && assessment.due_date && now >= Date.parse(assessment.due_date)
      ? 'The deadline for this activity has passed.' : '';
  const scoreVisible = result && canViewSubmissionScore(result);

  const startOrResume = async () => {
    const started = await startActivity();
    if (started) {
      setResult(null);
      setPrevious(null);
      setFile(null);
      setError('');
    }
  };

  const submit = async () => {
    if (!file || !submission || submitting) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('Choose a file smaller than 50 MB.');
      return;
    }
    if (!window.confirm('Submit this file now? This will use your activity attempt.')) return;
    setSubmitting(true);
    setError('');
    try {
      const body = new FormData();
      body.append('submission_id', submission.id);
      body.append('file', file);
      const response = await api.post(`/courses/${courseId}/assessments/${assessment.id}/submit-activity`, body);
      setResult(response.data.submission);
      setPrevious(response.data.submission);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Could not submit your file. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="mx-auto max-w-4xl space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold text-slate-800">{assessment.title}</h2>
      {assessment.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{assessment.description}</p>}
      <AssessmentSchedule assessment={assessment} className="mt-3 text-sm text-slate-600" />
    </div>
    <AssessmentFileViewer courseId={courseId} assessment={assessment} />
    {result ? <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h3 className="font-semibold text-slate-800">{result.status === 'graded' ? 'Activity graded' : 'Submitted for instructor review'}</h3>
      <p className="text-sm text-slate-600">{result.original_filename || 'Your completed file'} was submitted successfully.</p>
      {scoreVisible && <p className="text-sm font-semibold text-slate-800">Score: {result.percentage}%</p>}
      {scoreVisible && result.ai_feedback && <p className="whitespace-pre-wrap text-sm text-slate-600">Feedback: {result.ai_feedback}</p>}
      <button type="button" onClick={() => { setDownloadError(''); downloadActivitySubmission(courseId, assessment.id, result).catch(() => setDownloadError('Could not download your submitted file.')); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Download your submission</button>
      <div><button type="button" onClick={startOrResume} className="text-sm font-medium text-indigo-700">Start another attempt if your instructor has unlocked one</button></div>
      {downloadError && <p role="alert" className="text-sm text-red-600">{downloadError}</p>}
    </div> : <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <h3 className="font-semibold text-slate-800">Submit your completed work</h3>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {dateMessage && !submission && <p className="text-sm text-amber-700">{dateMessage}</p>}
      {previous?.locked_at && !submission && <p className="text-sm text-amber-700">Your attempt is locked. Ask your instructor to unlock it.</p>}
      {!submission ? <button type="button" onClick={startOrResume} disabled={loadingPrevious || (Boolean(dateMessage) && previous?.status !== 'in_progress') || Boolean(previous?.locked_at) || !assessment.file_path} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loadingPrevious ? 'Checking attempts...' : previous?.status === 'in_progress' ? 'Resume activity' : 'Start activity'}</button>
        : <>
          <label className="block text-sm font-medium text-slate-700">Your file (PDF, DOC, DOCX, PPT, or PPTX; up to 50 MB)
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={event => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
          <button type="button" onClick={submit} disabled={!file || submitting} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit completed file'}</button>
        </>}
    </div>}
    <button type="button" onClick={() => navigate(`/student/courses/${courseId}`)} className="text-sm font-medium text-slate-600">Back to course</button>
  </div>;
}
