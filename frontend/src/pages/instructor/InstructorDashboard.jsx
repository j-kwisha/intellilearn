import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ScienceIcon from '@mui/icons-material/Science';
import CodeIcon from '@mui/icons-material/Code';
import BiotechIcon from '@mui/icons-material/Biotech';
import CalculateIcon from '@mui/icons-material/Calculate';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// ─────────────────────────────────────────────
//  PLACEHOLDER / DUMMY DATA
//  Shown until real backend endpoints are ready.
//  Once the API returns data, these are replaced.
// ─────────────────────────────────────────────
const DUMMY_STATS = {
  my_courses:       0,
  total_students:   0,
  pending_grading:  null,
  class_average:    null,
  at_risk_students: 0,
};

const DUMMY_COURSES     = [];
const DUMMY_SUBMISSIONS = [];
const DUMMY_AT_RISK     = [];
// ─────────────────────────────────────────────

const courseColors = [
  { bg: '#ECFDF5', icon: <MenuBookIcon  fontSize="medium" sx={{ color: '#059669' }} /> },
  { bg: '#F0FDF4', icon: <ScienceIcon   fontSize="medium" sx={{ color: '#16A34A' }} /> },
  { bg: '#DCFCE7', icon: <CodeIcon      fontSize="medium" sx={{ color: '#15803D' }} /> },
  { bg: '#D1FAE5', icon: <BiotechIcon   fontSize="medium" sx={{ color: '#047857' }} /> },
  { bg: '#A7F3D0', icon: <CalculateIcon fontSize="medium" sx={{ color: '#065F46' }} /> },
];

function classAverageLabel(avg) {
  if (avg == null) return null;
  if (avg >= 90) return { label: 'Excellent',    color: '#16A34A' };
  if (avg >= 80) return { label: 'Above target', color: '#16A34A' };
  if (avg >= 70) return { label: 'On target',    color: '#2563EB' };
  return             { label: 'Below target',    color: '#f59e0b' };
}

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
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {initials}
    </div>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();

  // State initialised with dummy data — real API data replaces on load
  const [stats,       setStats]       = useState(DUMMY_STATS);
  const [courses,     setCourses]     = useState(DUMMY_COURSES);
  const [submissions, setSubmissions] = useState(DUMMY_SUBMISSIONS);
  const [atRisk,      setAtRisk]      = useState(DUMMY_AT_RISK);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ── Courses ──
        const coursesRes = await api.get('/courses');
        const courseList = coursesRes.data.courses || [];
        if (courseList.length > 0) setCourses(courseList);

        // ── Stats — derive from real courses ──
        try {
          const statsRes = await api.get('/instructor/stats');
          if (statsRes.data) setStats(statsRes.data);
        } catch (_) {
          // Derive from courses
          const totalStudents = courseList.reduce((sum, c) => sum + (c.students_count || 0), 0);
          setStats(prev => ({
            ...prev,
            my_courses: courseList.length,
            total_students: totalStudents,
          }));
        }

        // ── Recent Submissions (optional) ──
        try {
          const subRes = await api.get('/instructor/submissions/recent');
          if (subRes.data?.submissions?.length > 0) setSubmissions(subRes.data.submissions);
        } catch (_) {}

        // ── At-Risk Students — load from real courses ──
        try {
          const riskStudents = [];
          for (const course of courseList.slice(0, 3)) {
            const riskRes = await api.get(`/ai/courses/${course.id}/student-risk`);
            const results = riskRes.data?.results || [];
            results.forEach((r) => {
              if (r.at_risk && r.status === 'assessed') {
                const name = `${r.student.first_name} ${r.student.last_name}`;
                riskStudents.push({
                  id: `${course.id}-${r.student.id}`,
                  name,
                  course: `${course.code}${course.section ? ' - ' + course.section : ''}`,
                  risk_score: Math.round((r.risk_probability ?? 0) * 100),
                  risk_level: (r.risk_probability ?? 0) >= 0.7 ? 'High Risk' : 'Medium',
                  avatar_initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                });
              }
            });
          }
          if (riskStudents.length > 0) setAtRisk(riskStudents);

          // Update at-risk count in stats
          setStats(prev => ({ ...prev, at_risk_students: riskStudents.length }));
        } catch (_) {}

      } catch (err) {
        console.warn('Instructor dashboard API unavailable, showing placeholder data.', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading your dashboard...</div>;
  }

  const avgLabel = classAverageLabel(stats?.class_average);

  return (
    <div className="page-content">
      <div className="dashboard-main">

        {/* ── Greeting ── */}
        <header className="dashboard-title-row">
          <div>
            <h1>Welcome back, {user?.first_name || 'Instructor'}!</h1>
            <p className="dashboard-subtitle">Here's an overview of your classes.</p>
          </div>
        </header>

        {/* ── 5 Stat Cards ── */}
        <div className="instructor-stats-row">

          <div className="instructor-stat-card">
            <p className="instructor-stat-label">MY COURSES</p>
            <p className="instructor-stat-value">
              {stats?.my_courses ?? courses.length}
            </p>
          </div>

          <div className="instructor-stat-card">
            <p className="instructor-stat-label">TOTAL STUDENTS</p>
            <p className="instructor-stat-value">
              {stats?.total_students ?? courses.reduce((sum, c) => sum + (c.students_count || 0), 0)}
            </p>
          </div>

          <div className="instructor-stat-card">
            <p className="instructor-stat-label">PENDING GRADING</p>
            <p className="instructor-stat-value">
              {stats?.pending_grading != null ? stats.pending_grading : '—'}
            </p>
          </div>

          <div className="instructor-stat-card">
            <p className="instructor-stat-label">CLASS AVERAGE</p>
            <p className="instructor-stat-value">
              {stats?.class_average != null ? stats.class_average.toFixed(1) : '—'}
            </p>
            {avgLabel && (
              <p className="instructor-stat-sub" style={{ color: avgLabel.color }}>
                {avgLabel.label}
              </p>
            )}
          </div>

          <div className="instructor-stat-card">
            <p className="instructor-stat-label">AT-RISK STUDENTS</p>
            <p className="instructor-stat-value instructor-stat-value--risk">
              {stats?.at_risk_students ?? '—'}
            </p>
            {(stats?.at_risk_students ?? 0) > 0 && (
              <p className="instructor-stat-sub" style={{ color: '#ef4444' }}>
                Needs attention
              </p>
            )}
          </div>

        </div>

        {/* ── Your Courses ── */}
        <div className="instructor-section-header">
          <h2 className="instructor-section-title">Your Courses</h2>
          <Link to="/instructor/courses" className="instructor-view-all">
            View all →
          </Link>
        </div>

        <div className="courses-list" style={{ marginBottom: '32px' }}>
          {courses.length === 0 ? (
            <div className="empty-card">No courses assigned yet.</div>
          ) : (
            courses.slice(0, 3).map((course, idx) => {
              const theme = courseColors[idx % courseColors.length];
              const to = course.id?.toString().startsWith('dummy')
                ? '/instructor/courses'
                : `/instructor/courses/${course.id}`;
              return (
                <Link key={course.id} to={to} className="course-card">
                  <div className="course-card-left" style={{ background: theme.bg }}>
                    {theme.icon}
                  </div>
                  <div className="course-card-content">
                    <h2>{course.name}</h2>
                    <p>{course.code}{course.section ? ` - ${course.section}` : ''}</p>
                    <small>{course.students_count || 0} students enrolled</small>
                  </div>
                  <div className="course-card-action" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                  </div>
                </Link>
              );
            })
          )}
          {courses.length > 3 && (
            <Link to="/instructor/courses" className="instructor-view-more">
              + {courses.length - 3} more course{courses.length - 3 !== 1 ? 's' : ''} — View all
            </Link>
          )}
        </div>

        {/* ── Bottom Two-Column Section ── */}
        <div className="instructor-bottom-grid">

          {/* Recent Submissions */}
          <div className="instructor-panel">
            <div className="instructor-panel-header">
              <h2 className="instructor-section-title">Recent Submissions</h2>
              <Link to="/instructor/grading" className="instructor-view-all">
                View all →
              </Link>
            </div>
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>AI SCORE</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="sub-student-name">{sub.student_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="sub-score">
                          {sub.score} / {sub.total}
                        </span>
                        <span className={`sub-badge sub-badge--${sub.status === 'Reviewed' ? 'reviewed' : 'pending'}`}>
                          {sub.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Predictive Analytics */}
          <div className="instructor-panel">
            <div className="instructor-panel-header">
              <h2 className="instructor-section-title">
                Predictive Analytics — At-Risk Students
              </h2>
              <Link to="/instructor/students" className="instructor-view-all">
                View all →
              </Link>
            </div>
            <div className="at-risk-list">
              {atRisk.map((student) => (
                <div key={student.id} className="at-risk-item">
                  <AvatarCircle initials={student.avatar_initials} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p className="at-risk-name">{student.name}</p>
                      <p className="at-risk-score">Risk Score: {student.risk_score}%</p>
                    </div>
                    <p className="at-risk-course">{student.course}</p>
                    <RiskBar score={student.risk_score} level={student.risk_level} />
                  </div>
                  <ArrowForwardIosIcon sx={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, ml: 1 }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}