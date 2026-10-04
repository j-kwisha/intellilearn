import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import logo from '../../assets/logo copy.png';

const NAV = [
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

function CourseSearchDropdown({ query, courses, onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  const filtered = courses.filter(c => {
    const q = query.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
  });
  if (!query.trim()) return null;
  return (
    <div ref={ref} className="search-dropdown">
      {filtered.length === 0
        ? <div className="search-dropdown-empty">No courses match "{query}"</div>
        : filtered.map(c => (
          <button key={c.id} className="search-dropdown-item" onClick={() => onSelect(c)}>
            <div className="search-dropdown-info">
              <p className="search-dropdown-name">{c.name}</p>
              <p className="search-dropdown-meta">{c.code}</p>
            </div>
          </button>
        ))
      }
    </div>
  );
}

export default function InstructorLayout({ children, pageTitle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    api.get('/courses').then(res => setAllCourses(res.data.courses || [])).catch(() => {});
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleSearchSelect = (course) => {
    setSearchQuery(''); setSearchOpen(false);
    navigate(`/instructor/courses/${course.id}`);
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;
  const AvatarContent = () => user?.avatar
    ? <img src={user.avatar} alt={initials} referrerPolicy="no-referrer" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
    : <>{initials}</>;

  // Active nav: exact match first, then prefix match for sub-routes
  const activePath = NAV.slice().reverse().find(n => location.pathname.startsWith(n.path))?.path || '/instructor';

  // Page title: use prop or derive from nav
  const title = pageTitle || NAV.find(n => n.path === activePath)?.label || 'Dashboard';

  return (
    <div className="instr-app">
      {sidebarOpen && <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`instr-sidebar ${sidebarOpen ? 'instr-sidebar--open' : ''}`}>
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
          <div className="instr-avatar instr-avatar--sidebar"><AvatarContent /></div>
          <div className="instr-account-text">
            <span className="instr-account-name">{user?.first_name} {user?.last_name}</span>
            <span className="instr-account-role">Instructor</span>
          </div>
        </div>

        <nav className="instr-nav">
          {NAV.map(item => (
            <Link key={item.path} to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`instr-nav-item ${activePath === item.path ? 'instr-nav-item--active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button className="instr-logout-btn" onClick={handleLogout}>
          <svg className="instr-nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Log out</span>
        </button>
      </aside>

      <main className="instr-main">
        <header className="instr-topbar">
          <button className="instr-topbar-toggle adm-topbar-toggle" onClick={() => setSidebarOpen(v => !v)}>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <h1 className="instr-page-title">{title}</h1>
          <div className="instr-topbar-right">
            <div className="instr-search" ref={searchRef} style={{ position: 'relative' }}>
              <svg className="instr-search-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="Search courses..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); }}}
              />
              {searchOpen && searchQuery.trim() && (
                <CourseSearchDropdown
                  query={searchQuery} courses={allCourses}
                  onSelect={handleSearchSelect}
                  onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
                />
              )}
            </div>
            <div className="instr-topbar-user">
              <div className="instr-avatar instr-avatar--topbar"><AvatarContent /></div>
              <div className="instr-account-text">
                <span className="instr-account-name instr-account-name--dark">{user?.first_name} {user?.last_name}</span>
                <span className="instr-account-email">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content area with same padding as adm-content */}
        <div style={{ flex: 1, padding: '0 40px 60px', overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
