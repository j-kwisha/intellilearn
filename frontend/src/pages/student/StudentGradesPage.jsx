import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PrintIcon from '@mui/icons-material/Print';

export default function StudentGradesPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [grade, setGrade] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then((res) => {
        const enrolledCourses = res.data.courses || [];
        setCourses(enrolledCourses);
        if (enrolledCourses.length > 0) setSelectedCourse(enrolledCourses[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;

    Promise.all([
      api.get(`/courses/${selectedCourse}/grades`),
      api.get(`/courses/${selectedCourse}/assessments`),
    ])
      .then(([gradeRes, assessmentsRes]) => {
        setGrade(gradeRes.data.grade);
        
        // Get all submissions for visibility checking
        const assessments = assessmentsRes.data.assessments || [];
        const allSubmissions = [];
        
        const fetchSubmissions = assessments.map(a =>
          api.get(`/courses/${selectedCourse}/assessments/${a.id}/submissions`)
            .then(res => {
              allSubmissions.push(...(res.data.submissions || []).map(s => ({ ...s, assessment: a })));
            })
            .catch(() => {})
        );
        
        return Promise.all(fetchSubmissions).then(() => allSubmissions);
      })
      .then(allSubmissions => setSubmissions(allSubmissions))
      .catch(console.error);
  }, [selectedCourse]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500 mb-4">You are not enrolled in any courses yet.</p>
        <Link to="/student/courses" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Browse Courses
        </Link>
      </div>
    );
  }

  const selectedCourseName = courses.find(c => c.id === selectedCourse)?.name || '';

  const handlePrintGrades = () => {
    const printWindow = window.open('', '_blank');
    const courseName = selectedCourseName;
    const courseCode = courses.find(c => c.id === selectedCourse)?.code || '';
    
    const visibleSubmissions = submissions.filter(s => {
      const visibility = s.assessment?.score_visibility || 'immediate';
      if (visibility === 'hidden') return false;
      if (visibility === 'instructor_release' && !s.assessment?.scores_released_at) return false;
      return true;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${courseName} - My Grades</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 40px;
            color: #333;
          }
          h1 {
            font-size: 28px;
            margin-bottom: 5px;
          }
          .header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .meta {
            color: #666;
            font-size: 14px;
            margin-top: 8px;
          }
          .grade-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
          }
          .grade-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .grade-label {
            font-weight: 500;
            color: #374151;
          }
          .grade-value {
            font-weight: 600;
          }
          .high {
            color: #10b981;
          }
          .fair {
            color: #f59e0b;
          }
          .low {
            color: #ef4444;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #d1d5db;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          .timestamp {
            margin-top: 30px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${courseName}</h1>
          <div class="meta">${courseCode}</div>
          <div class="meta">Generated on: ${new Date().toLocaleString('en-PH')}</div>
        </div>

        ${grade ? `
          <div class="grade-card">
            <div class="grade-row">
              <span class="grade-label">Quiz Average:</span>
              <span class="grade-value ${grade.quiz_average >= 75 ? 'high' : grade.quiz_average >= 60 ? 'fair' : 'low'}">
                ${grade.quiz_average !== null ? grade.quiz_average.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div class="grade-row">
              <span class="grade-label">Exam Average:</span>
              <span class="grade-value ${grade.exam_average >= 75 ? 'high' : grade.exam_average >= 60 ? 'fair' : 'low'}">
                ${grade.exam_average !== null ? grade.exam_average.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div class="grade-row">
              <span class="grade-label">Activity Average:</span>
              <span class="grade-value ${grade.activity_average >= 75 ? 'high' : grade.activity_average >= 60 ? 'fair' : 'low'}">
                ${grade.activity_average !== null ? grade.activity_average.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div class="grade-row" style="border-top: 1px solid #d1d5db; padding-top: 10px; margin-top: 10px;">
              <span class="grade-label" style="font-size: 16px;">Overall Grade:</span>
              <span class="grade-value" style="font-size: 16px;" class="${grade.overall_grade >= 75 ? 'high' : grade.overall_grade >= 60 ? 'fair' : 'low'}">
                ${grade.overall_grade !== null ? grade.overall_grade.toFixed(2) : 'N/A'}
              </span>
            </div>
            ${grade.remarks ? `<div class="meta" style="margin-top: 10px;">Status: ${grade.remarks}</div>` : ''}
          </div>
        ` : '<p style="color: #999;">No grades available yet.</p>'}

        ${visibleSubmissions.length > 0 ? `
          <h2 style="font-size: 18px; font-weight: 600; margin-top: 30px; margin-bottom: 15px;">Assessment Scores</h2>
          <table>
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Type</th>
                <th>Score</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${visibleSubmissions.map(s => `
                <tr>
                  <td>${s.assessment?.title || 'Unknown'}</td>
                  <td>${s.assessment?.type?.replace('_', ' ') || '—'}</td>
                  <td class="${s.percentage >= 75 ? 'high' : s.percentage >= 60 ? 'fair' : 'low'}">
                    ${s.percentage !== null ? s.percentage.toFixed(1) + '%' : '—'}
                  </td>
                  <td>${s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-PH') : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="timestamp">
          Printed: ${new Date().toLocaleString('en-PH')}
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800">My Grades</h2>
      </div>

      {/* Course Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Course</label>
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handlePrintGrades}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium
            hover:bg-indigo-700 transition-colors"
        >
          <PrintIcon fontSize="small" />
          Print Grades
        </button>
      </div>

      {/* Overall Grade Card */}
      {grade ? (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Current Grades</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Quiz Average</p>
              <p className={`text-2xl font-bold ${grade.quiz_average >= 75 ? 'text-emerald-600' : grade.quiz_average >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {grade.quiz_average !== null ? grade.quiz_average.toFixed(1) : '—'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Exam Average</p>
              <p className={`text-2xl font-bold ${grade.exam_average >= 75 ? 'text-emerald-600' : grade.exam_average >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {grade.exam_average !== null ? grade.exam_average.toFixed(1) : '—'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Activity Average</p>
              <p className={`text-2xl font-bold ${grade.activity_average >= 75 ? 'text-emerald-600' : grade.activity_average >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {grade.activity_average !== null ? grade.activity_average.toFixed(1) : '—'}
              </p>
            </div>
            <div className="bg-indigo-600 text-white rounded-lg p-4">
              <p className="text-xs mb-1 opacity-90">Overall Grade</p>
              <p className="text-3xl font-bold">
                {grade.overall_grade !== null ? grade.overall_grade.toFixed(1) : '—'}
              </p>
              {grade.remarks && <p className="text-xs mt-2 opacity-75">{grade.remarks}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">No grades available yet for this course.</p>
        </div>
      )}

      {/* Assessment Submissions */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Assessment Scores</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Assessment</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Score</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((sub) => {
                const visibility = sub.assessment?.score_visibility || 'immediate';
                const isHidden = visibility === 'hidden';
                const isLocked = visibility === 'instructor_release' && !sub.assessment?.scores_released_at;
                
                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-800">{sub.assessment?.title}</p>
                      {isLocked && <p className="text-xs text-amber-600">🔒 Scores locked</p>}
                      {isHidden && <p className="text-xs text-slate-500">Scores hidden</p>}
                    </td>
                    <td className="px-6 py-3 text-slate-600 capitalize">
                      {sub.assessment?.type?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3">
                      {isHidden || isLocked ? (
                        <span className="text-slate-400">—</span>
                      ) : sub.percentage !== null ? (
                        <span className={`font-bold ${sub.percentage >= 75 ? 'text-emerald-600' : sub.percentage >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {sub.percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize
                        ${sub.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-PH') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
