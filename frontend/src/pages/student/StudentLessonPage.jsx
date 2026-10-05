import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AUTO_DONE_SECONDS = 30;

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markError, setMarkError] = useState('');
  const [autoMarked, setAutoMarked] = useState(false);
  const startTime = useRef(null);
  const timerRef = useRef(null);
  const markedRef = useRef(false);

  useEffect(() => {
    api.get(`/courses/${courseId}/lessons/${lessonId}`)
      .then((res) => {
        const l = res.data.lesson;
        setLesson(l);
        setAutoMarked(l.my_progress === 'done');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, lessonId]);

  const markAsDone = useCallback(async () => {
    if (markedRef.current) return;
    markedRef.current = true;
    setMarkError('');
    const secondsSpent = Math.round((Date.now() - (startTime.current ?? Date.now())) / 1000);
    try {
      await api.put(`/courses/${courseId}/lessons/${lessonId}/progress`, {
        status: 'done',
        time_spent_seconds: secondsSpent,
      });
      setLesson((prev) => ({ ...prev, my_progress: 'done' }));
      setAutoMarked(true);
    } catch (err) {
      console.error(err);
      markedRef.current = false;
      setMarkError(err.response?.data?.message || 'Could not mark lesson as done. Please try again.');
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    startTime.current = Date.now();
    markedRef.current = false;
  }, [courseId, lessonId]);

  // Keep network side effects outside the countdown state updater.
  useEffect(() => {
    if (!lesson || String(lesson.id) !== String(lessonId) || lesson.my_progress === 'done' || autoMarked) return;
    let remaining = AUTO_DONE_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        void markAsDone();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [lesson, lessonId, autoMarked, markAsDone]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!lesson) return <p className="text-slate-500">Lesson not found.</p>;

  const statusColors = {
    pending: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700',
    missing: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(`/student/courses/${courseId}`)}
        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
      >
        ← Back to course
      </button>

      {/* Lesson header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{lesson.title}</h2>
            {lesson.topic && (
              <span className="inline-block mt-2 text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
                {lesson.topic}
              </span>
            )}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0
            ${statusColors[lesson.my_progress] || statusColors.pending}`}>
            {lesson.my_progress || 'pending'}
          </span>
        </div>
        {lesson.description && (
          <p className="text-sm text-slate-600 mt-4 leading-relaxed">{lesson.description}</p>
        )}
      </div>

      {/* Materials */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Lesson Materials</h3>
        {!lesson.materials || lesson.materials.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500">No materials uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lesson.materials.map((material) => (
              <div key={material.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {material.type === 'pdf' ? '📄' : material.type === 'docx' ? '📝' : material.type === 'link' ? '🔗' : '📎'}
                  </span>
                  <div>
                    <h4 className="font-medium text-slate-800 text-sm">{material.title}</h4>
                    <p className="text-xs text-slate-400 uppercase mt-0.5">{material.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/student/courses/${courseId}/lessons/${lessonId}/materials/${material.id}`, { state: { material } })}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg transition-colors"
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time tracking info */}
      {lesson.time_spent_seconds > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <span className="text-lg">⏱</span>
          <p className="text-sm text-slate-600">
            Time spent: <span className="font-medium">
              {Math.floor(lesson.time_spent_seconds / 60)} min {lesson.time_spent_seconds % 60} sec
            </span>
          </p>
        </div>
      )}

      {/* Auto-done countdown — hidden from students, runs silently in background */}

      {/* Error message */}
      {markError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-red-600 text-sm font-medium">{markError}</p>
          <button
            onClick={markAsDone}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Completed banner */}
      {(lesson.my_progress === 'done' || autoMarked) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-700 font-medium text-sm">✓ You've completed this lesson!</p>
        </div>
      )}
    </div>
  );
}
