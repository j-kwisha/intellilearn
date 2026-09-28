import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import PushPinIcon from '@mui/icons-material/PushPin';

export default function StudentCoursePage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tab, setTab] = useState('lessons');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/lessons`),
      api.get(`/courses/${courseId}/assessments`),
      api.get(`/courses/${courseId}/announcements`),
    ])
      .then(([courseRes, lessonsRes, assessmentsRes, annRes]) => {
        setCourse(courseRes.data.course);
        setLessons(lessonsRes.data.lessons);
        setAssessments(assessmentsRes.data.assessments);
        setAnnouncements(annRes.data.announcements);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (!course) return <p className="text-slate-500">Course not found.</p>;

  const statusColors = {
    pending: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700',
    missing: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Course header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800">{course.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{course.code} · {course.section} · {course.semester}</p>
        {course.description && <p className="text-sm text-slate-600 mt-3">{course.description}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {['lessons', 'assessments', 'announcements'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors
              ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lessons tab */}
      {tab === 'lessons' && (
        <div className="space-y-3">
          {lessons.length === 0 ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
              No lessons available yet.
            </p>
          ) : (
            lessons.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/student/courses/${courseId}/lessons/${lesson.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 
                  hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      Lesson {lesson.order + 1}: {lesson.title}
                    </h4>
                    {lesson.topic && (
                      <span className="inline-block mt-1.5 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {lesson.topic}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize
                    ${statusColors[lesson.my_progress] || statusColors.pending}`}>
                    {lesson.my_progress || 'pending'}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Assessments tab */}
      {tab === 'assessments' && (
        <div className="space-y-3">
          {assessments.length === 0 ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
              No assessments available yet.
            </p>
          ) : (
            assessments.map((assessment) => (
              <Link
                key={assessment.id}
                to={`/student/courses/${courseId}/assessments/${assessment.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 
                  hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800">{assessment.title}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                        {assessment.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {assessment.questions_count} questions · {assessment.total_points} pts
                      </span>
                      {assessment.time_limit_minutes && (
                        <span className="text-xs text-slate-400">
                          ⏱ {assessment.time_limit_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                  {assessment.my_best_score !== null && assessment.my_best_score !== undefined && (
                    <span className={`text-sm font-bold ${
                      assessment.my_best_score >= 75 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {assessment.my_best_score}%
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
      {/* Announcements tab */}
      {tab === 'announcements' && (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
              No announcements yet.
            </p>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  {ann.is_pinned && (
                    <PushPinIcon sx={{ fontSize: 16, color: '#f59e0b', marginTop: '3px', flexShrink: 0 }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{ann.title}</h4>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ann.content}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Posted by {ann.author?.first_name} {ann.author?.last_name} ·{' '}
                      {new Date(ann.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
