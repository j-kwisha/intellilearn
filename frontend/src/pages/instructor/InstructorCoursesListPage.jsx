import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import logo from '../../assets/logo copy.png';

const courseIconColors = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#fce7f3', color: '#9d174d' },
];

const courseIconSvg = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

function ActionMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="instr-action-cell" ref={ref} onClick={e => e.preventDefault()}>
      <button className="instr-row-menu" onClick={() => setOpen(v => !v)} aria-label="More actions">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.6" fill="currentColor"/>
        </svg>
      </button>
      <div className={`instr-action-menu ${open ? 'instr-action-menu--open' : ''}`}>
        <button type="button" className="danger" onClick={() => { setOpen(false); onDelete(); }}>Delete</button>
      </div>
    </div>
  );
}

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
        <span className="instr-brand-logo-wrap"><img src={logo} alt="Intellilearn logo" className="instr-brand-logo" /></span>
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
            {item.icon}<span>{item.label}</span>
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

export default function InstructorCoursesListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const fetchCourses = () => {
    api.get('/courses')
      .then((res) => setCourses(res.data.courses || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = async (courseId, courseName) => {
    if (!confirm(`Are you sure you want to delete "${courseName}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/courses/${courseId}`);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete course.');
    }
  };

  if (loading) {
    return (
      <div className="instr-app">
        <InstructorSidebar user={user} onLogout={handleLogout} location="/instructor/courses" />
        <main className="instr-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </main>
      </div>
    );
  }

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;

  return (
    <div className="instr-app">
      <InstructorSidebar user={user} onLogout={handleLogout} location="/instructor/courses" />

      <main className="instr-main">
        {/* Topbar */}
        <header className="instr-topbar">
          <h1 className="instr-page-title">Courses</h1>
          <div className="instr-topbar-right">
            <div className="instr-search">
              <svg className="instr-search-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="Search courses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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

        {/* Page header — amber left border */}
        <section className="instr-page-header">
          <div className="instr-page-header-text">
            <h2>My Courses</h2>
            <p>Manage and track your classes.</p>
          </div>
          <button className="instr-new-course-btn" onClick={() => navigate('/instructor/courses/create')}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            Create Course
          </button>
        </section>

        {/* Course cards */}
        <div className="instr-course-card-list">
          {courses.length === 0 ? (
            <div className="instr-tab-empty">No courses assigned yet.</div>
          ) : (
            courses
              .filter(c => !searchQuery || `${c.name} ${c.code}`.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((course, idx) => {
                const col = courseIconColors[idx % courseIconColors.length];
                return (
                  <Link key={course.id} to={`/instructor/courses/${course.id}`}
                    className={`instr-course-card instr-course-card--${['blue','purple','amber','blue','green'][idx % 5]}`}>
                    <div className="instr-course-card-icon" style={{ background: col.bg, color: col.color }}>
                      {courseIconSvg}
                    </div>
                    <div className="instr-course-card-body">
                      <span className="instr-course-card-name">{course.name}</span>
                      <span className="instr-course-card-meta">{course.code}{course.section ? ` - ${course.section}` : ''}</span>
                      <span className="instr-course-card-enrolled">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        {course.students_count || 0} students enrolled
                      </span>
                    </div>
                    <div className="instr-course-card-right">
                      <span className="instr-status instr-status--active"><i></i>Active</span>
                      <ActionMenu onDelete={() => handleDelete(course.id, course.name)} />
                    </div>
                  </Link>
                );
              })
          )}
        </div>
      </main>
    </div>
  );
}
