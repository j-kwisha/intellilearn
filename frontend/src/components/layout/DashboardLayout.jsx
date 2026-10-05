import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextStore';
import api from '../../services/api';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import BarChartIcon from '@mui/icons-material/BarChart';
import SearchIcon from '@mui/icons-material/Search';
import ComputerIcon from '@mui/icons-material/Computer';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ScienceIcon from '@mui/icons-material/Science';
import logo from '../../assets/logo copy.png';
import { useNavigationGuard } from '../../context/NavigationGuardContextStore';

const navItems = {
  student: [
    { label: 'Dashboard',  path: '/student',            icon: <DashboardIcon fontSize="small" /> },
    { label: 'Courses',    path: '/student/courses',     icon: <MenuBookIcon fontSize="small" /> },
    { label: 'Grades',     path: '/student/grades',      icon: <SchoolIcon fontSize="small" /> },
    { label: 'Calendar',   path: '/student/calendar',    icon: <CalendarMonthIcon fontSize="small" /> },
    { label: 'Risk Check', path: '/student/risk-check',  icon: <WarningAmberIcon fontSize="small" /> },
    { label: 'Profile',    path: '/student/profile',     icon: <PersonIcon fontSize="small" /> },
  ],
  instructor: [
    { label: 'Dashboard', path: '/instructor', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Courses', path: '/instructor/courses', icon: <MenuBookIcon fontSize="small" /> },
    { label: 'Students', path: '/instructor/students', icon: <GroupIcon fontSize="small" /> },
    { label: 'Grading', path: '/instructor/grading', icon: <SchoolIcon fontSize="small" /> },
    { label: 'Profile', path: '/instructor/profile', icon: <PersonIcon fontSize="small" /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Users', path: '/admin/users', icon: <GroupIcon fontSize="small" /> },
    { label: 'Courses', path: '/admin/courses', icon: <MenuBookIcon fontSize="small" /> },
    { label: 'Reports', path: '/admin/reports', icon: <BarChartIcon fontSize="small" /> },
  ],
};

const courseColors = [
  { bg: '#EEF3FF', icon: <ComputerIcon fontSize="medium" sx={{ color: '#4c6ef5' }} /> },
  { bg: '#FFF0F9', icon: <SmartToyIcon fontSize="medium" sx={{ color: '#C026D3' }} /> },
  { bg: '#FFF7ED', icon: <EngineeringIcon fontSize="medium" sx={{ color: '#EA580C' }} /> },
  { bg: '#F0FDF4', icon: <AutoStoriesIcon fontSize="medium" sx={{ color: '#16A34A' }} /> },
  { bg: '#EFF6FF', icon: <ScienceIcon fontSize="medium" sx={{ color: '#2563EB' }} /> },
];

const typeIcon = { announcement: '📢', assessment: '📝', material: '📎' };
const typeColor = {
  announcement: 'text-amber-600 bg-amber-50',
  assessment: 'text-indigo-600 bg-indigo-50',
  material: 'text-teal-600 bg-teal-50',
};

/* ── Notification Panel ── */
function NotificationPanel({ onClose }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/student/feed')
      .then(res => setFeed(res.data.feed || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleClick = (item) => {
    onClose();
    if (item.type === 'assessment' && item.course_id && item.item_id) {
      navigate(`/student/courses/${item.course_id}/assessments/${item.item_id}`);
    } else if (item.course_id) {
      navigate(`/student/courses/${item.course_id}`);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm">Notifications</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : feed.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-10">No recent activity.</p>
        ) : (
          feed.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleClick(item)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="flex items-start gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 mt-0.5 ${typeColor[item.type]}`}>
                  {typeIcon[item.type]} {item.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{item.body}</p>
                  <p className="text-xs text-indigo-500 mt-0.5 truncate">{item.course}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(item.created_at).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Course Search Dropdown ── */
function CourseSearchDropdown({ query, courses, onSelect, onClose }) {
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = courses.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      `${c.instructor?.first_name} ${c.instructor?.last_name}`.toLowerCase().includes(q)
    );
  });

  if (!query.trim()) return null;

  return (
    <div ref={dropdownRef} className="search-dropdown">
      {filtered.length === 0 ? (
        <div className="search-dropdown-empty">No courses match "{query}"</div>
      ) : (
        filtered.map((course, idx) => {
          const theme = courseColors[idx % courseColors.length];
          return (
            <button
              key={course.id}
              className="search-dropdown-item"
              onClick={() => onSelect(course)}
            >
              <div className="search-dropdown-icon" style={{ background: theme.bg }}>
                {theme.icon}
              </div>
              <div className="search-dropdown-info">
                <p className="search-dropdown-name">{course.name}</p>
                <p className="search-dropdown-meta">
                  {course.code}
                  {course.instructor && (
                    <> · {course.instructor.first_name} {course.instructor.last_name}</>
                  )}
                </p>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

/* ── Main Layout ── */
export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { checkGuard } = useNavigationGuard();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const searchRef = useRef(null);

  // Load feed and compute unread count vs last seen
  useEffect(() => {
    if (user?.role !== 'student') return;
    api.get('/student/feed')
      .then(res => {
        const feed = res.data.feed || [];
        const lastSeen = parseInt(localStorage.getItem('notif_last_seen_count') || '0', 10);
        const newCount = Math.max(0, feed.length - lastSeen);
        setUnreadCount(newCount);
      })
      .catch(() => {});
  }, [user]);

  const handleOpenNotif = () => {
    setNotifOpen(v => !v);
    // Mark all as seen — store current total so badge resets
    api.get('/student/feed')
      .then(res => {
        const total = (res.data.feed || []).length;
        localStorage.setItem('notif_last_seen_count', String(total));
        setUnreadCount(0);
      })
      .catch(() => {});
  };

  const items = navItems[user?.role] || [];

  // Load courses once for search
  useEffect(() => {
    api.get('/courses')
      .then(res => setAllCourses(res.data.courses || []))
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSelect = (course) => {
    setSearchQuery('');
    setSearchOpen(false);
    // Navigate based on role
    if (user?.role === 'student') navigate(`/student/courses/${course.id}`);
    else if (user?.role === 'instructor') navigate(`/instructor/courses/${course.id}`);
    else navigate(`/admin/courses`);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setSearchOpen(true);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  /* ── Admin layout — matches reference HTML exactly ── */
  if (user?.role === 'admin') {
    const pageLabel = items.find((i) => i.path === location.pathname)?.label || 'Dashboard';
    const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;
    const avatarContent = user?.avatar
      ? <img src={user.avatar} alt={initials} referrerPolicy="no-referrer" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
      : <span>{initials}</span>;

    return (
      <div className="adm-app">
        {/* === Admin Sidebar === */}
        <aside className={`adm-sidebar ${sidebarOpen ? 'adm-sidebar--open' : ''}`}>
          {sidebarOpen && <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />}

          {/* Decorative waves — exact paths from reference */}
          <svg className="adm-sidebar-waves" viewBox="0 0 264 900" preserveAspectRatio="none" aria-hidden="true">
            <path d="M264,120 C160,180 210,420 90,520 C10,585 40,760 -20,860 L-20,900 L264,900 Z" fill="rgba(93,122,255,0.08)"/>
            <path d="M264,340 C190,400 220,580 130,660 C70,712 90,820 40,900 L264,900 Z" fill="rgba(255,255,255,0.035)"/>
          </svg>

          {/* Brand */}
          <div className="adm-brand">
            <span className="adm-brand-logo-wrap">
              <img src={logo} alt="Intellilearn logo" className="adm-brand-logo" />
            </span>
            <span className="adm-brand-name">Intellilearn</span>
          </div>

          {/* Account card */}
          <div className="adm-account-card">
            <div className="adm-avatar adm-avatar--sidebar">{avatarContent}</div>
            <div className="adm-account-text">
              <span className="adm-account-name">{user?.first_name} {user?.last_name}</span>
              <span className="adm-account-role">{user?.role}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="adm-nav">
            {/* Dashboard */}
            <Link to="/admin" onClick={() => setSidebarOpen(false)}
              className={`adm-nav-item ${location.pathname === '/admin' ? 'adm-nav-item--active' : ''}`}>
              <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
                <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Dashboard</span>
            </Link>
            {/* Users */}
            <Link to="/admin/users" onClick={() => setSidebarOpen(false)}
              className={`adm-nav-item ${location.pathname === '/admin/users' ? 'adm-nav-item--active' : ''}`}>
              <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Users</span>
            </Link>
            {/* Courses */}
            <Link to="/admin/courses" onClick={() => setSidebarOpen(false)}
              className={`adm-nav-item ${location.pathname === '/admin/courses' ? 'adm-nav-item--active' : ''}`}>
              <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
                <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <span>Courses</span>
            </Link>
            {/* Reports */}
            <Link to="/admin/reports" onClick={() => setSidebarOpen(false)}
              className={`adm-nav-item ${location.pathname === '/admin/reports' ? 'adm-nav-item--active' : ''}`}>
              <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
                <path d="M4 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M20 20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Reports</span>
            </Link>
          </nav>

          {/* Logout */}
          <button className="adm-logout-btn" onClick={handleLogout}>
            <svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Log out</span>
          </button>
        </aside>

        {/* === Admin Main === */}
        <main className="adm-main">
          {/* Topbar */}
          <header className="adm-topbar">
            <button className="adm-topbar-toggle" onClick={() => setSidebarOpen(v => !v)}>
              <MenuIcon />
            </button>
            <h1 className="adm-page-title">{pageLabel}</h1>
            <div className="adm-topbar-right">
              {/* Search pill */}
              <div className="adm-search" ref={searchRef} style={{ position: 'relative' }}>
                <svg className="adm-search-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchOpen && searchQuery.trim() && (
                  <CourseSearchDropdown
                    query={searchQuery}
                    courses={allCourses}
                    onSelect={handleSearchSelect}
                    onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
                  />
                )}
              </div>
              {/* User info */}
              <div className="adm-topbar-user">
                <div className="adm-avatar adm-avatar--topbar">{avatarContent}</div>
                <div className="adm-account-text">
                  <span className="adm-account-name adm-account-name--dark">{user?.first_name} {user?.last_name}</span>
                  <span className="adm-account-email">{user?.email}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="adm-content">
            {children}
          </div>
        </main>
      </div>
    );
  }

  /* ── Student / Instructor shared layout (non-admin) ── */
  return (
    <div className="dashboard-shell">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`std-sidebar role-${user?.role || 'student'} ${sidebarOpen ? 'std-sidebar--open' : ''}`}>

        {/* Decorative waves — background layer, same composition as instr-sidebar-waves */}
        <svg className="std-sidebar-waves" viewBox="0 0 264 900" preserveAspectRatio="none" aria-hidden="true">
          <path d="M264,120 C160,180 210,420 90,520 C10,585 40,760 -20,860 L-20,900 L264,900 Z" fill="rgba(255,255,255,0.05)"/>
          <path d="M264,340 C190,400 220,580 130,660 C70,712 90,820 40,900 L264,900 Z" fill="rgba(255,255,255,0.03)"/>
        </svg>

        {/* Brand / Logo */}
        <div className="std-brand">
          <span className="std-brand-logo-wrap">
            <img src={logo} alt="Intellilearn" className="std-brand-logo" />
          </span>
          <span className="std-brand-name">Intellilearn</span>
        </div>

        {/* Profile card */}
        <div className="std-account-card">
          <div className="std-avatar">
            {user?.avatar
              ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
              : <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>
            }
          </div>
          <div className="std-account-text">
            <span className="std-account-name">{user?.first_name} {user?.last_name}</span>
            <span className="std-account-role">{user?.role}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="std-nav">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => {
                if (checkGuard()) { e.preventDefault(); return; }
                setSidebarOpen(false);
              }}
              className={`std-nav-item ${location.pathname === item.path ? 'std-nav-item--active' : ''}`}
            >
              <span className="std-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <button className="std-logout-btn" onClick={handleLogout}>
          <LogoutIcon style={{ width: 19, height: 19, flexShrink: 0 }} />
          <span>Log out</span>
        </button>
      </aside>

      <div className="std-main-layout">
        <header className="topbar">
          <button className="topbar-toggle" onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>

          <div className="topbar-title">
            {items.find((i) => i.path === location.pathname)?.label || 'Dashboard'}
          </div>

          <div className="topbar-search" ref={searchRef} style={{ position: 'relative' }}>
            <SearchIcon
              fontSize="small"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              style={{ paddingLeft: '36px' }}
            />
            {searchOpen && searchQuery.trim() && (
              <CourseSearchDropdown
                query={searchQuery}
                courses={allCourses}
                onSelect={handleSearchSelect}
                onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
              />
            )}
          </div>

          {user?.role === 'student' && (
            <div className="relative">
              <button className="topbar-icon-btn" title="Notifications" onClick={handleOpenNotif}>
                <NotificationsIcon fontSize="small" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700,
                    borderRadius: '99px', minWidth: '18px', height: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif",
                    border: '2px solid white', pointerEvents: 'none',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>
          )}

          <div className="topbar-user">
            <div className="std-avatar" style={{width:40,height:40,fontSize:'13px'}}>
              {user?.avatar
                ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                : <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>
              }
            </div>
            <div>
              <div className="topbar-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="topbar-user-id">{user?.email}</div>
            </div>
          </div>
        </header>

        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}