import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextStore';
import api from '../../services/api';
import AiChatbot from '../../components/shared/AiChatbot';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ComputerIcon from '@mui/icons-material/Computer';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ScienceIcon from '@mui/icons-material/Science';
import PushPinIcon from '@mui/icons-material/PushPin';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import studentProfile from '../../assets/student_db_profile.png';

// ─────────────────────────────────────────────
//  PLACEHOLDER / DUMMY DATA
// ─────────────────────────────────────────────
const DUMMY_STATS = {
  overall_grade: 87.4,
  lessons_done: 14,
  lessons_total: 20,
  pending_tasks: 3,
};

const DUMMY_AI_PATH = {
  description:
    "Based on your Quiz 3 score (62%), IntelliLearn recommends reviewing these topics:",
  topics: [
    "Cybercrime Prevention Act (RA 10175)",
    "Data Privacy Act — Key Provisions",
    "Practice Quiz — IP Laws",
  ],
};

const DUMMY_ANNOUNCEMENTS = [
  {
    id: 'dummy-1',
    title: 'Welcome to WEB101!',
    content: 'Hello everyone! Please review the course syllabus before our first meeting.',
    course_name: 'Introduction to Web Development',
    course_id: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_pinned: true,
  },
  {
    id: 'dummy-2',
    title: 'Quiz 1 Schedule',
    content: 'Quiz 1 covering HTML basics will be held next week. Good luck!',
    course_name: 'Introduction to Web Development',
    course_id: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_pinned: false,
  },
];

const DUMMY_COURSES = [
  { id: 'dummy-c1', name: 'Introduction to Web Dev', code: 'WEB101' },
  { id: 'dummy-c2', name: 'Social & Professional Issues II', code: 'SPI2' },
  { id: 'dummy-c3', name: 'Data Structures & Algorithms', code: 'CS201' },
];
// ─────────────────────────────────────────────

const courseColors = [
  { bg: '#EEF3FF', icon: <ComputerIcon fontSize="small" sx={{ color: '#4c6ef5' }} /> },
  { bg: '#FFF0F9', icon: <SmartToyIcon fontSize="small" sx={{ color: '#C026D3' }} /> },
  { bg: '#FFF7ED', icon: <EngineeringIcon fontSize="small" sx={{ color: '#EA580C' }} /> },
  { bg: '#F0FDF4', icon: <AutoStoriesIcon fontSize="small" sx={{ color: '#16A34A' }} /> },
  { bg: '#EFF6FF', icon: <ScienceIcon fontSize="small" sx={{ color: '#2563EB' }} /> },
];

function getAnnIcon(ann) {
  if (ann.is_pinned)
    return { icon: <PushPinIcon sx={{ fontSize: 15, color: '#f59e0b' }} />, accent: '#f59e0b', iconBg: '#FEF3C7' };
  if (/quiz|exam|assessment/i.test(ann.title))
    return { icon: <AssignmentIcon sx={{ fontSize: 15, color: '#7655D9' }} />, accent: '#7655D9', iconBg: '#F1EEFF' };
  return { icon: <MenuBookIcon sx={{ fontSize: 15, color: '#16A34A' }} />, accent: '#16A34A', iconBg: '#F0FDF4' };
}

function MiniCalendar() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayNamesFull = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon = 0

  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

  const isToday = (d) =>
    d && d === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <section className="right-card">
      <div className="right-card-header">
        <span>{monthNames[month]} {year}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={prevMonth} className="cal-nav-btn"><ChevronLeftIcon fontSize="small" /></button>
          <button onClick={nextMonth} className="cal-nav-btn"><ChevronRightIcon fontSize="small" /></button>
        </div>
      </div>
      <div className="mini-calendar-grid">
        {dayNamesFull.map(d => <div key={d} className="day-label">{d}</div>)}
        {days.map((d, i) => (
          <div key={i} className={`day-cell${isToday(d) ? ' today' : ''}${!d ? ' empty' : ''}`}>
            {d || ''}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div className="dash-stat-progress-track">
      <div
        className="dash-stat-progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

function gradeStanding(g) {
  if (g >= 90) return { label: 'Excellent standing', color: '#27A878' };
  if (g >= 80) return { label: 'Very Good standing', color: '#27A878' };
  if (g >= 70) return { label: 'Good standing', color: '#7655D9' };
  return { label: 'Needs improvement', color: '#F5A43A' };
}

export default function StudentDashboard() {
  const { user } = useAuth();

  const [courses, setCourses]             = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats]                 = useState(null);
  const [aiPath, setAiPath]               = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ── Courses ──
        const coursesRes = await api.get('/courses');
        const courseList = coursesRes.data.courses || [];
        setCourses(courseList);

        // ── Announcements ──
        const allAnn = [];
        await Promise.all(
          courseList.map(async (course) => {
            try {
              const r = await api.get(`/courses/${course.id}/announcements`);
              r.data.announcements.forEach(a => {
                a.course_name = course.name;
                a.course_id   = course.id;
              });
              allAnn.push(...r.data.announcements);
            } catch { /* Optional dashboard data is unavailable. */ }
          })
        );
        allAnn.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAnnouncements(allAnn);

        // ── Stats (real data) ──
        try {
          const statsRes = await api.get('/student/stats');
          if (statsRes.data) setStats(statsRes.data);
        } catch { /* Optional dashboard data is unavailable. */ }

        // ── AI Recommendations (real data) ──
        try {
          const aiRes = await api.get('/student/ai-recommendations');
          if (aiRes.data) setAiPath(aiRes.data);
          else setAiPath(null);
        } catch { setAiPath(null); }

      } catch (err) {
        console.warn('Dashboard API unavailable, showing placeholder data.', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading your dashboard...</div>;
  }

  const gradeValue     = stats?.overall_grade ?? null;
  const lessonsDone    = stats?.lessons_done  ?? null;
  const lessonsTotal   = stats?.lessons_total ?? null;
  const pendingTasks   = stats?.pending_tasks ?? null;
  const lessonsPercent = (lessonsDone != null && lessonsTotal)
    ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const gradePercent   = gradeValue != null ? Math.round((gradeValue / 100) * 100) : 0;
  const standing       = gradeValue != null ? gradeStanding(gradeValue) : null;

  return (
    <>
    <div className="dashboard-grid">

      {/* ── Main Column ── */}
      <div className="dashboard-main">

        {/* ── Hero Welcome Banner ── */}
        <div className="welcome-banner">
          <div className="welcome-banner-text">
            <h1>
              Welcome back,{' '}
              <span>{user?.first_name || 'Student'}!</span>
            </h1>
            <p>Here's what's happening across your courses.</p>
          </div>
          <span className="welcome-banner-sparkle">✦</span>
          <img
            src={studentProfile}
            alt=""
            className="welcome-banner-mascot"
            aria-hidden="true"
          />
        </div>

        {/* ── Stats Cards ── */}
        <div className="dashboard-stats-row">
          {/* Overall Grade */}
          <div className="dash-stat-card dash-stat-card--grade">
            <div className="dash-stat-icon dash-stat-icon--grade">
              <StarBorderIcon sx={{ fontSize: 20, color: '#27A878' }} />
            </div>
            <p className="dash-stat-label">Overall Grade</p>
            <p className="dash-stat-value">
              {gradeValue != null ? gradeValue.toFixed(1) : '—'}
            </p>
            <p className="dash-stat-sub" style={{ color: standing?.color ?? '#9B97B2' }}>
              {standing?.label ?? 'No data yet'}
            </p>
            <ProgressBar value={gradePercent} color="#27A878" />
          </div>

          {/* Lessons Done */}
          <div className="dash-stat-card dash-stat-card--lessons">
            <div className="dash-stat-icon dash-stat-icon--lessons">
              <ArticleOutlinedIcon sx={{ fontSize: 20, color: '#7655D9' }} />
            </div>
            <p className="dash-stat-label">Lessons Done</p>
            <p className="dash-stat-value">
              {lessonsDone != null
                ? <>{lessonsDone}<span className="dash-stat-total"> / {lessonsTotal}</span></>
                : '—'
              }
            </p>
            <p className="dash-stat-sub" style={{ color: lessonsDone != null ? '#7655D9' : '#9B97B2' }}>
              {lessonsDone != null ? `${lessonsPercent}% complete` : 'No data yet'}
            </p>
            <ProgressBar value={lessonsPercent} color="#7655D9" />
          </div>

          {/* Pending Tasks */}
          <div className="dash-stat-card dash-stat-card--tasks">
            <div className="dash-stat-icon dash-stat-icon--tasks">
              <AccessTimeIcon sx={{ fontSize: 20, color: '#F5A43A' }} />
            </div>
            <p className="dash-stat-label">Pending Tasks</p>
            <p className="dash-stat-value">
              {pendingTasks != null ? pendingTasks : '—'}
            </p>
            <p className="dash-stat-sub" style={{ color: pendingTasks != null ? '#F5A43A' : '#9B97B2' }}>
              {pendingTasks != null ? 'Due this week' : 'No data yet'}
            </p>
            <ProgressBar
              value={pendingTasks != null ? Math.min(100, pendingTasks * 20) : 0}
              color="#F5A43A"
            />
          </div>
        </div>

        {/* ── AI Learning Path ── */}
        {aiPath && (
          <div className="ai-path-card">
            <div className="ai-path-header">
              <div className="ai-path-title-row">
                <div className="ai-path-icon-wrap">
                  <AutoAwesomeIcon sx={{ fontSize: 18, color: '#7655D9' }} />
                </div>
                <span className="ai-path-title">AI Learning Path</span>
              </div>
              <span className="ai-path-badge">AI Recommendation</span>
            </div>
            <p className="ai-path-desc">{aiPath.description}</p>
            <ul className="ai-path-list">
              {aiPath.topics?.map((topic, i) => (
                <li key={i} className="ai-path-item">
                  <span className="ai-path-dot" />
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Announcements ── */}
        <div className="announcements-section">
          <h2 className="announcements-heading">Announcements</h2>

          {announcements.length === 0 ? (
            <div className="empty-card">No announcements yet.</div>
          ) : (
            <div className="announcements-list">
              {announcements.map((ann) => {
                const { icon, accent, iconBg } = getAnnIcon(ann);
                const linkTarget = ann.course_id
                  ? `/student/courses/${ann.course_id}`
                  : '#';
                return (
                  <Link
                    key={ann.id}
                    to={linkTarget}
                    className="ann-card-link"
                  >
                    <div className="ann-card" style={{ borderLeftColor: accent }}>
                      <div className="ann-card-inner">
                        <div className="ann-icon-wrap" style={{ background: iconBg }}>
                          {icon}
                        </div>
                        <div className="ann-card-body">
                          <div className="ann-card-top">
                            <p className="ann-card-title">{ann.title}</p>
                            <span className="ann-card-date">
                              {new Date(ann.created_at).toLocaleDateString('en-PH', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="ann-card-course">{ann.course_name}</p>
                          <p className="ann-card-content">{ann.content}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar Column ── */}
      <aside className="dashboard-side">
        <MiniCalendar />

        <section className="right-card">
          <div className="right-card-header">
            <span>My Courses</span>
            <Link to="/student/courses" className="right-card-view-all">
              View all →
            </Link>
          </div>
          <div className="side-courses-list">
            {courses.length === 0 ? (
              <p className="side-empty">No courses yet.</p>
            ) : (
              courses.slice(0, 5).map((course, idx) => {
                const theme = courseColors[idx % courseColors.length];
                const to = course.id?.toString().startsWith('dummy')
                  ? '/student/courses'
                  : `/student/courses/${course.id}`;
                return (
                  <Link
                    key={course.id}
                    to={to}
                    className="side-course-item"
                  >
                    <div className="side-course-icon" style={{ background: theme.bg }}>
                      {theme.icon}
                    </div>
                    <div className="side-course-info">
                      <p className="side-course-name">{course.name}</p>
                      <p className="side-course-code">{course.code}</p>
                    </div>
                    <ArrowForwardIosIcon sx={{ fontSize: 10, color: '#9B97B2', flexShrink: 0 }} />
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </aside>
    </div>
    <AiChatbot />
    </>
  );
}
