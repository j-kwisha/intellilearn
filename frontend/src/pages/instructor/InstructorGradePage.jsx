import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatGrade, escapeHtml } from '../../services/gradePrint';
import EssayGradingDetails from '../../components/EssayGradingDetails';

async function downloadXlsx(filename, sheetName, headers, rows, columnWidths) {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = columnWidths.map(wch => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename, { compression: true });
}

function filenamePart(value) {
  return String(value || 'course').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'course';
}

function printGradePage(title, content) {
  document.getElementById('grade-print-root')?.remove();
  const printRoot = document.createElement('section');
  printRoot.id = 'grade-print-root';
  printRoot.innerHTML = `
    <style>
      #grade-print-root{display:none}
      @media print{
        body *{visibility:hidden!important}
        #grade-print-root,#grade-print-root *{visibility:visible!important}
        #grade-print-root{display:block!important;position:absolute;inset:0;width:100%;box-sizing:border-box;padding:15mm;background:#fff;color:#333;font:12px system-ui,sans-serif}
        #grade-print-root h1{font-size:24px;margin:0 0 8px}
        #grade-print-root .print-meta{color:#555;margin:0 0 8px}
        #grade-print-root table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px}
        #grade-print-root th,#grade-print-root td{padding:8px;text-align:left;vertical-align:top;overflow-wrap:anywhere;border-bottom:1px solid #ddd}
        #grade-print-root th{background:#f1f3f5;font-weight:700}
        #grade-print-root thead{display:table-header-group}
        #grade-print-root tr{break-inside:avoid}
        #grade-print-root .grade-high,#grade-print-root .score-high{color:#15803d;font-weight:700}
        #grade-print-root .grade-fair{color:#b45309;font-weight:700}
        #grade-print-root .grade-low,#grade-print-root .score-low{color:#dc2626;font-weight:700}
      }
    </style>
    <main><h1>${escapeHtml(title)}</h1>${content}</main>`;
  document.body.appendChild(printRoot);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    printRoot.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 60000);
  window.requestAnimationFrame(() => window.print());
}

export default function InstructorGradePage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingCourseGrades, setExportingCourseGrades] = useState('');

  useEffect(() => {
    api.get('/courses')
      .then((res) => { setCourses(res.data.courses); if (res.data.courses.length > 0) setSelectedCourse(res.data.courses[0].id); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    api.get(`/courses/${selectedCourse}/assessments`)
      .then((res) => { setAssessments(res.data.assessments); setSelectedAssessment(null); setSubmissions([]); })
      .catch(console.error);
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedCourse || !selectedAssessment) return;
    api.get(`/courses/${selectedCourse}/assessments/${selectedAssessment}/submissions`)
      .then((res) => setSubmissions(res.data.submissions)).catch(console.error);
  }, [selectedCourse, selectedAssessment]);

  const openGrading = async (submission) => {
    try {
      const res = await api.get(`/courses/${selectedCourse}/assessments/${selectedAssessment}/submissions/${submission.id}`);
      setGradingSubmission(res.data.submission);
    } catch (err) { console.error(err); }
  };

  const exportCourseGradesXlsx = async () => {
    if (!selectedCourse || exportingCourseGrades) return;
    setExportingCourseGrades('xlsx');
    try {
      const response = await api.get(`/courses/${selectedCourse}/grades`);
      const course = courses.find(item => item.id === selectedCourse);
      const rows = (response.data.grades || []).map(grade => [
        `${grade.user?.first_name || ''} ${grade.user?.last_name || ''}`.trim(),
        grade.user?.email,
        grade.quiz_average,
        grade.exam_average,
        grade.activity_average,
        grade.overall_grade,
        grade.remarks,
      ]);
      await downloadXlsx(`${filenamePart(course?.name)}-course-grades.xlsx`, 'Course Grades', [
        'Student Name', 'Email', 'Quiz Average (%)', 'Exam Average (%)',
        'Activity Average (%)', 'Overall Grade (%)', 'Remarks',
      ], rows, [26, 34, 18, 18, 22, 20, 24]);
    } catch (error) {
      alert(error.response?.data?.message || 'Could not export course grades. Please try again.');
    } finally {
      setExportingCourseGrades('');
    }
  };

  const exportAssessmentGradesXlsx = async () => {
    const course = courses.find(item => item.id === selectedCourse);
    const assessment = assessments.find(item => item.id === selectedAssessment);
    const rows = submissions.map(submission => [
      `${submission.user?.first_name || ''} ${submission.user?.last_name || ''}`.trim(),
      submission.user?.email,
      submission.attempt_number,
      submission.percentage,
      submission.status,
      submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('en-PH') : '',
    ]);
    try {
      await downloadXlsx(`${filenamePart(course?.name)}-${filenamePart(assessment?.title)}-grades.xlsx`, 'Assessment Grades', [
        'Student Name', 'Email', 'Attempt', 'Score (%)', 'Status', 'Submitted At',
      ], rows, [26, 34, 12, 14, 16, 26]);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Could not export assessment grades. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'240px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const statusBg = { in_progress:'#f1f5f9', submitted:'#fef9c3', graded:'#dcfce7' };
  const statusColor = { in_progress:'#64748b', submitted:'#a16207', graded:'#15803d' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
      {/* Course Grades header */}
      <div className="instr-panel" style={{ padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
          <h3 style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'17px', color:'var(--instr-ink)', margin:0 }}>Course Grades</h3>
          {selectedCourse && (
            <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'flex-end', gap:8 }}>
              <button className="instr-pill-btn" onClick={exportCourseGradesXlsx} disabled={exportingCourseGrades}>
                {exportingCourseGrades === 'xlsx' ? 'Preparing Excel...' : 'Export Excel (.xlsx)'}
              </button>
              <button
                className="instr-pill-btn"
                onClick={async () => {
                const course = courses.find(c => c.id === selectedCourse);
                try {
                  const res = await api.get(`/courses/${selectedCourse}/grades`);
                  const rows = (res.data.grades || []).map(g =>
                    `<tr><td>${escapeHtml(g.user?.first_name)} ${escapeHtml(g.user?.last_name)}</td><td>${formatGrade(g.quiz_average)}</td><td>${formatGrade(g.exam_average)}</td><td>${formatGrade(g.activity_average)}</td><td class="${g.overall_grade>=75?'grade-high':g.overall_grade>=60?'grade-fair':'grade-low'}">${formatGrade(g.overall_grade)}</td><td>${escapeHtml(g.remarks || '\u2014')}</td></tr>`
                  ).join('');
                  printGradePage(course?.name || 'Course Grades', `
                    <p class="print-meta">${escapeHtml(course?.code)} · ${escapeHtml(course?.section || '')}</p>
                    <p class="print-meta">Printed on: ${new Date().toLocaleString('en-PH')}</p>
                    <table><thead><tr><th>Student</th><th>Quiz Avg</th><th>Exam Avg</th><th>Activity Avg</th><th>Overall Grade</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table>`);
                } catch (err) {
                  console.error('Print failed:', err);
                  alert('Failed to load grades for printing. Please try again.');
                }
                }}
              >
                Print Course Grades
              </button>
            </div>
          )}
        </div>
        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'14px', color:'var(--instr-muted)', margin:0 }}>Select a course above to view, export, or print final grades.</p>
      </div>

      {/* Filters row */}
      <div className="instr-panel" style={{ padding:'18px 22px', display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:'16px' }}>
        <div>
          <label className="instr-form-label">Course</label>
          <select value={selectedCourse || ''} onChange={e => setSelectedCourse(parseInt(e.target.value))} className="instr-form-input" style={{ minWidth:'220px' }}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="instr-form-label">Assessment</label>
          <select value={selectedAssessment || ''} onChange={e => setSelectedAssessment(parseInt(e.target.value))} className="instr-form-input" style={{ minWidth:'220px' }}>
            <option value="">Select assessment...</option>
            {assessments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.type.replace('_',' ')})</option>)}
          </select>
        </div>
        {selectedAssessment && (
          <>
          <button className="instr-pill-btn" style={{ marginLeft:'auto' }} onClick={exportAssessmentGradesXlsx}>
            Export Excel (.xlsx)
          </button>
          <button className="instr-pill-btn"
            onClick={() => {
              const courseName = courses.find(c => c.id === selectedCourse)?.name || 'Course';
              const assessment = assessments.find(a => a.id === selectedAssessment);
              const rows = submissions.map(sub => `<tr><td>${escapeHtml(sub.user?.first_name)} ${escapeHtml(sub.user?.last_name)}</td><td>#${sub.attempt_number}</td><td class="${sub.percentage >= 75 ? 'score-high' : 'score-low'}">${sub.percentage != null ? `${sub.percentage}%` : '\u2014'}</td><td>${escapeHtml(sub.status)}</td><td>${sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-PH') : '\u2014'}</td></tr>`).join('');
              printGradePage(`${courseName} — ${assessment?.title || 'Assessment'}`, `
                <p class="print-meta">Assessment results · Printed: ${new Date().toLocaleString('en-PH')}</p>
                <table><thead><tr><th>Student</th><th>Attempt</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead><tbody>${rows}</tbody></table>`);
            }}
          >
            Print Grades
          </button>
          </>
        )}
      </div>

      {/* Grading panel */}
      {gradingSubmission && (
        <GradingPanel
          submission={gradingSubmission}
          courseId={selectedCourse}
          assessmentId={selectedAssessment}
          onClose={() => setGradingSubmission(null)}
          onGraded={() => {
            setGradingSubmission(null);
            api.get(`/courses/${selectedCourse}/assessments/${selectedAssessment}/submissions`)
              .then(res => setSubmissions(res.data.submissions));
          }}
        />
      )}

      {/* Submissions table */}
      {selectedAssessment ? (
        <div className="instr-students-panel">
          {submissions.length === 0 ? (
            <p style={{ textAlign:'center', color:'var(--instr-muted)', padding:'40px', fontFamily:'Inter,sans-serif' }}>No submissions yet for this assessment.</p>
          ) : (
            <table className="instr-students-table">
              <thead>
                <tr>
                  <th>Student</th><th>Attempt</th><th>Score</th><th>Status</th><th>Submitted</th>
                  <th style={{ textAlign:'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <p className="instr-student-name">{sub.user?.first_name} {sub.user?.last_name}</p>
                      <p style={{ fontSize:'12px', color:'var(--instr-muted)', margin:'2px 0 0' }}>{sub.user?.email}</p>
                    </td>
                    <td>#{sub.attempt_number}</td>
                    <td>
                      {sub.percentage != null
                        ? <span style={{ fontWeight:700, color: sub.percentage >= 75 ? '#15803d' : '#dc2626' }}>{sub.percentage}%</span>
                        : <span style={{ color:'var(--instr-muted)' }}>â€”</span>
                      }
                    </td>
                    <td>
                      <span style={{ fontSize:'12.5px', fontWeight:600, padding:'4px 12px', borderRadius:'999px', background:statusBg[sub.status]||'#f1f5f9', color:statusColor[sub.status]||'#64748b', fontFamily:'Inter,sans-serif', textTransform:'capitalize' }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ fontSize:'13px', color:'var(--instr-muted)' }}>
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('en-PH') : 'â€”'}
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <button onClick={() => openGrading(sub)} className="instr-link-action">
                        {sub.status === 'submitted' ? 'Grade' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="instr-tab-empty">Select an assessment above to view submissions.</div>
      )}
    </div>
  );
}

function GradingPanel({ submission, courseId, assessmentId, onClose, onGraded }) {
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial = {};
    submission.answers?.forEach(a => { initial[a.question_id] = { points_earned: a.points_earned ?? '', ai_feedback: a.ai_feedback || '' }; });
    setGrades(initial);
  }, [submission]);

  const updateGrade = (qId, field, value) => setGrades(p => ({ ...p, [qId]: { ...p[qId], [field]: value } }));

  const handleSubmitGrades = async () => {
    setSaving(true);
    const gradeArray = Object.entries(grades)
      .filter(([, g]) => g.points_earned !== '' && g.points_earned !== null)
      .map(([qId, g]) => ({ question_id: parseInt(qId), points_earned: parseFloat(g.points_earned), ai_feedback: g.ai_feedback || null, ...(g.criterion_scores ? { criterion_scores: g.criterion_scores } : {}) }));
    try {
      await api.put(`/courses/${courseId}/assessments/${assessmentId}/submissions/${submission.id}/grade`, { grades: gradeArray });
      onGraded();
    } catch (err) { alert(err.response?.data?.message || 'Failed to save grades.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="instr-form-card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <h4 style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'15px', color:'var(--instr-ink)', margin:0 }}>
          Grading: {submission.user?.first_name} {submission.user?.last_name}
          <span style={{ color:'var(--instr-muted)', fontWeight:400, fontSize:'13px', marginLeft:'8px' }}>(Attempt #{submission.attempt_number})</span>
        </h4>
        <button onClick={onClose} className="instr-link-action">Close</button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
        {submission.answers?.map((answer, idx) => (
          <div key={answer.id} className="instr-panel" style={{ padding:'16px' }}>
            <p style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:'14.5px', color:'var(--instr-ink)', margin:'0 0 4px' }}>Q{idx+1}: {answer.question?.question_text}</p>
            <p style={{ fontSize:'12px', color:'var(--instr-muted)', margin:'0 0 10px' }}>{answer.question?.type?.replace('_',' ')} Â· {answer.question?.points} pts max</p>
            <div style={{ background:'var(--instr-bg)', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px' }}>
              <p style={{ fontSize:'12px', color:'var(--instr-muted)', marginBottom:'4px' }}>Student's answer:</p>
              <p style={{ fontSize:'14px', color:'var(--instr-ink)', margin:0 }}>{answer.answer_text || '(no answer)'}</p>
            </div>
            {answer.is_correct !== null && (
              <p style={{ fontSize:'12px', fontWeight:600, color: answer.is_correct ? '#15803d' : '#dc2626', marginBottom:'10px' }}>
                Auto-graded: {answer.is_correct ? 'âœ“ Correct' : 'âœ— Incorrect'}
              </p>
            )}
            <EssayGradingDetails answer={answer} grade={grades[answer.question_id]} onChange={patch => setGrades(prev => ({ ...prev, [answer.question_id]: { ...prev[answer.question_id], ...patch } }))} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label className="instr-form-label">Points (max {answer.rubric_snapshot?.total_points ?? answer.question?.points})</label>
                <input type="number" min={0} max={answer.rubric_snapshot?.total_points ?? answer.question?.points} step="0.01"
                  value={grades[answer.question_id]?.points_earned ?? ''}
                  onChange={e => updateGrade(answer.question_id, 'points_earned', e.target.value)}
                  className="instr-form-input" />
              </div>
              <div>
                <label className="instr-form-label">Feedback</label>
                <input type="text" value={grades[answer.question_id]?.ai_feedback || ''}
                  onChange={e => updateGrade(answer.question_id, 'ai_feedback', e.target.value)}
                  placeholder="Optional feedback..."
                  className="instr-form-input" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
        <button onClick={handleSubmitGrades} disabled={saving} className="instr-pill-btn">{saving ? 'Saving...' : 'Save Grades'}</button>
        <button onClick={onClose} className="instr-outline-btn">Cancel</button>
      </div>
    </div>
  );
}
