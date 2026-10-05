import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import mascot from '../../assets/mascot.png';

/* ── Row action menu ── */
function ActionMenu({ onDelete, deleting }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="adm-action-cell" ref={ref}>
      <button
        className="adm-row-menu"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.6" fill="currentColor"/>
        </svg>
      </button>
      <div className={`adm-action-menu ${open ? 'adm-action-menu--open' : ''}`}>
        <button
          type="button"
          className="adm-action-delete danger"
          onClick={() => { setOpen(false); onDelete(); }}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchCourses = () => {
    api.get('/courses')
      .then((res) => setCourses(res.data.courses))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = async (course) => {
    if (!confirm(`Delete "${course.name}"? This will remove all lessons, assessments, and enrollments. This cannot be undone.`)) return;
    setDeleting(course.id);
    try {
      await api.delete(`/courses/${course.id}`);
      setCourses(prev => prev.filter(c => c.id !== course.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete course.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalStudents = courses.reduce((sum, c) => sum + (c.students_count || 0), 0);
  const activeCourses = courses.filter((c) => c.status === 'active').length;

  return (
    <>
      {/* ===== Welcome Banner ===== */}
      <section className="adm-welcome-banner">
        <div className="adm-welcome-bg">
          <svg className="adm-banner-waves" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,150 C150,190 300,110 480,140 C660,170 780,120 960,145 C1080,162 1140,150 1200,160 L1200,220 L0,220 Z" fill="rgba(255,255,255,0.05)"/>
            <path d="M0,175 C180,210 360,150 540,170 C720,190 840,155 1020,172 C1110,180 1160,175 1200,182 L1200,220 L0,220 Z" fill="rgba(255,255,255,0.045)"/>
          </svg>
        </div>
        <div className="adm-welcome-text">
          <h2>Welcome back, <span className="adm-accent">Admin.</span></h2>
          <p>Here's what's happening across Intellilearn today.</p>
        </div>
        <div className="adm-mascot-wrap">
          <img src={mascot} alt="Intellilearn mascot" className="adm-mascot" />
        </div>
        <svg className="adm-sparkle" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="#f5a524"/>
        </svg>
      </section>

      {/* ===== Overview ===== */}
      <section className="adm-overview">
        <h3 className="adm-section-heading">Overview</h3>
        <div className="adm-stat-grid">
          {/* Total Courses */}
          <div className="adm-stat-card adm-stat-card--blue">
            <svg className="adm-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="adm-stat-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="adm-stat-body">
              <span className="adm-stat-label">Total Courses</span>
              <span className="adm-stat-value">{courses.length}</span>
            </div>
          </div>

          {/* Total Students */}
          <div className="adm-stat-card adm-stat-card--green">
            <svg className="adm-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="adm-stat-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="adm-stat-body">
              <span className="adm-stat-label">Total Students</span>
              <span className="adm-stat-value">{totalStudents}</span>
            </div>
          </div>

          {/* Active Courses */}
          <div className="adm-stat-card adm-stat-card--amber">
            <svg className="adm-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="adm-stat-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22 10 12 5 2 10l10 5 10-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M6 12v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="adm-stat-body">
              <span className="adm-stat-label">Active Courses</span>
              <span className="adm-stat-value">{activeCourses}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Courses Panel ===== */}
      <section className="adm-courses-panel">
        <div className="adm-panel-header">
          <h3 className="adm-panel-title">
            <svg viewBox="0 0 24 24" fill="none" className="adm-panel-icon">
              <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
            All Courses
          </h3>
          <Link to="/admin/courses/create" className="adm-new-course-btn">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            New Course
          </Link>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-courses-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Instructor</th>
                <th>Students</th>
                <th>Status</th>
                <th className="adm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="courseRows">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <span className="adm-course-name">{course.name}</span>
                    <span className="adm-course-code">{course.code}</span>
                  </td>
                  <td>{course.instructor?.first_name} {course.instructor?.last_name}</td>
                  <td>{course.students_count || 0}</td>
                  <td>
                    <span className={`adm-status adm-status--${course.status === 'active' ? 'active' : 'inactive'}`}>
                      {course.status === 'active' && <i></i>}
                      {course.status === 'active' ? 'Active' : course.status}
                    </span>
                  </td>
                  <td className="adm-th-actions">
                    <ActionMenu
                      onDelete={() => handleDelete(course)}
                      deleting={deleting === course.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--adm-muted)', padding: '40px 0', fontFamily: 'Inter, sans-serif', fontSize: '14.5px' }}>
              No courses yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
