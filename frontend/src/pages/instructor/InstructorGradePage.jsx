import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function InstructorGradePage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

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
            <button
              className="instr-pill-btn"
              onClick={() => {
                const courseName = courses.find(c => c.id === selectedCourse)?.name || 'Course';
                const course = courses.find(c => c.id === selectedCourse);
                api.get(`/courses/${selectedCourse}/grades`).then(res => {
                  const printWindow = window.open('', '_blank');
                  const rows = (res.data.grades || []).map(g =>
                    `<tr><td>${g.user?.first_name} ${g.user?.last_name}</td><td>${g.quiz_average!=null?g.quiz_average.toFixed(2):'—'}</td><td>${g.exam_average!=null?g.exam_average.toFixed(2):'—'}</td><td>${g.activity_average!=null?g.activity_average.toFixed(2):'—'}</td><td class="${g.overall_grade>=75?'grade-high':g.overall_grade>=60?'grade-fair':'grade-low'}">${g.overall_grade!=null?g.overall_grade.toFixed(2):'—'}</td><td>${g.remarks||'—'}</td></tr>`
                  ).join('');
                  const html = `<!DOCTYPE html><html><head><title>${courseName} - Course Grades</title>
                    <style>body{font-family:system-ui,sans-serif;margin:40px;color:#333}h1{font-size:28px;margin-bottom:5px}.meta{color:#666;margin-bottom:20px;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f3f4f6;padding:12px;text-align:left;font-weight:600;border-bottom:2px solid #d1d5db}td{padding:12px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f9fafb}.grade-high{color:#10b981;font-weight:600}.grade-low{color:#ef4444;font-weight:600}.grade-fair{color:#f59e0b;font-weight:600}</style>
                    </head><body><h1>${courseName}</h1><div class="meta">${course?.code} · ${course?.section}</div><div class="meta">Printed on: ${new Date().toLocaleString('en-PH')}</div>
                    <table><thead><tr><th>Student</th><th>Quiz Avg</th><th>Exam Avg</th><th>Activity Avg</th><th>Overall Grade</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }).catch(console.error);
              }}
            >
              Print Course Grades
            </button>
          )}
        </div>
        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'14px', color:'var(--instr-muted)', margin:0 }}>Select a course above to view and print final grades.</p>
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
          <button className="instr-pill-btn" style={{ marginLeft:'auto' }}
            onClick={() => {
              const courseName = courses.find(c=>c.id===selectedCourse)?.name||'Course';
              const assessmentName = assessments.find(a=>a.id===selectedAssessment)?.title||'Assessment';
              const printWindow = window.open('','_blank');
              const html = `<!DOCTYPE html><html><head><title>${courseName} - ${assessmentName}</title>
                <style>body{font-family:system-ui,sans-serif;margin:40px;color:#333}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f3f4f6;padding:12px;text-align:left;font-weight:600;border-bottom:2px solid #d1d5db}td{padding:12px;border-bottom:1px solid #e5e7eb}.score-high{color:#10b981;font-weight:600}.score-low{color:#ef4444;font-weight:600}</style>
                </head><body><h1>${courseName}</h1><div style="color:#666;font-size:14px;margin-bottom:20px">Assessment: ${assessmentName} · Printed: ${new Date().toLocaleString('en-PH')}</div>
                <table><thead><tr><th>Student</th><th>Attempt</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
                <tbody>${submissions.map(sub=>`<tr><td>${sub.user?.first_name} ${sub.user?.last_name}</td><td>#${sub.attempt_number}</td><td class="${sub.percentage>=75?'score-high':'score-low'}">${sub.percentage!=null?sub.percentage+'%':'—'}</td><td>${sub.status}</td><td>${sub.submitted_at?new Date(sub.submitted_at).toLocaleDateString('en-PH'):'—'}</td></tr>`).join('')}
                </tbody></table></body></html>`;
              printWindow.document.write(html);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
            }}
          >
            Print Grades
          </button>
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
                        : <span style={{ color:'var(--instr-muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      <span style={{ fontSize:'12.5px', fontWeight:600, padding:'4px 12px', borderRadius:'999px', background:statusBg[sub.status]||'#f1f5f9', color:statusColor[sub.status]||'#64748b', fontFamily:'Inter,sans-serif', textTransform:'capitalize' }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ fontSize:'13px', color:'var(--instr-muted)' }}>
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('en-PH') : '—'}
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
      .filter(([_, g]) => g.points_earned !== '' && g.points_earned !== null)
      .map(([qId, g]) => ({ question_id: parseInt(qId), points_earned: parseFloat(g.points_earned), ai_feedback: g.ai_feedback || null }));
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
            <p style={{ fontSize:'12px', color:'var(--instr-muted)', margin:'0 0 10px' }}>{answer.question?.type?.replace('_',' ')} · {answer.question?.points} pts max</p>
            <div style={{ background:'var(--instr-bg)', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px' }}>
              <p style={{ fontSize:'12px', color:'var(--instr-muted)', marginBottom:'4px' }}>Student's answer:</p>
              <p style={{ fontSize:'14px', color:'var(--instr-ink)', margin:0 }}>{answer.answer_text || '(no answer)'}</p>
            </div>
            {answer.is_correct !== null && (
              <p style={{ fontSize:'12px', fontWeight:600, color: answer.is_correct ? '#15803d' : '#dc2626', marginBottom:'10px' }}>
                Auto-graded: {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
              </p>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label className="instr-form-label">Points (max {answer.question?.points})</label>
                <input type="number" min={0} max={answer.question?.points} step={1}
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
