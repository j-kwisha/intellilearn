import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PushPinIcon from '@mui/icons-material/PushPin';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function InstructorCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tab, setTab] = useState('lessons');
  const [loading, setLoading] = useState(true);

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(null); // lessonId

  // Join code state
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const fetchData = () => {
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/lessons`),
      api.get(`/courses/${courseId}/assessments`),
      api.get(`/courses/${courseId}/students`),
      api.get(`/courses/${courseId}/announcements`),
    ])
      .then(([c, l, a, s, ann]) => {
        setCourse(c.data.course);
        setLessons(l.data.lessons);
        setAssessments(a.data.assessments);
        setStudents(s.data.students);
        setAnnouncements(ann.data.announcements);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [courseId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  if (!course) return <p className="text-slate-500">Course not found.</p>;

  const tabs = ['lessons', 'assessments', 'announcements', 'students', 'calendar'];

  const deleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/courses/${courseId}/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert('Failed to delete.');
    }
  };

  const handleGenerateCode = async () => {
    setCodeLoading(true);
    try {
      const res = await api.post(`/courses/${courseId}/generate-code`);
      setCourse((prev) => ({ ...prev, join_code: res.data.join_code }));
    } catch (err) {
      alert('Failed to generate code.');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleRevokeCode = async () => {
    if (!confirm('Revoke this join code? Students will no longer be able to use it.')) return;
    setCodeLoading(true);
    try {
      await api.delete(`/courses/${courseId}/join-code`);
      setCourse((prev) => ({ ...prev, join_code: null }));
    } catch (err) {
      alert('Failed to revoke code.');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(course.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleDeleteCourse = async () => {
    if (!confirm(`Are you sure you want to delete "${course.name}"? This will permanently delete all lessons, assessments, and student data. This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/courses/${courseId}`);
      alert('Course deleted successfully.');
      navigate('/instructor/courses');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete course.');
    }
  };

  const handleDeleteLesson = async (lessonId, lessonTitle) => {
    if (!confirm(`Are you sure you want to delete "${lessonTitle}"? This will permanently delete all materials and student progress for this lesson. This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
      setLessons(lessons.filter(l => l.id !== lessonId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete lesson.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Course header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800">{course.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{course.code} · {course.section} · {course.semester}</p>
            <div className="flex gap-4 mt-3 text-sm text-slate-500">
              <span>{lessons.length} lessons</span>
              <span>{assessments.length} assessments</span>
              <span>{students.length} students</span>
              <span>{announcements.length} announcements</span>
            </div>
          </div>
          <button
            onClick={handleDeleteCourse}
            className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-4 py-2 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors font-medium"
          >
            Delete Course
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors
              ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Lessons tab */}
      {tab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => navigate(`/instructor/courses/${courseId}/lessons/create`)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
              + New Lesson
            </button>
          </div>
          {lessons.length === 0 ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">No lessons yet.</p>
          ) : (
            lessons.map((lesson) => (
              <div key={lesson.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">Lesson {lesson.order + 1}: {lesson.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      {lesson.topic && <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">{lesson.topic}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${lesson.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {lesson.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setShowMaterialForm(showMaterialForm === lesson.id ? null : lesson.id)}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                      {showMaterialForm === lesson.id ? '✕ Cancel' : '+ Upload'}
                    </button>
                    <button 
                      onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                      className="text-sm text-red-500 hover:text-red-700 font-medium">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline upload form — appears inside the lesson card */}
                {showMaterialForm === lesson.id && (
                  <MaterialUploadForm
                    courseId={courseId}
                    lessonId={lesson.id}
                    onClose={() => setShowMaterialForm(null)}
                    onSuccess={() => { setShowMaterialForm(null); fetchData(); }}
                  />
                )}
                {/* Materials list */}
                {lesson.materials && lesson.materials.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    {lesson.materials.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{m.type === 'pdf' ? '📄' : m.type === 'docx' ? '📝' : m.type === 'link' ? '🔗' : '📎'}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{m.title}</p>
                            <p className="text-xs text-slate-400 uppercase">{m.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(m.file_url || m.url) && (
                            <a href={m.file_url || m.url} rel="noopener noreferrer"
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium">View</a>
                          )}
                          <button onClick={async () => {
                            if (!confirm('Delete this material?')) return;
                            await api.delete(`/courses/${courseId}/lessons/${lesson.id}/materials/${m.id}`);
                            fetchData();
                          }} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Assessments tab */}
      {tab === 'assessments' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={() => navigate(`/instructor/courses/${courseId}/assessments/create`)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
              + New Assessment
            </button>
          </div>
          {showQuestionForm && (
            <QuestionForm courseId={courseId} assessmentId={showQuestionForm} onClose={() => setShowQuestionForm(null)} onSuccess={() => { setShowQuestionForm(null); fetchData(); }} />
          )}
          {assessments.length === 0 ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">No assessments yet.</p>
          ) : (
            assessments.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/instructor/courses/${courseId}/assessments/${a.id}`)}>
                    <h4 className="font-semibold text-slate-800 hover:text-teal-700 transition-colors">{a.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{a.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-slate-400">{a.questions_count || 0} questions · {a.total_points} pts</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {a.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => setShowQuestionForm(a.id)} className="text-sm text-teal-600 hover:text-teal-700 font-medium">+ Questions</button>
                    <button onClick={() => navigate(`/instructor/courses/${courseId}/assessments/${a.id}`)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Results</button>
                    <button onClick={async () => {
                      if (!confirm('Delete this assessment?')) return;
                      await api.delete(`/courses/${courseId}/assessments/${a.id}`);
                      fetchData();
                    }} className="text-sm text-red-400 hover:text-red-600 font-medium">Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Announcements tab */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAnnouncementForm(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
              + New Announcement
            </button>
          </div>
          {showAnnouncementForm && (
            <AnnouncementForm courseId={courseId} onClose={() => setShowAnnouncementForm(false)} onSuccess={() => { setShowAnnouncementForm(false); fetchData(); }} />
          )}
          {announcements.length === 0 ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">No announcements yet. Post your first one above.</p>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                      {ann.is_pinned && <PushPinIcon sx={{ fontSize: 16, color: '#f59e0b' }} />}
                      {ann.title}
                    </h4>
                    <p className="text-sm text-slate-600 mt-2">{ann.content}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Posted {new Date(ann.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' by '}{ann.author?.first_name} {ann.author?.last_name}
                    </p>
                  </div>
                  <button onClick={() => deleteAnnouncement(ann.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Students tab */}
      {tab === 'students' && (
        <div className="space-y-4">
          {/* Enrollment Code Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-slate-800">Class Join Code</h4>
              <button
                onClick={() => navigate(`/instructor/courses/${courseId}/ai-summary`)}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                🤖 AI Student Summary
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Share this code with students so they can join the course directly.
            </p>
            {course.join_code ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-2xl font-bold tracking-widest text-teal-700 bg-teal-50 px-5 py-2 rounded-lg border border-teal-200">
                  {course.join_code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-700 border border-slate-300 px-3 py-2 rounded-lg hover:border-teal-400 transition-colors"
                >
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleGenerateCode}
                  disabled={codeLoading}
                  className="text-sm text-slate-600 hover:text-teal-700 border border-slate-300 px-3 py-2 rounded-lg hover:border-teal-400 transition-colors disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleRevokeCode}
                  disabled={codeLoading}
                  className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-2 rounded-lg hover:border-red-400 transition-colors disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={codeLoading}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {codeLoading ? 'Generating...' : 'Generate Join Code'}
              </button>
            )}
          </div>

          {/* Students table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {students.length === 0 ? (
              <p className="text-slate-500 p-6 text-center">No students enrolled yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">#</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Name</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Email</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{student.first_name} {student.last_name}</td>
                      <td className="px-5 py-3 text-slate-600">{student.email}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full capitalize">{student.pivot?.status || 'active'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <CalendarTab courseId={courseId} />
      )}
    </div>
  );
}

// ================================================================
// INLINE FORM COMPONENTS
// ================================================================

function LessonForm({ courseId, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', topic: '', is_published: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await api.post(`/courses/${courseId}/lessons`, form); onSuccess(); }
    catch (err) { setError(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
      <h4 className="font-semibold text-slate-800 mb-4">Create New Lesson</h4>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" placeholder="Lesson title" value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        <textarea placeholder="Description (optional)" value={form.description} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
        <input type="text" placeholder="Topic tag (e.g. data_privacy)" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-slate-300 text-teal-600" />
          Publish immediately
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">{saving ? 'Creating...' : 'Create Lesson'}</button>
          <button type="button" onClick={onClose} className="bg-white text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 border border-slate-300 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AssessmentForm({ courseId, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', type: 'quiz', topic: '', total_points: 100, time_limit_minutes: '', max_attempts: 1, is_published: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const data = { ...form };
      if (!data.time_limit_minutes) delete data.time_limit_minutes;
      await api.post(`/courses/${courseId}/assessments`, data); onSuccess();
    } catch (err) { setError(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
      <h4 className="font-semibold text-slate-800 mb-4">Create New Assessment</h4>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" placeholder="Assessment title" value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white">
            <option value="quiz">Quiz</option><option value="long_exam">Long Exam</option><option value="individual_activity">Individual Activity</option>
          </select>
          <input type="text" placeholder="Topic tag" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs text-slate-500 mb-1">Total points</label><input type="number" value={form.total_points} min={1} onChange={(e) => setForm({ ...form, total_points: parseInt(e.target.value) })} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" /></div>
          <div><label className="block text-xs text-slate-500 mb-1">Time limit (min)</label><input type="number" value={form.time_limit_minutes} placeholder="No limit" onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" /></div>
          <div><label className="block text-xs text-slate-500 mb-1">Max attempts</label><input type="number" value={form.max_attempts} min={1} onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) })} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-slate-300 text-teal-600" />
          Publish immediately
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">{saving ? 'Creating...' : 'Create Assessment'}</button>
          <button type="button" onClick={onClose} className="bg-white text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 border border-slate-300 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AnnouncementForm({ courseId, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false });
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post(`/courses/${courseId}/announcements`, form);
      // Also add to student calendars if toggled
      if (addToCalendar && calendarDate) {
        await api.post(`/courses/${courseId}/calendar`, {
          title: form.title,
          event_type: 'other',
          start_date: calendarDate,
          description: form.content,
          color: '#f59e0b',
        });
      }
      onSuccess();
    }
    catch (err) { setError(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
      <h4 className="font-semibold text-slate-800 mb-4">Post Announcement</h4>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" placeholder="Announcement title" value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        <textarea placeholder="Announcement content..." value={form.content} rows={4} required onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />

        {/* Pin toggle */}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} className="rounded border-slate-300 text-teal-600" />
          <PushPinIcon sx={{ fontSize: 16 }} /> Pin this announcement
        </label>

        {/* Calendar toggle */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
            <input type="checkbox" checked={addToCalendar} onChange={e => setAddToCalendar(e.target.checked)} className="rounded border-slate-300 text-teal-600" />
            📅 Add to students' calendar
          </label>
          {addToCalendar && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Event date & time</label>
              <input type="datetime-local" value={calendarDate} required={addToCalendar}
                onChange={e => setCalendarDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <p className="text-xs text-slate-400 mt-1">This will appear as a calendar event for all enrolled students.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">{saving ? 'Posting...' : 'Post Announcement'}</button>
          <button type="button" onClick={onClose} className="bg-white text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 border border-slate-300 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function QuestionForm({ courseId, assessmentId, onClose, onSuccess }) {
  const [questions, setQuestions] = useState([
    { question_text: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '', points: 10 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx, optIdx, value) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const newOptions = [...q.options];
      newOptions[optIdx] = value;
      return { ...q, options: newOptions };
    }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { question_text: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '', points: 10 }]);
  };

  const removeQuestion = (idx) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const cleaned = questions.map((q) => {
        const out = { ...q };
        if (q.type === 'essay') { delete out.options; delete out.correct_answer; }
        else if (q.type === 'short_answer') { delete out.options; }
        else { out.options = out.options.filter((o) => o.trim() !== ''); }
        return out;
      });
      await api.post(`/courses/${courseId}/assessments/${assessmentId}/questions/bulk`, { questions: cleaned });
      onSuccess();
    } catch (err) { setError(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
      <h4 className="font-semibold text-slate-800 mb-4">Add Questions</h4>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Question {idx + 1}</span>
              {questions.length > 1 && <button type="button" onClick={() => removeQuestion(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>}
            </div>
            <textarea placeholder="Question text" value={q.question_text} rows={2} required onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={q.type} onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                <option value="multiple_choice">Multiple Choice</option><option value="true_false">True / False</option><option value="short_answer">Short Answer</option><option value="essay">Essay</option>
              </select>
              <input type="number" value={q.points} min={1} placeholder="Points" onChange={(e) => updateQuestion(idx, 'points', parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Options:</p>
                {q.options.map((opt, optIdx) => (
                  <input key={optIdx} type="text" value={opt} placeholder={`Option ${optIdx + 1}`} onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                ))}
              </div>
            )}
            {q.type === 'true_false' && <p className="text-xs text-slate-400">Options will be True / False automatically.</p>}
            {q.type !== 'essay' && (
              <input type="text" placeholder="Correct answer" value={q.correct_answer} onChange={(e) => updateQuestion(idx, 'correct_answer', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            )}
          </div>
        ))}
        <button type="button" onClick={addQuestion}
          className="w-full border-2 border-dashed border-slate-300 text-slate-500 py-2.5 rounded-lg text-sm font-medium hover:border-teal-400 hover:text-teal-600 transition-colors">
          + Add Another Question
        </button>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : `Save ${questions.length} Question${questions.length > 1 ? 's' : ''}`}
          </button>
          <button type="button" onClick={onClose} className="bg-white text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 border border-slate-300 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function MaterialUploadForm({ courseId, lessonId, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', type: 'pdf' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    setSaving(true); setError('');

    const data = new FormData();
    data.append('title', form.title);
    data.append('type', form.type);
    data.append('file', file);

    try {
      await api.post(`/courses/${courseId}/lessons/${lessonId}/materials`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
      <h4 className="font-semibold text-slate-800 mb-4">Upload Module File</h4>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" placeholder="File title (e.g. Week 1 Module)" value={form.title} required
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
          <option value="pdf">PDF</option>
          <option value="docx">Word Document (DOCX)</option>
        </select>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-teal-400 transition-colors">
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])}
            className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer">
            {file ? (
              <p className="text-sm text-teal-700 font-medium">📎 {file.name}</p>
            ) : (
              <p className="text-sm text-slate-500">Click to select a PDF or DOCX file <span className="text-xs block mt-1 text-slate-400">Max 50MB</span></p>
            )}
          </label>
        </div>
        {saving && progress > 0 && (
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {saving ? `Uploading ${progress}%...` : 'Upload File'}
          </button>
          <button type="button" onClick={onClose}
            className="bg-white text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 border border-slate-300 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function CalendarTab({ courseId }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', event_type: 'other', start_date: '', description: '', color: '#3B82F6' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchEvents = () => {
    api.get(`/calendar?course_id=${courseId}`)
      .then(res => setEvents(res.data.events || []))
      .catch(console.error);
  };

  useEffect(() => { fetchEvents(); }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post(`/courses/${courseId}/calendar`, form);
      setShowForm(false);
      setForm({ title: '', event_type: 'other', start_date: '', description: '', color: '#3B82F6' });
      fetchEvents();
    } catch (err) { setError(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const typeColors = { lesson: '#3B82F6', quiz: '#F59E0B', exam: '#EF4444', activity: '#10B981', deadline: '#EF4444', other: '#6B7280' };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
          + Add Event
        </button>
      </div>

      {showForm && (
        <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
          <h4 className="font-semibold text-slate-800 mb-4">Add Calendar Event</h4>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Event title" value={form.title} required
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                {['lesson','quiz','exam','activity','deadline','other'].map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
              <input type="datetime-local" value={form.start_date} required
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <textarea placeholder="Description (optional)" value={form.description} rows={2}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Add Event'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="bg-white text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 border border-slate-300 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">No events yet.</p>
      ) : (
        <div className="space-y-2">
          {events.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: e.color || typeColors[e.event_type] || '#6B7280' }} />
              <div className="flex-1">
                <p className="font-medium text-sm text-slate-800">{e.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(e.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}<span className="capitalize">{e.event_type}</span>
                </p>
              </div>
              <button onClick={async () => {
                if (!confirm('Delete this event?')) return;
                await api.delete(`/calendar/${e.id}`);
                fetchEvents();
              }} className="text-xs text-red-400 hover:text-red-600">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
