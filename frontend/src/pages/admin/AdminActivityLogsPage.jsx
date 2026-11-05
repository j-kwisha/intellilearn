import { useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminActivityLogsPage.css';

const ACTION_LABELS = {
  'course.created': 'Created course', 'course.deleted': 'Deleted course',
  'lesson.created': 'Created lesson', 'lesson.updated': 'Updated lesson', 'lesson.deleted': 'Deleted lesson',
  'lesson_material.uploaded': 'Uploaded lesson file', 'lesson_material.deleted': 'Deleted lesson file',
  'course_material.uploaded': 'Uploaded course file', 'course_material.deleted': 'Deleted course file',
  'assessment.created': 'Created assessment', 'assessment.updated': 'Updated assessment',
  'assessment.deleted': 'Deleted assessment', 'assessment.questions_imported': 'Imported question bank items',
  'assessment.attempt_resumed': 'Unlocked a saved attempt', 'assessment.attempt_unlocked': 'Granted an extra attempt',
  'lesson.version_restored': 'Restored lesson version',
};

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses').then(response => setCourses(response.data.courses || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/activity-logs', { params: { page, per_page: 50, ...(courseId ? { course_id: courseId } : {}) }, signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        setError('');
        setLogs(response.data.data || []);
        setLastPage(response.data.last_page || 1);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load activity logs. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [courseId, page]);

  return <section className="admin-activity-logs">
    <header className="activity-log-heading">
      <div><h2>Instructor Activity</h2><p>Review course and assessment changes made by instructors, with timestamps.</p></div>
      <label>Course
        <select value={courseId} onChange={event => { setLoading(true); setCourseId(event.target.value); setPage(1); }}>
          <option value="">All courses</option>
          {courses.map(course => <option key={course.id} value={course.id}>{course.name} ({course.code})</option>)}
        </select>
      </label>
    </header>
    {error && <p role="alert" className="activity-log-error">{error}</p>}
    <div className="adm-table-wrap">
      <table className="adm-courses-table">
        <thead><tr><th scope="col">When</th><th scope="col">Instructor</th><th scope="col">Action</th><th scope="col">Course</th><th scope="col">Details</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan="5" className="activity-log-empty">Loading activity…</td></tr> : logs.length === 0 ?
            <tr><td colSpan="5" className="activity-log-empty">No instructor activity found for this course.</td></tr> :
            logs.map(log => <tr key={log.id}>
              <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
              <td>{log.user ? `${log.user.first_name} ${log.user.last_name}` : log.details?.actor_name || 'Deleted account'}</td>
              <td>{ACTION_LABELS[log.action] || log.action}</td>
              <td>{log.course ? `${log.course.name} (${log.course.code})` : 'Deleted course'}</td>
              <td>{Object.entries(log.details || {}).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`).join(' · ') || '—'}</td>
            </tr>)}
        </tbody>
      </table>
    </div>
    <div className="activity-log-pagination">
      <span>Page {page} of {lastPage}</span>
      <div><button type="button" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(value => value - 1); }}>Previous</button>
        <button type="button" disabled={loading || page >= lastPage} onClick={() => { setLoading(true); setPage(value => value + 1); }}>Next</button></div>
    </div>
  </section>;
}
