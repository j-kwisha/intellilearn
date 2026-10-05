import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PushPinIcon from '@mui/icons-material/PushPin';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

/* ── Hero 3-dot action menu (Delete Course) ── */
function HeroActionMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <>
      <div ref={btnRef} style={{ position:'relative', zIndex:2, flexShrink:0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ width:34, height:34, borderRadius:10, border:'1px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.12)', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
          </svg>
        </button>
        {open && (
          <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, minWidth:160, background:'#fff', border:'1px solid #d8e6dd', borderRadius:10, boxShadow:'0 10px 28px rgba(15,35,25,0.16)', padding:6, zIndex:50 }}>
            <button
              onClick={() => { setOpen(false); setShowConfirm(true); }}
              style={{ display:'flex', width:'100%', padding:'9px 10px', borderRadius:8, border:'none', background:'none', fontSize:13.5, fontWeight:500, color:'#e0453c', cursor:'pointer', fontFamily:'Inter,sans-serif', alignItems:'center', gap:8 }}
            >
              🗑 Delete Course
            </button>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)' }}
          onClick={() => setShowConfirm(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:16, padding:'28px 32px', maxWidth:420, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'Inter,sans-serif' }}
          >
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'18px', color:'#16241d', margin:'0 0 10px' }}>
              Delete Course?
            </h3>
            <p style={{ fontSize:'14.5px', color:'#4d5c53', margin:'0 0 24px', lineHeight:1.6 }}>
              This action cannot be undone. All lessons, assessments, and student data for this course will be permanently deleted.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ padding:'10px 22px', borderRadius:999, border:'1.5px solid #d8e6dd', background:'#f5faf7', color:'#4d5c53', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); onDelete(); }}
                style={{ padding:'10px 22px', borderRadius:999, border:'none', background:'#e0453c', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif' }}
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Per-lesson 3-dot action menu (Upload / Delete) ── */
function LessonActionMenu({ onUpload, onDelete, uploadLabel }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={menuRef} style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="instr-row-menu" style={{ width:30, height:30, borderRadius:8 }}>
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, minWidth:180, background:'var(--instr-panel)', border:'1px solid var(--instr-line)', borderRadius:10, boxShadow:'0 10px 28px rgba(15,35,25,0.16)', padding:6, zIndex:50 }}>
          <button onClick={() => { setOpen(false); onUpload(); }}
            style={{ display:'flex', width:'100%', padding:'9px 10px', borderRadius:8, border:'none', background:'none', fontSize:13.5, fontWeight:500, color:'var(--instr-green-600)', cursor:'pointer', fontFamily:'Inter,sans-serif', alignItems:'center', gap:8 }}>
            📎 {uploadLabel}
          </button>
          <button onClick={() => { setOpen(false); onDelete(); }}
            style={{ display:'flex', width:'100%', padding:'9px 10px', borderRadius:8, border:'none', background:'none', fontSize:13.5, fontWeight:500, color:'#e0453c', cursor:'pointer', fontFamily:'Inter,sans-serif', alignItems:'center', gap:8 }}>
            🗑 Delete Lesson
          </button>
        </div>
      )}
    </div>
  );
}

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
  const [editingAssessment, setEditingAssessment] = useState(null);
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!course) return <p style={{ color: 'var(--instr-muted)', fontFamily: 'Inter, sans-serif' }}>Course not found.</p>;

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
    // Confirmation is handled by HeroActionMenu modal — just execute delete
    try {
      await api.delete(`/courses/${courseId}`);
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
      // Update lessons state
      setLessons(prevLessons => prevLessons.filter(l => l.id !== lessonId));
      // Hide material form if it was open for this lesson
      if (showMaterialForm === lessonId) {
        setShowMaterialForm(null);
      }
      // Show success message
      alert(`Lesson "${lessonTitle}" deleted successfully.`);
    } catch (err) {
      console.error('Delete lesson error:', err);
      alert(err.response?.data?.message || 'Failed to delete lesson. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Back link */}
      <a href="/instructor/courses" onClick={e => { e.preventDefault(); navigate('/instructor/courses'); }}
        style={{ display:'inline-flex', alignItems:'center', gap:'6px', color:'var(--instr-ink-soft)', textDecoration:'none', fontSize:'13.5px', fontWeight:600, fontFamily:'Inter,sans-serif', marginBottom:'-8px' }}>
        <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to My Courses
      </a>

      {/* Course hero */}
      <div className="instr-course-hero">
        <div className="instr-course-hero-bg">
          <svg style={{ position:'absolute',left:0,bottom:0,width:'100%',height:'100%',pointerEvents:'none' }} viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,150 C150,190 300,110 480,140 C660,170 780,120 960,145 C1080,162 1140,150 1200,160 L1200,220 L0,220 Z" fill="rgba(255,255,255,0.05)"/>
            <path d="M0,175 C180,210 360,150 540,170 C720,190 840,155 1020,172 C1110,180 1160,175 1200,182 L1200,220 L0,220 Z" fill="rgba(255,255,255,0.045)"/>
          </svg>
        </div>
        <div className="instr-course-hero-main">
          <div className="instr-course-hero-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="instr-course-hero-info">
            <h2 className="instr-course-hero-name">{course.name}</h2>
            <p className="instr-course-hero-code">{course.code} · {course.section} · {course.semester}</p>
            <div className="instr-course-hero-stats">
              <span>{lessons.length} lessons</span>
              <span>{assessments.length} assessments</span>
              <span>{students.length} students</span>
              <span>{announcements.length} announcements</span>
            </div>
          </div>
        </div>
        {/* 3-dot action menu — matches reference */}
        <HeroActionMenu onDelete={handleDeleteCourse} />
      </div>

      {/* Tabs — full-width white pill bar */}
      <div className="instr-tab-bar instr-tab-bar--full">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`instr-tab-btn ${tab === t ? 'instr-tab-btn--active' : ''}`}>
            {t === 'lessons' && tab === t && (
              <svg viewBox="0 0 24 24" fill="none" style={{ width:15, height:15 }}><path d="M6 3h9l5 5v13H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            )}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Lessons ── */}
      {tab === 'lessons' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => navigate(`/instructor/courses/${courseId}/lessons/create`)} className="instr-pill-btn">+ New Lesson</button>
          </div>
          {lessons.length === 0 ? <div className="instr-tab-empty">No lessons yet.</div> : lessons.map((lesson) => (
            <div key={lesson.id} className="instr-item-card instr-item-card--blue">
              <div className="instr-item-icon instr-item-icon--blue">
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <div className="instr-item-body">
                <div className="instr-item-title-row">
                  <span className="instr-item-title">Lesson {lesson.order + 1}: {lesson.title}</span>
                  <LessonActionMenu
                    onUpload={() => setShowMaterialForm(showMaterialForm === lesson.id ? null : lesson.id)}
                    onDelete={() => handleDeleteLesson(lesson.id, lesson.title)}
                    uploadLabel={showMaterialForm === lesson.id ? '✕ Cancel Upload' : '+ Upload Material'}
                  />
                </div>
                <div className="instr-item-tags">
                  {lesson.topic && <span className="instr-tag-pill">{lesson.topic}</span>}
                  <span className={`instr-tag-pill ${lesson.is_published ? 'instr-tag-pill--published' : ''}`}>{lesson.is_published ? 'Published' : 'Draft'}</span>
                </div>
                {showMaterialForm === lesson.id && (
                  <MaterialUploadForm courseId={courseId} lessonId={lesson.id} onClose={() => setShowMaterialForm(null)} onSuccess={() => { setShowMaterialForm(null); fetchData(); }} />
                )}
                {lesson.materials && lesson.materials.length > 0 && (
                  <div style={{ borderTop:'1px solid var(--instr-line)', paddingTop:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                    {lesson.materials.map((m) => (
                      <div key={m.id} className="instr-file-row">
                        <div className="instr-file-row-left">
                          <span className="instr-file-row-icon">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                          </span>
                          <span>
                            <span className="instr-file-row-name">{m.title}</span>
                            <span className="instr-file-row-meta">{m.type?.toUpperCase()}</span>
                          </span>
                        </div>
                        <div className="instr-file-row-links">
                          {(m.file_url || m.url) && <a href={m.file_url || m.url} rel="noopener noreferrer" className="instr-link-action">View</a>}
                          <button onClick={async () => { if (!confirm('Delete this material?')) return; await api.delete(`/courses/${courseId}/lessons/${lesson.id}/materials/${m.id}`); fetchData(); }} className="instr-link-action instr-link-action--danger">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Assessments ── */}
      {tab === 'assessments' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => navigate(`/instructor/courses/${courseId}/assessments/create`)} className="instr-pill-btn">+ New Assessment</button>
          </div>
          {showAssessmentForm && <AssessmentForm courseId={courseId} editAssessment={null} onClose={() => { setShowAssessmentForm(false); }} onSuccess={() => { setShowAssessmentForm(false); fetchData(); }} />}
          {editingAssessment && <AssessmentForm courseId={courseId} editAssessment={editingAssessment} onClose={() => { setEditingAssessment(null); }} onSuccess={() => { setEditingAssessment(null); fetchData(); }} />}
          {assessments.length === 0 ? <div className="instr-tab-empty">No assessments yet.</div> : assessments.map((a) => (
            <div key={a.id} className="instr-item-card instr-item-card--amber">
              <div className="instr-item-icon instr-item-icon--amber">
                <svg viewBox="0 0 24 24" fill="none"><path d="M7 3h8l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="instr-item-body">
                <div className="instr-item-title-row">
                  <span className="instr-item-title" style={{ cursor:'pointer' }} onClick={() => navigate(`/instructor/courses/${courseId}/assessments/${a.id}`)}>{a.title}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <button onClick={() => navigate(`/instructor/courses/${courseId}/assessments/${a.id}`)} className="instr-link-action">Questions / Results</button>
                    <button onClick={() => { setEditingAssessment(a); }} className="instr-link-action">Edit</button>
                    <button onClick={async () => { if (!confirm('Delete this assessment?')) return; await api.delete(`/courses/${courseId}/assessments/${a.id}`); fetchData(); }} className="instr-link-action instr-link-action--danger">Delete</button>
                  </div>
                </div>
                <div className="instr-item-meta-row">
                  <span className="instr-tag-pill">{a.type.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize:'13.5px', color:'var(--instr-ink-soft)' }}>{a.questions_count || 0} questions · {a.total_points} pts</span>
                  <span className={`instr-tag-pill ${a.is_published ? 'instr-tag-pill--published' : ''}`}>{a.is_published ? 'Published' : 'Draft'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Announcements ── */}
      {tab === 'announcements' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => setShowAnnouncementForm(true)} className="instr-pill-btn">+ New Announcement</button>
          </div>
          {showAnnouncementForm && <AnnouncementForm courseId={courseId} onClose={() => setShowAnnouncementForm(false)} onSuccess={() => { setShowAnnouncementForm(false); fetchData(); }} />}
          {announcements.length === 0 ? <div className="instr-tab-empty">No announcements yet. Post your first one above.</div> : announcements.map((ann) => (
            <div key={ann.id} className="instr-panel" style={{ padding:'18px 22px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' }}>
                <div style={{ flex:1 }}>
                  <h4 style={{ fontFamily:'Poppins, sans-serif', fontWeight:700, fontSize:'15px', color:'var(--instr-ink)', display:'flex', alignItems:'center', gap:'6px', margin:'0 0 8px' }}>
                    {ann.is_pinned && <PushPinIcon sx={{ fontSize: 15, color: '#f59e0b' }} />}
                    {ann.title}
                  </h4>
                  <p style={{ fontSize:'14px', color:'var(--instr-ink-soft)', margin:'0 0 6px' }}>{ann.content}</p>
                  <p style={{ fontSize:'12px', color:'var(--instr-muted)', margin:0 }}>
                    Posted {new Date(ann.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })} by {ann.author?.first_name} {ann.author?.last_name}
                  </p>
                </div>
                <button onClick={() => deleteAnnouncement(ann.id)} className="instr-link-action instr-link-action--danger" style={{ flexShrink:0 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Students ── */}
      {tab === 'students' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Join code panel */}
          <div className="instr-joincode-panel">
            <div className="instr-joincode-header">
              <div>
                <h3>Class join code</h3>
                <p>Share this code with students so they can join the course directly.</p>
              </div>
              <button onClick={() => navigate(`/instructor/courses/${courseId}/ai-summary`)} className="instr-ai-summary-btn">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 4.8L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.2L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                AI Student Summary
              </button>
            </div>
            <div className="instr-joincode-row">
              {course.join_code ? (
                <>
                  <span className="instr-joincode-value">{course.join_code}</span>
                  <button onClick={handleCopyCode} className="instr-outline-btn">
                    <ContentCopyIcon sx={{ fontSize: 15 }} />{codeCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleGenerateCode} disabled={codeLoading} className="instr-outline-btn">Regenerate</button>
                  <button onClick={handleRevokeCode} disabled={codeLoading} className="instr-outline-btn instr-outline-btn--danger">Revoke</button>
                </>
              ) : (
                <button onClick={handleGenerateCode} disabled={codeLoading} className="instr-pill-btn">{codeLoading ? 'Generating...' : 'Generate Join Code'}</button>
              )}
            </div>
          </div>
          {/* Students table */}
          <div className="instr-students-panel">
            {students.length === 0 ? <p style={{ textAlign:'center', color:'var(--instr-muted)', padding:'32px', fontFamily:'Inter, sans-serif' }}>No students enrolled yet.</p> : (
              <table className="instr-students-table">
                <thead>
                  <tr>
                    <th style={{ width:'40px' }}>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student.id}>
                      <td className="instr-student-rownum">{idx + 1}</td>
                      <td><span className="instr-student-name">{student.first_name} {student.last_name}</span></td>
                      <td style={{ color:'var(--instr-ink-soft)' }}>{student.email}</td>
                      <td><span className="instr-status instr-status--active"><i></i>{student.pivot?.status || 'active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Calendar ── */}
      {tab === 'calendar' && <CalendarTab courseId={courseId} />}
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

// ── shared form input class helper ──
const FI = 'instr-form-input';
const FB = 'instr-form-card';

function FormCard({ title, error, children }) {
  return (
    <div className={FB}>
      <h4 style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'15px', color:'var(--instr-ink)', margin:'0 0 16px' }}>{title}</h4>
      {error && <p style={{ color:'#e0453c', fontSize:'13px', marginBottom:'12px', fontFamily:'Inter,sans-serif' }}>{error}</p>}
      {children}
    </div>
  );
}

function BtnRow({ children }) {
  return <div style={{ display:'flex', gap:'10px', paddingTop:'4px' }}>{children}</div>;
}

function AssessmentForm({ courseId, onClose, onSuccess, editAssessment }) {
  const isEdit = !!editAssessment;
  const [form, setForm] = useState(isEdit ? {
    title: editAssessment.title || '',
    type: editAssessment.type || 'quiz',
    topic: editAssessment.topic || '',
    time_limit_minutes: editAssessment.time_limit_minutes || '',
    max_attempts: editAssessment.max_attempts || 1,
    is_published: editAssessment.is_published || false,
  } : { title: '', type: 'quiz', topic: '', time_limit_minutes: '', max_attempts: 1, is_published: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    // Validation
    if (!form.title.trim()) {
      setError('Assessment title is required.');
      return;
    }
    if (!form.type) {
      setError('Assessment type is required.');
      return;
    }
    if (!form.max_attempts || form.max_attempts < 1) {
      setError('Max attempts must be at least 1.');
      return;
    }
    
    setSaving(true); 
    setError('');
    try {
      const data = { ...form };
      if (!data.time_limit_minutes) delete data.time_limit_minutes;
      // Remove total_points - will be calculated from questions
      delete data.total_points;
      
      if (isEdit) {
        await api.put(`/courses/${courseId}/assessments/${editAssessment.id}`, data);
      } else {
        await api.post(`/courses/${courseId}/assessments`, data);
      }
      onSuccess();
    }
    catch (err) { setError(err.response?.data?.message || 'Failed.'); } finally { setSaving(false); }
  };
  
  return (
    <FormCard title={isEdit ? 'Edit Assessment' : '🆕 CREATE NEW ASSESSMENT - UPDATED VERSION 2.0'} error={error}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        <input type="text" placeholder="Assessment title *" value={form.title} required onChange={e => setForm({...form, title:e.target.value})} className={FI} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <select value={form.type} onChange={e => setForm({...form, type:e.target.value})} className={FI} required>
            <option value="quiz">Quiz</option><option value="long_exam">Long Exam</option><option value="individual_activity">Individual Activity</option>
          </select>
          <input type="text" placeholder="Topic tag (optional)" value={form.topic} onChange={e => setForm({...form, topic:e.target.value})} className={FI} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div><label className="instr-form-label">Time limit (minutes)</label><input type="number" value={form.time_limit_minutes} placeholder="No limit" min={1} onChange={e => setForm({...form, time_limit_minutes:e.target.value})} className={FI} /></div>
          <div><label className="instr-form-label">Max attempts *</label><input type="number" value={form.max_attempts} min={1} required onChange={e => setForm({...form, max_attempts:parseInt(e.target.value)||1})} className={FI} /></div>
        </div>
        <label className="instr-form-check"><input type="checkbox" checked={form.is_published} onChange={e => setForm({...form, is_published:e.target.checked})} /> Publish immediately</label>
        <p style={{ fontSize:'12px', color:'var(--instr-muted)', background:'var(--instr-bg)', padding:'8px 12px', borderRadius:'6px', margin:0 }}>
          ℹ️ Total points will be calculated based on the questions you add.
        </p>
        <BtnRow>
          <button type="submit" disabled={saving} className="instr-pill-btn" style={{opacity:saving?0.6:1}}>{saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Assessment')}</button>
          <button type="button" onClick={onClose} className="instr-outline-btn">Cancel</button>
        </BtnRow>
      </form>
    </FormCard>
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
      if (addToCalendar && calendarDate) {
        await api.post(`/courses/${courseId}/calendar`, { title:form.title, event_type:'other', start_date:calendarDate, description:form.content, color:'#f59e0b' });
      }
      onSuccess();
    } catch (err) { setError(err.response?.data?.message || 'Failed.'); } finally { setSaving(false); }
  };
  return (
    <FormCard title="Post Announcement" error={error}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        <input type="text" placeholder="Announcement title" value={form.title} required onChange={e => setForm({...form, title:e.target.value})} className={FI} />
        <textarea placeholder="Announcement content..." value={form.content} rows={4} required onChange={e => setForm({...form, content:e.target.value})} className={FI} style={{ resize:'vertical' }} />
        <label className="instr-form-check"><input type="checkbox" checked={form.is_pinned} onChange={e => setForm({...form, is_pinned:e.target.checked})} /><PushPinIcon sx={{fontSize:15}} /> Pin this announcement</label>
        <div style={{ border:'1px solid var(--instr-line)', borderRadius:'10px', padding:'12px', background:'var(--instr-panel)' }}>
          <label className="instr-form-check"><input type="checkbox" checked={addToCalendar} onChange={e => setAddToCalendar(e.target.checked)} /> 📅 Add to students' calendar</label>
          {addToCalendar && (
            <div style={{ marginTop:'8px' }}>
              <label className="instr-form-label">Event date & time</label>
              <input type="datetime-local" value={calendarDate} required={addToCalendar} onChange={e => setCalendarDate(e.target.value)} className={FI} />
            </div>
          )}
        </div>
        <BtnRow>
          <button type="submit" disabled={saving} className="instr-pill-btn">{saving ? 'Posting...' : 'Post Announcement'}</button>
          <button type="button" onClick={onClose} className="instr-outline-btn">Cancel</button>
        </BtnRow>
      </form>
    </FormCard>
  );
}

function newBlankQuestion() {
  return { question_text:'', type:'multiple_choice', options:['','','',''], correct_answer:'', points:1,
    matching_pairs:[
      {left_item:'',right_item:'',correct_match:''},
      {left_item:'',right_item:'',correct_match:''}
    ] 
  };
}

function QuestionForm({ courseId, assessmentId, onClose, onSuccess }) {
  const [questions, setQuestions] = useState([newBlankQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateQ = (i, f, v) => setQuestions(p => p.map((q, idx) => idx===i ? {...q, [f]:v} : q));
  const updateOpt = (qi, oi, v) => setQuestions(p => p.map((q, i) => {
    if(i!==qi) return q; const o=[...q.options]; o[oi]=v; return {...q, options:o};
  }));
  const updatePair = (qi, pi, field, v) => setQuestions(p => p.map((q, i) => {
    if(i!==qi) return q;
    const pairs=[...q.matching_pairs]; pairs[pi]={...pairs[pi],[field]:v}; return {...q, matching_pairs:pairs};
  }));
  const addPair = (qi) => setQuestions(p => p.map((q,i) => i===qi ? {...q, matching_pairs:[...q.matching_pairs,{left_item:'',right_item:'',correct_match:''}]} : q));
  const removePair = (qi, pi) => setQuestions(p => p.map((q,i) => {
    if(i!==qi || q.matching_pairs.length<=2) return q;
    return {...q, matching_pairs:q.matching_pairs.filter((_,idx)=>idx!==pi)};
  }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    // Validate
    for (let i=0; i<questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) { setError(`Question ${i+1}: missing question text.`); setSaving(false); return; }
      if (q.type==='matching') {
        for (let j=0; j<q.matching_pairs.length; j++) {
          const p=q.matching_pairs[j];
          if (!p.left_item.trim()||!p.right_item.trim()||!p.correct_match.trim()) {
            setError(`Question ${i+1}, Pair ${j+1}: all fields required.`); setSaving(false); return;
          }
        }
      }
    }
    try {
      const cleaned = questions.map(q => {
        const out={...q};
        if(q.type==='essay'){ delete out.options; delete out.correct_answer; delete out.matching_pairs; }
        else if(q.type==='short_answer'){ delete out.options; delete out.matching_pairs; }
        else if(q.type==='true_false'){ out.options=['True','False']; delete out.matching_pairs; }
        else if(q.type==='matching'){ delete out.options; delete out.correct_answer; }
        else { out.options=out.options.filter(o=>o.trim()!==''); delete out.matching_pairs; }
        return out;
      });
      await api.post(`/courses/${courseId}/assessments/${assessmentId}/questions/bulk`, { questions:cleaned });
      onSuccess();
    } catch (err) { setError(err.response?.data?.message || 'Failed.'); } finally { setSaving(false); }
  };

  return (
    <FormCard title="Add Questions" error={error}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
        {questions.map((q, idx) => (
          <div key={idx} className="instr-panel" style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontFamily:'Inter,sans-serif', fontWeight:600, fontSize:'13.5px', color:'var(--instr-ink-soft)' }}>Question {idx+1}</span>
              {questions.length > 1 && <button type="button" onClick={() => setQuestions(p=>p.filter((_,i)=>i!==idx))} className="instr-link-action instr-link-action--danger">Remove</button>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <textarea placeholder="Question text" value={q.question_text} rows={2} required onChange={e=>updateQ(idx,'question_text',e.target.value)} className={FI} style={{resize:'vertical'}} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <select value={q.type} onChange={e=>updateQ(idx,'type',e.target.value)} className={FI}>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="essay">Essay</option>
                  <option value="matching">Matching</option>
                </select>
                <input type="number" value={q.points} min={1} placeholder="Points" onChange={e=>updateQ(idx,'points',parseInt(e.target.value))} className={FI} />
              </div>

              {/* Multiple choice */}
              {q.type==='multiple_choice' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {q.options.map((opt,oi) => (
                    <div key={oi} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <input type="radio" name={`correct-${idx}`} checked={q.correct_answer===opt && opt!==''}
                        onChange={() => { if(opt.trim()) updateQ(idx,'correct_answer',opt); }}
                        title="Mark as correct" style={{flexShrink:0, accentColor:'#2e7d52'}} />
                      <input type="text" value={opt} placeholder={`Option ${oi+1}`} onChange={e=>updateOpt(idx,oi,e.target.value)} className={FI} style={{flex:1}} />
                    </div>
                  ))}
                  <p style={{ fontSize:'12px', color:'var(--instr-muted)' }}>Click the radio button next to the correct answer.</p>
                </div>
              )}

              {/* True / False */}
              {q.type==='true_false' && (
                <div style={{ display:'flex', gap:'10px' }}>
                  {['True','False'].map(v => (
                    <label key={v} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', padding:'8px 16px', border:`1.5px solid ${q.correct_answer===v?'var(--instr-green-600)':'var(--instr-line)'}`, borderRadius:'8px', fontWeight:600, fontSize:'13.5px', color:q.correct_answer===v?'var(--instr-green-600)':'var(--instr-ink-soft)', background:q.correct_answer===v?'var(--instr-green-50, #f0fdf4)':'transparent' }}>
                      <input type="radio" name={`tf-${idx}`} value={v} checked={q.correct_answer===v} onChange={()=>updateQ(idx,'correct_answer',v)} style={{accentColor:'#2e7d52'}} />
                      {v}
                    </label>
                  ))}
                </div>
              )}

              {/* Short answer */}
              {q.type==='short_answer' && (
                <input type="text" placeholder="Expected answer (leave blank to grade manually)" value={q.correct_answer} onChange={e=>updateQ(idx,'correct_answer',e.target.value)} className={FI} />
              )}

              {/* Essay */}
              {q.type==='essay' && (
                <p style={{ fontSize:'12px', color:'var(--instr-muted)', background:'var(--instr-bg)', padding:'10px 12px', borderRadius:'8px' }}>Essay questions are graded manually.</p>
              )}

              {/* Matching pairs */}
              {q.type==='matching' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  <span style={{ fontSize:'12.5px', fontWeight:600, color:'var(--instr-ink-soft)' }}>Matching Pairs (Term → Definition)</span>
                  <p style={{ fontSize:'11px', color:'var(--instr-muted)', margin:0 }}>Enter the term and its correct definition side by side</p>
                  {q.matching_pairs.map((pair, pi) => (
                    <div key={pi} style={{ border:'1px solid var(--instr-line)', borderRadius:'10px', padding:'12px', background:'var(--instr-bg)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:'var(--instr-muted)' }}>Pair {pi+1}</span>
                        {q.matching_pairs.length>2 && <button type="button" onClick={()=>removePair(idx,pi)} className="instr-link-action instr-link-action--danger" style={{fontSize:'12px'}}>Remove</button>}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                        <div>
                          <label className="instr-form-label" style={{fontSize:'11px'}}>Term</label>
                          <input type="text" placeholder="e.g. HTML" value={pair.left_item} onChange={e=>updatePair(idx,pi,'left_item',e.target.value)} className={FI} />
                        </div>
                        <div>
                          <label className="instr-form-label" style={{fontSize:'11px'}}>Definition</label>
                          <input type="text" placeholder="e.g. Markup Language" value={pair.right_item} onChange={e=>{
                            updatePair(idx,pi,'right_item',e.target.value);
                            // Auto-set correct_match to match right_item
                            updatePair(idx,pi,'correct_match',e.target.value);
                          }} className={FI} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={()=>addPair(idx)}
                    style={{ border:'2px dashed var(--instr-line)', borderRadius:'8px', padding:'8px', fontSize:'13px', fontWeight:600, color:'var(--instr-muted)', cursor:'pointer', background:'none', fontFamily:'Inter,sans-serif' }}>
                    + Add Pair
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setQuestions(p=>[...p,newBlankQuestion()])}
          style={{ width:'100%', border:'2px dashed var(--instr-line)', borderRadius:'10px', padding:'10px', fontSize:'13.5px', fontWeight:600, color:'var(--instr-muted)', cursor:'pointer', background:'none', fontFamily:'Inter,sans-serif' }}>
          + Add Another Question
        </button>
        <BtnRow>
          <button type="submit" disabled={saving} className="instr-pill-btn">{saving ? 'Saving...' : `Save ${questions.length} Question${questions.length>1?'s':''}`}</button>
          <button type="button" onClick={onClose} className="instr-outline-btn">Cancel</button>
        </BtnRow>
      </form>
    </FormCard>
  );
}

function MaterialUploadForm({ courseId, lessonId, onClose, onSuccess }) {
  const [form, setForm] = useState({ title:'', type:'pdf' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  // Use a unique id per lessonId to avoid id collisions when multiple forms render
  const fileInputId = `file-upload-lesson-${lessonId}`;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Please enter a file title.'); return; }
    if (!file) { setError('Please select a file.'); return; }
    setSaving(true); setError(''); setProgress(0);
    const data = new FormData();
    data.append('title', form.title);
    data.append('type', form.type);
    data.append('file', file);
    try {
      await api.post(`/courses/${courseId}/lessons/${lessonId}/materials`, data, {
        // Do NOT set Content-Type manually — let the browser set multipart/form-data with the correct boundary
        headers: {},
        onUploadProgress: ev => setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <FormCard title="Upload Module File" error={error}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        <input
          type="text"
          placeholder="File title (e.g. Week 1 Module)"
          value={form.title}
          required
          onChange={e => setForm({...form, title: e.target.value})}
          className={FI}
        />
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={FI}>
          <option value="pdf">PDF</option>
          <option value="docx">Word Document (DOCX)</option>
          <option value="ppt">PowerPoint (PPT)</option>
        </select>
        <div style={{ border:'2px dashed var(--instr-line)', borderRadius:'10px', padding:'20px', textAlign:'center' }}>
          {/* Unique id per lesson prevents click-target collisions when multiple forms are on the page */}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            onChange={e => setFile(e.target.files[0])}
            style={{ display:'none' }}
            id={fileInputId}
          />
          <label htmlFor={fileInputId} style={{ cursor:'pointer', fontSize:'13.5px', color: file ? 'var(--instr-green-600)' : 'var(--instr-muted)', fontFamily:'Inter,sans-serif' }}>
            {file ? `📎 ${file.name}` : 'Click to select a PDF, DOCX, or PPT file (max 100MB)'}
          </label>
        </div>
        {saving && progress > 0 && (
          <div style={{ height:'6px', background:'var(--instr-line)', borderRadius:'99px', overflow:'hidden' }}>
            <div style={{ width:`${progress}%`, height:'100%', background:'var(--instr-green-600)', transition:'width 0.3s' }} />
          </div>
        )}
        <BtnRow>
          <button type="submit" disabled={saving} className="instr-pill-btn">
            {saving ? `Uploading ${progress}%...` : 'Upload File'}
          </button>
          <button type="button" onClick={onClose} className="instr-outline-btn">Cancel</button>
        </BtnRow>
      </form>
    </FormCard>
  );
}

function CalendarTab({ courseId }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', event_type:'other', start_date:'', description:'', color:'#3B82F6' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const typeColors = { lesson:'#3B82F6', quiz:'#F59E0B', exam:'#EF4444', activity:'#10B981', deadline:'#EF4444', other:'#6B7280' };
  const fetchEvents = () => { api.get(`/calendar?course_id=${courseId}`).then(r=>setEvents(r.data.events||[])).catch(console.error); };
  useEffect(() => { fetchEvents(); }, [courseId]);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await api.post(`/courses/${courseId}/calendar`, form); setShowForm(false); setForm({title:'',event_type:'other',start_date:'',description:'',color:'#3B82F6'}); fetchEvents(); }
    catch (err) { setError(err.response?.data?.message || 'Failed.'); } finally { setSaving(false); }
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button onClick={() => setShowForm(true)} className="instr-pill-btn">+ Add Event</button>
      </div>
      {showForm && (
        <FormCard title="Add Calendar Event" error={error}>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <input type="text" placeholder="Event title" value={form.title} required onChange={e=>setForm({...form,title:e.target.value})} className={FI} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})} className={FI}>
                {['lesson','quiz','exam','activity','deadline','other'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <input type="datetime-local" value={form.start_date} required onChange={e=>setForm({...form,start_date:e.target.value})} className={FI} />
            </div>
            <textarea placeholder="Description (optional)" value={form.description} rows={2} onChange={e=>setForm({...form,description:e.target.value})} className={FI} style={{resize:'vertical'}} />
            <BtnRow>
              <button type="submit" disabled={saving} className="instr-pill-btn">{saving ? 'Saving...' : 'Add Event'}</button>
              <button type="button" onClick={()=>setShowForm(false)} className="instr-outline-btn">Cancel</button>
            </BtnRow>
          </form>
        </FormCard>
      )}
      {events.length === 0 ? <div className="instr-tab-empty">No events yet.</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {events.map(ev => (
            <div key={ev.id} className="instr-panel" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'4px', height:'42px', borderRadius:'99px', background:ev.color||typeColors[ev.event_type]||'#6B7280', flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:'14.5px', color:'var(--instr-ink)', margin:'0 0 3px', fontFamily:'Poppins,sans-serif' }}>{ev.title}</p>
                <p style={{ fontSize:'13px', color:'var(--instr-muted)', margin:0 }}>
                  {new Date(ev.start_date).toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'})} · <span style={{textTransform:'capitalize'}}>{ev.event_type}</span>
                </p>
              </div>
              <button onClick={async()=>{ if(!confirm('Delete this event?')) return; await api.delete(`/calendar/${ev.id}`); fetchEvents(); }} className="instr-link-action instr-link-action--danger">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

