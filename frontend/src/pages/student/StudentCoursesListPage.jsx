import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ComputerIcon from '@mui/icons-material/Computer';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ScienceIcon from '@mui/icons-material/Science';

const courseColors = [
  { bg: '#EEF3FF', icon: <ComputerIcon fontSize="medium" sx={{ color: '#4c6ef5' }} /> },
  { bg: '#FFF0F9', icon: <SmartToyIcon fontSize="medium" sx={{ color: '#C026D3' }} /> },
  { bg: '#FFF7ED', icon: <EngineeringIcon fontSize="medium" sx={{ color: '#EA580C' }} /> },
  { bg: '#F0FDF4', icon: <AutoStoriesIcon fontSize="medium" sx={{ color: '#16A34A' }} /> },
  { bg: '#EFF6FF', icon: <ScienceIcon fontSize="medium" sx={{ color: '#2563EB' }} /> },
];

function JoinByCodeModal({ onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/courses/join', { code: code.trim() });
      onJoined(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Join a Course</h3>
        <p className="text-sm text-slate-500 mb-5">Enter the join code provided by your instructor.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. AB12CD34"
            maxLength={10}
            required
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-slate-300 text-center font-mono text-xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Joining...' : 'Join Course'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-100 border border-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentCoursesListPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCourses = () => {
    api.get('/courses')
      .then((res) => setCourses(res.data.courses || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleJoined = (message) => {
    setShowJoinModal(false);
    setSuccessMsg(message);
    fetchCourses();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (loading) {
    return <div className="loading-state">Loading courses...</div>;
  }

  return (
    <div className="dashboard-main">

      {/* Page heading */}
      <header className="dashboard-title-row">
        <h1>My Courses</h1>
        <button
          onClick={() => setShowJoinModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Join with Code
        </button>
      </header>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {showJoinModal && (
        <JoinByCodeModal onClose={() => setShowJoinModal(false)} onJoined={handleJoined} />
      )}

      {/* Course cards — exact same markup as the original dashboard course list */}
      <div className="courses-list">
        {courses.length === 0 ? (
          <div className="empty-card">You are not enrolled in any courses yet.</div>
        ) : (
          courses.map((course, idx) => {
            const theme = courseColors[idx % courseColors.length];
            return (
              <Link
                key={course.id}
                to={`/student/courses/${course.id}`}
                className="course-card"
              >
                <div className="course-card-left" style={{ background: theme.bg }}>
                  {theme.icon}
                </div>
                <div className="course-card-content">
                  <h2>{course.name}</h2>
                  <p>
                    {course.description ||
                      `${course.code || ''}  Section ${course.section || 'N/A'}`}
                  </p>
                  <small>
                    By <strong>
                      {course.instructor?.first_name} {course.instructor?.last_name}
                    </strong>
                  </small>
                </div>
                <div className="course-card-action">
                  <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}