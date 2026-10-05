import { useState, useEffect } from 'react';
import api from '../../services/api';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';

function RiskBar({ score, level }) {
  const color =
    level === 'High Risk' ? '#ef4444' :
    level === 'Medium'    ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
      <div style={{
        flex: 1, height: '6px', background: '#f1f5f9',
        borderRadius: '99px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${score}%`, height: '100%',
          background: color, borderRadius: '99px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{
        fontSize: '11px', fontWeight: 700,
        color: level === 'High Risk' ? '#ef4444' : level === 'Medium' ? '#b45309' : '#15803d',
        background: level === 'High Risk' ? '#fef2f2' : level === 'Medium' ? '#fffbeb' : '#f0fdf4',
        border: `1px solid ${level === 'High Risk' ? '#fecaca' : level === 'Medium' ? '#fde68a' : '#bbf7d0'}`,
        borderRadius: '20px', padding: '2px 10px', whiteSpace: 'nowrap',
      }}>
        {level}
      </span>
    </div>
  );
}

function AvatarCircle({ initials }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%',
      background: 'linear-gradient(135deg, #bbf7d0, #6ee7b7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: '0.8rem',
      color: '#065F46', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function InstructorAnalyticsPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then((res) => {
        const courseList = res.data.courses || [];
        setCourses(courseList);
        if (courseList.length > 0) {
          setSelectedCourse(courseList[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;

    Promise.all([
      api.get(`/courses/${selectedCourse}/grades`),
      api.get(`/ai/courses/${selectedCourse}/student-risk`),
    ])
      .then(([gradesRes, riskRes]) => {
        const grades = gradesRes.data.grades || [];
        const riskResults = riskRes.data.results || [];

        // Calculate course stats
        const overallGrades = grades
          .filter(g => g.overall_grade !== null)
          .map(g => g.overall_grade);

        const quizGrades = grades
          .filter(g => g.quiz_average !== null)
          .map(g => g.quiz_average);

        const examGrades = grades
          .filter(g => g.exam_average !== null)
          .map(g => g.exam_average);

        const activityGrades = grades
          .filter(g => g.activity_average !== null)
          .map(g => g.activity_average);

        const passedCount = grades.filter(g => g.remarks === 'Passed').length;

        const stats = {
          total_students: grades.length,
          class_average: overallGrades.length > 0 
            ? Math.round(overallGrades.reduce((a, b) => a + b, 0) / overallGrades.length * 10) / 10
            : 0,
          quiz_average: quizGrades.length > 0
            ? Math.round(quizGrades.reduce((a, b) => a + b, 0) / quizGrades.length * 10) / 10
            : 0,
          exam_average: examGrades.length > 0
            ? Math.round(examGrades.reduce((a, b) => a + b, 0) / examGrades.length * 10) / 10
            : 0,
          activity_average: activityGrades.length > 0
            ? Math.round(activityGrades.reduce((a, b) => a + b, 0) / activityGrades.length * 10) / 10
            : 0,
          pass_rate: grades.length > 0 ? Math.round((passedCount / grades.length) * 100) : 0,
        };

        setCourseStats(stats);

        // Get at-risk students
        const atRisk = riskResults
          .filter(r => r.at_risk && r.status === 'assessed')
          .map(r => ({
            id: r.student.id,
            name: `${r.student.first_name} ${r.student.last_name}`,
            email: r.student.email,
            risk_score: Math.round((r.risk_probability ?? 0) * 100),
            risk_level: (r.risk_probability ?? 0) >= 0.7 ? 'High Risk' : 'Medium',
            metrics: r.metrics,
            reasons: r.reasons,
            initials: `${r.student.first_name[0]}${r.student.last_name[0]}`.toUpperCase(),
          }));

        setAtRiskStudents(atRisk);
      })
      .catch(console.error);
  }, [selectedCourse]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500">You don't have any courses yet.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800">Course Analytics</h2>
        <p className="text-sm text-slate-600 mt-1">Per-course performance and student risk assessment</p>
      </div>

      {/* Course Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Course</label>
        <select
          value={selectedCourse || ''}
          onChange={(e) => { setCourseStats(null); setAtRiskStudents([]); setSelectedCourse(parseInt(e.target.value)); }}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
          ))}
        </select>
      </div>

      {/* Course Stats */}
      {courseStats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Students</p>
                  <p className="text-2xl font-bold text-slate-800">{courseStats.total_students}</p>
                </div>
                <GroupIcon sx={{ fontSize: 32, color: '#cbd5e1' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Class Average</p>
                  <p className={`text-2xl font-bold ${
                    courseStats.class_average >= 75 ? 'text-emerald-600' :
                    courseStats.class_average >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {courseStats.class_average.toFixed(1)}
                  </p>
                </div>
                <AssignmentIcon sx={{ fontSize: 32, color: '#cbd5e1' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Pass Rate</p>
                  <p className="text-2xl font-bold text-teal-600">{courseStats.pass_rate}%</p>
                </div>
                <AssignmentIcon sx={{ fontSize: 32, color: '#cbd5e1' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">At-Risk Students</p>
                  <p className="text-2xl font-bold text-red-600">{atRiskStudents.length}</p>
                </div>
                <WarningIcon sx={{ fontSize: 32, color: '#cbd5e1' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-3">Assessment Breakdown</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Quiz: <span className="font-semibold text-slate-800">{courseStats.quiz_average.toFixed(1)}</span></p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Exam: <span className="font-semibold text-slate-800">{courseStats.exam_average.toFixed(1)}</span></p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Activity: <span className="font-semibold text-slate-800">{courseStats.activity_average.toFixed(1)}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* At-Risk Students */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <WarningIcon sx={{ color: '#f59e0b', fontSize: 24 }} />
              <h3 className="text-lg font-semibold text-slate-800">At-Risk Students</h3>
            </div>

            {atRiskStudents.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No at-risk students detected.</p>
            ) : (
              <div className="space-y-4">
                {atRiskStudents.map((student) => (
                  <div key={student.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <AvatarCircle initials={student.initials} />
                        <div>
                          <p className="font-semibold text-slate-800">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">{student.risk_score}%</p>
                        <p className="text-xs text-slate-500">risk score</p>
                      </div>
                    </div>

                    <RiskBar score={student.risk_score} level={student.risk_level} />

                    {student.reasons && student.reasons.length > 0 && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Risk Factors:</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {student.reasons.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <TrendingDownIcon sx={{ fontSize: 12, marginTop: '2px', flexShrink: 0 }} />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {student.metrics && (
                      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-50 p-2 rounded">
                          <p className="text-slate-500">Quiz Avg</p>
                          <p className="font-semibold text-slate-800">{(student.metrics.quiz_avg || 0).toFixed(1)}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                          <p className="text-slate-500">Logins</p>
                          <p className="font-semibold text-slate-800">{student.metrics.login_count}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                          <p className="text-slate-500">Submission Rate</p>
                          <p className="font-semibold text-slate-800">{(student.metrics.submission_rate * 100).toFixed(0)}%</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                          <p className="text-slate-500">Missed Tasks</p>
                          <p className="font-semibold text-slate-800">{student.metrics.missed_tasks}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
