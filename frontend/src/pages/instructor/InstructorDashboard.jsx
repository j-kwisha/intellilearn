import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextStore';
import api from '../../services/api';
import logo from '../../assets/logo copy.png';
import instructorMascot from '../../assets/instructor_db_profile.png';

// ── dummy data (shown while loading) ──
const DUMMY_STATS = { my_courses: 0, total_students: 0, pending_grading: null, class_average: null, at_risk_students: 0 };
const DUMMY_COURSES = [], DUMMY_SUBMISSIONS = [], DUMMY_AT_RISK = [];

const courseIconColors = [
  { bg: '#dbeafe', color: '#1d4ed8' },   // deep blue
  { bg: '#ede9fe', color: '#5b21b6' },   // deep purple
  { bg: '#fef3c7', color: '#92400e' },   // deep amber
  { bg: '#d1fae5', color: '#065f46' },   // deep green
  { bg: '#fce7f3', color: '#9d174d' },   // deep pink
];

const courseIconSvg = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

function classAverageLabel(avg) {
  if (avg == null) return null;
  if (avg >= 90) return 'Excellent';
  if (avg >= 80) return 'Above target';
  if (avg >= 70) return 'On target';
  return 'Below target';
}

// ── Sidebar ──
function InstructorSidebar({ user, onLogout, location }) {
  const navItems = [
    { label: 'Dashboard', path: '/instructor', icon: (
      <svg className="instr-nav-icon" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )},
    { label: 'Courses', path: '/instructor/courses', icon: (
      <svg className="instr-nav-icon" viewBox="0 0 24 24" fill="none">
        <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    )},
    { label: 'Students', path: '/instructor/students', icon: (
      <svg className="instr-nav-icon" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )},
    { label: 'Grading', path: '/instructor/grading', icon: (
      <svg className="instr-nav-icon" viewBox="0 0 24 24" fill="none">
        <path d="M22 10 12 5 2 10l10 5 10-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M6 12v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    )},
    { label: 'Profile', path: '/instructor/profile', icon: (
      <svg className="instr-nav-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M4 20c0-3.9 3.6-6 8-6s8 2.1 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )},
  ];

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;

  return (
    <aside className="instr-sidebar">
      <svg className="instr-sidebar-waves" viewBox="0 0 264 900" preserveAspectRatio="none" aria-hidden="true">
        <path d="M264,120 C160,180 210,420 90,520 C10,585 40,760 -20,860 L-20,900 L264,900 Z" fill="rgba(255,255,255,0.05)"/>
        <path d="M264,340 C190,400 220,580 130,660 C70,712 90,820 40,900 L264,900 Z" fill="rgba(255,255,255,0.03)"/>
      </svg>
      <div className="instr-brand">
        <span className="instr-brand-logo-wrap">
          <img src={logo} alt="Intellilearn logo" className="instr-brand-logo" />
        </span>
        <span className="instr-brand-name">Intellilearn</span>
      </div>
      <div className="instr-account-card">
        <div className="instr-avatar instr-avatar--sidebar">{initials}</div>
        <div className="instr-account-text">
          <span className="instr-account-name">{user?.first_name} {user?.last_name}</span>
          <span className="instr-account-role">Instructor</span>
        </div>
      </div>
      <nav className="instr-nav">
        {navItems.map(item => (
          <Link key={item.path} to={item.path}
            className={`instr-nav-item ${location === item.path ? 'instr-nav-item--active' : ''}`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <button className="instr-logout-btn" onClick={onLogout}>
        <svg className="instr-nav-icon" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Log out</span>
      </button>
    </aside>
  );
}

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]             = useState(DUMMY_STATS);
  const [courses, setCourses]         = useState(DUMMY_COURSES);
  const [submissions, setSubmissions] = useState(DUMMY_SUBMISSIONS);
  const [atRisk, setAtRisk]           = useState(DUMMY_AT_RISK);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen]   = useState(false);
  const [expandedCourses, setExpandedCourses] = useState({}); // Track which courses are expanded
  const searchRef                     = useRef(null);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  // Toggle course expansion in at-risk section
  const toggleCourseExpansion = (courseName) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseName]: !prev[courseName]
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const coursesRes = await api.get('/courses');
        const courseList = coursesRes.data.courses || [];
        if (courseList.length > 0) setCourses(courseList);

        try {
          const statsRes = await api.get('/instructor/stats');
          if (statsRes.data) setStats(statsRes.data);
        } catch {
          const totalStudents = courseList.reduce((sum, c) => sum + (c.students_count || 0), 0);
          setStats(prev => ({ ...prev, my_courses: courseList.length, total_students: totalStudents }));
        }

        try {
          const subRes = await api.get('/instructor/submissions/recent');
          if (subRes.data?.submissions?.length > 0) setSubmissions(subRes.data.submissions);
        } catch { /* Optional dashboard data is unavailable. */ }

        // Fetch at-risk students — try AI endpoint per course, fall back gracefully
        const riskStudents = [];
        for (const course of courseList) {
          try {
            const riskRes = await api.get(`/ai/courses/${course.id}/student-risk`);
            const results = riskRes.data?.results || [];
            results.forEach((r) => {
              const name = `${r.student.first_name} ${r.student.last_name}`;
              const m = r.metrics || {};

              // AI service gave a confirmed at-risk prediction
              if (r.status === 'assessed' && r.at_risk === true) {
                riskStudents.push({
                  id: `${course.id}-${r.student.id}`,
                  name,
                  course: `${course.code}${course.section ? ' - ' + course.section : ''}`,
                  risk_score: Math.round((r.risk_probability ?? 0) * 100),
                  risk_level: (r.risk_probability ?? 0) >= 0.7 ? 'High Risk' : 'Medium',
                  initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                  reasons: r.reasons || [],
                });
                return;
              }

              // AI service down or student not assessed — use same thresholds as /instructor/stats
              // quiz_avg < 70 || submission_rate < 0.6 || missed_tasks > 3
              const quizAtRisk = m.quiz_avg != null && m.quiz_avg < 70;
              const rateAtRisk = m.submission_rate != null && m.submission_rate < 0.6;
              const missedAtRisk = m.missed_tasks != null && m.missed_tasks > 3;

              if (quizAtRisk || rateAtRisk || missedAtRisk) {
                const reasons = [];
                if (quizAtRisk) reasons.push('Low quiz performance');
                if (missedAtRisk) reasons.push('Missed multiple tasks');
                if (rateAtRisk) reasons.push('Low submission rate');

                const estimatedScore = Math.min(95, Math.round(
                  (quizAtRisk ? ((70 - Math.min(70, m.quiz_avg)) / 70) * 40 : 0) +
                  (rateAtRisk ? ((1 - Math.min(1, m.submission_rate)) * 35) : 0) +
                  (missedAtRisk ? (Math.min(m.missed_tasks, 6) / 6) * 25 : 0)
                ));

                riskStudents.push({
                  id: `${course.id}-${r.student.id}`,
                  name,
                  course: `${course.code}${course.section ? ' - ' + course.section : ''}`,
                  risk_score: estimatedScore,
                  risk_level: estimatedScore >= 55 ? 'High Risk' : 'Medium',
                  initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                  reasons,
                });
              }
            });
          } catch {
            // This course's AI endpoint failed — skip it, don't kill the whole loop
          }
        }

        if (riskStudents.length > 0) setAtRisk(riskStudents);
        // Sync the at-risk count with what we actually found
        // (if AI found more/less than stats endpoint, show actual list count)
        setStats(prev => ({
          ...prev,
          at_risk_students: riskStudents.length > 0 ? riskStudents.length : (prev.at_risk_students ?? 0),
        }));

      } catch (err) {
        console.warn('Instructor dashboard API unavailable.', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="instr-app">
        <InstructorSidebar user={user} onLogout={handleLogout} location="/instructor" />
        <main className="instr-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </main>
      </div>
    );
  }

  const avgLabel = classAverageLabel(stats?.class_average);
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;

  return (
    <div className="instr-app">
      <InstructorSidebar user={user} onLogout={handleLogout} location="/instructor" />

      <main className="instr-main">
        {/* Topbar */}
        <header className="instr-topbar">
          <h1 className="instr-page-title">Dashboard</h1>
          <div className="instr-topbar-right">
            {/* Search with live dropdown */}
            <div className="instr-search" ref={searchRef} style={{ position: 'relative' }}>
              <svg className="instr-search-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); } }}
                autoComplete="off"
              />
              {/* Dropdown */}
              {searchOpen && searchQuery.trim() && (() => {
                const q = searchQuery.trim().toLowerCase();
                const results = courses.filter(c =>
                  c.name?.toLowerCase().includes(q) ||
                  c.code?.toLowerCase().includes(q)
                );
                return (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                    background: '#fff', border: '1px solid #d8e6dd', borderRadius: 14,
                    boxShadow: '0 8px 30px rgba(15,35,25,0.14)', zIndex: 999,
                    overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
                  }}>
                    {results.length === 0 ? (
                      <div style={{ padding: '14px 18px', fontSize: 14, color: '#8b988f', fontFamily: 'Inter,sans-serif' }}>
                        No courses match "{searchQuery.trim()}"
                      </div>
                    ) : (
                      results.map((course, idx) => {
                        const c = courseIconColors[idx % courseIconColors.length];
                        return (
                          <button
                            key={course.id}
                            onMouseDown={e => {
                              e.preventDefault(); // prevent blur before click
                              setSearchQuery('');
                              setSearchOpen(false);
                              navigate(`/instructor/courses/${course.id}`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              width: '100%', padding: '10px 16px',
                              background: 'none', border: 'none',
                              borderBottom: '1px solid #f0f7f3',
                              cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5faf7'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: c.bg, color: c.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                                <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                                <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#16241d', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.name}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8b988f', fontFamily: 'Inter,sans-serif' }}>{course.code}{course.instructor ? ` · ${course.instructor.first_name} ${course.instructor.last_name}` : ''}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="instr-topbar-user">
              <div className="instr-avatar instr-avatar--topbar">{initials}</div>
              <div className="instr-account-text">
                <span className="instr-account-name instr-account-name--dark">{user?.first_name} {user?.last_name}</span>
                <span className="instr-account-email">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Welcome banner */}
        <section className="instr-welcome-banner">
          <div className="instr-welcome-bg">
            <svg className="instr-banner-waves" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,150 C150,190 300,110 480,140 C660,170 780,120 960,145 C1080,162 1140,150 1200,160 L1200,220 L0,220 Z" fill="rgba(255,255,255,0.05)"/>
              <path d="M0,175 C180,210 360,150 540,170 C720,190 840,155 1020,172 C1110,180 1160,175 1200,182 L1200,220 L0,220 Z" fill="rgba(255,255,255,0.045)"/>
            </svg>
          </div>
          <div className="instr-welcome-text">
            <h2>Welcome back, <span className="instr-accent">{user?.first_name || 'Jane'}!</span></h2>
            <p>Here's an overview of your classes.</p>
          </div>
          <div className="instr-mascot-wrap">
            <img src={instructorMascot} alt="Intellilearn instructor mascot" className="instr-mascot" />
          </div>
          <svg className="instr-sparkle instr-sparkle--1" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="#b8f2d1"/>
          </svg>
          <svg className="instr-sparkle instr-sparkle--2" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="#b8f2d1"/>
          </svg>
          <svg className="instr-sparkle instr-sparkle--3" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="#b8f2d1"/>
          </svg>
        </section>

        {/* Overview heading + stat cards */}
        <section style={{ padding: '0 40px', marginBottom: '36px' }}>
          <h3 className="instr-section-heading" style={{ margin: '0 0 20px' }}>Overview</h3>
          <div className="instr-stat-grid" style={{ margin: 0 }}>
          {/* My Courses */}
          <div className="instr-stat-card instr-stat-card--slate">
            <svg className="instr-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="instr-stat-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            </div>
            <div className="instr-stat-body">
              <span className="instr-stat-label">MY COURSES</span>
              <span className="instr-stat-value">{stats?.my_courses ?? courses.length}</span>
            </div>
          </div>

          {/* Total Students */}
          <div className="instr-stat-card instr-stat-card--purple">
            <svg className="instr-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="instr-stat-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div className="instr-stat-body">
              <span className="instr-stat-label">TOTAL STUDENTS</span>
              <span className="instr-stat-value">{stats?.total_students ?? courses.reduce((s,c) => s + (c.students_count||0), 0)}</span>
            </div>
          </div>

          {/* Pending Grading */}
          <div className="instr-stat-card instr-stat-card--amber">
            <svg className="instr-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="instr-stat-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M7 3h8l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="instr-stat-body">
              <span className="instr-stat-label">PENDING GRADING</span>
              <span className="instr-stat-value">{stats?.pending_grading != null ? stats.pending_grading : '0'}</span>
            </div>
          </div>

          {/* Class Average */}
          <div className="instr-stat-card instr-stat-card--blue">
            <svg className="instr-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="instr-stat-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 20.1l1.4-6.3-4.8-4.3 6.4-.6L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            </div>
            <div className="instr-stat-body">
              <span className="instr-stat-label">CLASS AVERAGE</span>
              <span className="instr-stat-value">{stats?.class_average != null ? stats.class_average.toFixed(1) : '100'}</span>
              {avgLabel && <span className="instr-stat-sub">{avgLabel}</span>}
            </div>
          </div>

          {/* At-Risk Students */}
          <div className="instr-stat-card instr-stat-card--maroon">
            <svg className="instr-card-wave" viewBox="0 0 400 140" preserveAspectRatio="none">
              <path d="M0,90 C60,120 120,70 190,90 C260,110 320,80 400,95 L400,140 L0,140 Z" fill="rgba(255,255,255,0.10)"/>
              <path d="M0,110 C70,135 140,100 210,112 C280,124 340,105 400,115 L400,140 L0,140 Z" fill="rgba(255,255,255,0.08)"/>
            </svg>
            <div className="instr-stat-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="17" r="0.9" fill="currentColor"/></svg>
            </div>
            <div className="instr-stat-body">
              <span className="instr-stat-label">AT-RISK STUDENTS</span>
              <span className="instr-stat-value">{stats?.at_risk_students ?? '—'}</span>
              {(stats?.at_risk_students ?? 0) > 0 && <span className="instr-stat-sub">Needs attention</span>}
            </div>
          </div>
        </div>
        </section>

        {/* Your Courses */}
        <div className="instr-section-header-row">
          <h3 className="instr-section-heading" style={{ marginBottom: 0 }}>Your Courses</h3>
          <Link to="/instructor/courses" className="instr-view-all-link">
            View all
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>

        <div className="instr-course-row-list" style={{ marginBottom: '28px' }}>
          {courses.length === 0 ? (
            <div className="instr-tab-empty">No courses assigned yet.</div>
          ) : (
            courses.slice(0, 3).map((course, idx) => {
              const c = courseIconColors[idx % courseIconColors.length];
              const to = `/instructor/courses/${course.id}`;
              return (
                <Link key={course.id} to={to} className="instr-course-row">
                  <div className="instr-course-row-icon" style={{ background: c.bg, color: c.color }}>
                    {courseIconSvg}
                  </div>
                  <div className="instr-course-row-body">
                    <span className="instr-course-row-name">{course.name}</span>
                    <span className="instr-course-row-meta">{course.code}{course.section ? ` - ${course.section}` : ''}</span>
                    <span className="instr-course-row-enrolled">{course.students_count || 0} students enrolled</span>
                  </div>
                  <div className="instr-course-row-arrow">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Bottom two-column: Submissions + At-Risk */}
        <div className="instr-insights-grid">
          {/* Recent Submissions */}
          <div className="instr-insight-panel">
            <div className="instr-insight-panel-header">
              <h3>Recent Submissions</h3>
              <Link to="/instructor/grading" className="instr-view-all-link">
                View all
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
            <table className="instr-submissions-table">
              <thead>
                <tr><th>STUDENT</th><th>AI SCORE</th></tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 600, color: 'var(--instr-ink)' }}>{sub.student_name}</td>
                    <td>
                      <span style={{ marginRight: 8, color: 'var(--instr-ink-soft)', fontSize: '14px' }}>{sub.score} / {sub.total}</span>
                      <span className={`instr-sub-badge ${sub.status === 'Reviewed' ? 'instr-sub-badge--reviewed' : 'instr-sub-badge--pending'}`}>{sub.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {submissions.length === 0 && (
              <div className="instr-submissions-empty">No recent submissions yet.</div>
            )}
          </div>

          {/* At-Risk */}
          <div className="instr-insight-panel">
            <div className="instr-insight-panel-header">
              <h3>Predictive Analytics — At-Risk Students by Course</h3>
              <Link to="/instructor/students" className="instr-view-all-link">
                View all
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
            {atRisk.length === 0 ? (
              <div style={{ padding: '28px 4px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                {(stats?.at_risk_students ?? 0) > 0 ? (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--instr-muted)', margin: '0 0 6px' }}>
                      Loading student risk data…
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--instr-muted)', margin: 0 }}>
                      The analytics service may be starting up. Try refreshing in a moment.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--instr-muted)', margin: 0 }}>
                    No students are currently identified as at risk.
                  </p>
                )}
              </div>
            ) : (
              <div className="instr-risk-list">
                {(() => {
                  // Group at-risk students by course
                  const groupedByCourse = atRisk.reduce((groups, student) => {
                    const course = student.course;
                    if (!groups[course]) groups[course] = [];
                    groups[course].push(student);
                    return groups;
                  }, {});

                  return Object.entries(groupedByCourse).map(([courseName, students]) => {
                    const isExpanded = expandedCourses[courseName] || false;
                    
                    return (
                      <div key={courseName} style={{ marginBottom: '12px' }}>
                        {/* Clickable Course header with dropdown arrow */}
                        <button
                          onClick={() => toggleCourseExpansion(courseName)}
                          style={{ 
                            width: '100%',
                            padding: '12px 16px', 
                            background: 'linear-gradient(135deg, #f0f7f3 0%, #e6f3ea 100%)',
                            borderRadius: '8px',
                            marginBottom: isExpanded ? '8px' : '0',
                            border: '1px solid #d1e7d7',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #e6f3ea 0%, #d1e7d7 100%)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #f0f7f3 0%, #e6f3ea 100%)';
                          }}
                        >
                          <h4 style={{ 
                            margin: 0, 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: '#065f46',
                            fontFamily: 'Poppins, sans-serif'
                          }}>
                            {courseName} ({students.length} at-risk student{students.length !== 1 ? 's' : ''})
                          </h4>
                          
                          {/* Dropdown arrow */}
                          <svg 
                            style={{ 
                              width: '16px', 
                              height: '16px', 
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              color: '#065f46'
                            }} 
                            viewBox="0 0 24 24" 
                            fill="none"
                          >
                            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        
                        {/* Collapsible students list */}
                        {isExpanded && (
                          <div style={{ 
                            background: '#fafcfb',
                            borderRadius: '8px',
                            border: '1px solid #e6f3ea',
                            overflow: 'hidden'
                          }}>
                            {students.map((student, index) => {
                              const isHigh = student.risk_level === 'High Risk';
                              const barColor = isHigh ? '#e0453c' : '#f0a020';
                              const badgeStyle = isHigh
                                ? { background: '#fdecec', color: '#e0453c' }
                                : { background: '#fbf0d9', color: '#b9790f' };
                              return (
                                <Link 
                                  to="/instructor/students" 
                                  key={student.id} 
                                  className="instr-risk-row"
                                  style={{
                                    borderBottom: index < students.length - 1 ? '1px solid #e6f3ea' : 'none',
                                    margin: 0,
                                    borderRadius: 0
                                  }}
                                >
                                  <div className="instr-risk-avatar">{student.initials}</div>
                                  <div className="instr-risk-body">
                                    <div className="instr-risk-top">
                                      <span className="instr-risk-name">{student.name}</span>
                                      <span className="instr-risk-score">Risk Score: {student.risk_score}%</span>
                                    </div>
                                    <div className="instr-risk-bar-row">
                                      <div className="instr-risk-bar-track">
                                        <div style={{ width: `${student.risk_score}%`, height: '100%', background: barColor, borderRadius: '999px' }} />
                                      </div>
                                      <span className="instr-risk-badge" style={badgeStyle}>{student.risk_level}</span>
                                    </div>
                                    {student.reasons && student.reasons.length > 0 && (
                                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {student.reasons.map((r, i) => (
                                          <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#fef9c3', color: '#854d0e', fontFamily: 'Inter,sans-serif' }}>
                                            {r}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <svg className="instr-risk-chevron" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
