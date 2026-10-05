import { useRef } from 'react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextStore';
import api from '../../services/api';
import logo from '../../assets/logo copy.png';

/* ── Course search dropdown (reused from DashboardLayout) ── */
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
        : filtered.map(course => (
          <button key={course.id} className="search-dropdown-item" onClick={() => onSelect(course)}>
            <div className="search-dropdown-info">
              <p className="search-dropdown-name">{course.name}</p>
              <p className="search-dropdown-meta">{course.code}</p>
            </div>
          </button>
        ))
      }
    </div>
  );
}

export default function AdminLayout({ children }) {
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

  const handleSearchSelect = () => { setSearchQuery(''); setSearchOpen(false); navigate('/admin/courses'); };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;

  // Determine active nav from pathname
  const path = location.pathname;
  const activeNav =
    path === '/admin' || path === '/admin/courses' ? '/admin' :
    path.startsWith('/admin/users') ? '/admin/users' :
    path.startsWith('/admin/reports') ? '/admin/reports' : '/admin';

  const pageLabel =
    path === '/admin' || path === '/admin/courses' ? 'Dashboard' :
    path.startsWith('/admin/users') ? 'Users' :
    path.startsWith('/admin/reports') ? 'Reports' :
    path.startsWith('/admin/courses/create') ? 'New Course' : 'Dashboard';

  return (
    <div className="adm-app">
      {sidebarOpen && <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`adm-sidebar ${sidebarOpen ? 'adm-sidebar--open' : ''}`}>
        <svg className="adm-sidebar-waves" viewBox="0 0 264 900" preserveAspectRatio="none" aria-hidden="true">
          <path d="M264,120 C160,180 210,420 90,520 C10,585 40,760 -20,860 L-20,900 L264,900 Z" fill="rgba(93,122,255,0.08)"/>
          <path d="M264,340 C190,400 220,580 130,660 C70,712 90,820 40,900 L264,900 Z" fill="rgba(255,255,255,0.035)"/>
        </svg>

        <div className="adm-brand">
          <span className="adm-brand-logo-wrap">
            <img src={logo} alt="Intellilearn logo" className="adm-brand-logo" />
          </span>
          <span className="adm-brand-name">Intellilearn</span>
        </div>

        <div className="adm-account-card">
          <div className="adm-avatar adm-avatar--sidebar">{initials}</div>
          <div className="adm-account-text">
            <span className="adm-account-name">{user?.first_name} {user?.last_name}</span>
            <span className="adm-account-role">{user?.role}</span>
          </div>
        </div>

        <nav className="adm-nav">
          <Link to="/admin" onClick={() => setSidebarOpen(false)}
            className={`adm-nav-item ${activeNav === '/admin' ? 'adm-nav-item--active' : ''}`}>
            <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/users" onClick={() => setSidebarOpen(false)}
            className={`adm-nav-item ${activeNav === '/admin/users' ? 'adm-nav-item--active' : ''}`}>
            <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Users</span>
          </Link>
          <Link to="/admin/courses" onClick={() => setSidebarOpen(false)}
            className="adm-nav-item">
            <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span>Courses</span>
          </Link>
          <Link to="/admin/reports" onClick={() => setSidebarOpen(false)}
            className={`adm-nav-item ${activeNav === '/admin/reports' ? 'adm-nav-item--active' : ''}`}>
            <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M4 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Reports</span>
          </Link>
        </nav>

        <button className="adm-logout-btn" onClick={handleLogout}>
          <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Log out</span>
        </button>
      </aside>

      {/* Main */}
      <main className="adm-main">
        <header className="adm-topbar">
          <button className="adm-topbar-toggle" onClick={() => setSidebarOpen(v => !v)}>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <h1 className="adm-page-title">{pageLabel}</h1>
          <div className="adm-topbar-right">
            <div className="adm-search" ref={searchRef} style={{ position: 'relative' }}>
              <svg className="adm-search-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="Search courses..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); } }}
              />
              {searchOpen && searchQuery.trim() && (
                <CourseSearchDropdown
                  query={searchQuery} courses={allCourses}
                  onSelect={handleSearchSelect}
                  onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
                />
              )}
            </div>
            <div className="adm-topbar-user">
              <div className="adm-avatar adm-avatar--topbar">{initials}</div>
              <div className="adm-account-text">
                <span className="adm-account-name adm-account-name--dark">{user?.first_name} {user?.last_name}</span>
                <span className="adm-account-email">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="adm-content">
          {children}
        </div>
      </main>
    </div>
  );
}
