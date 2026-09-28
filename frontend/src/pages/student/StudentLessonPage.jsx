import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DatasetIcon from '@mui/icons-material/Dataset';
import LinkIcon from '@mui/icons-material/Link';
import AttachFileIcon from '@mui/icons-material/AttachFile';

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    api.get(`/courses/${courseId}/lessons/${lessonId}`)
      .then((res) => setLesson(res.data.lesson))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, lessonId]);

  const markAsDone = async () => {
    setMarking(true);
    const secondsSpent = Math.round((Date.now() - startTime.current) / 1000);

    try {
      await api.put(`/courses/${courseId}/lessons/${lessonId}/progress`, {
        status: 'done',
        time_spent_seconds: secondsSpent,
      });
      setLesson((prev) => ({ ...prev, my_progress: 'done' }));
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (!lesson) return <p className="text-slate-500">Lesson not found.</p>;

  const statusColors = {
    pending: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700',
    missing: 'bg-red-100 text-red-700',
  };

  const getMaterialIcon = (type) => {
    const iconProps = { sx: { fontSize: 28, color: 'var(--purple-primary)' } };
    switch (type) {
      case 'pdf':
        return <PictureAsPdfIcon {...iconProps} />;
      case 'video':
        return <VideoLibraryIcon {...iconProps} />;
      case 'ppt':
        return <DatasetIcon {...iconProps} />;
      case 'link':
        return <LinkIcon {...iconProps} />;
      default:
        return <AttachFileIcon {...iconProps} />;
    }
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
                  <span className="text-2xl">{material.type === 'pdf' ? '📄' : material.type === 'docx' ? '📝' : material.type === 'link' ? '🔗' : '📎'}</span>
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

      {/* Mark as done button */}
      {lesson.my_progress !== 'done' && (
        <button
          onClick={markAsDone}
          disabled={marking}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold
            hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {marking ? 'Saving...' : '✓ Mark as Done'}
        </button>
      )}

      {lesson.my_progress === 'done' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-700 font-medium text-sm">✓ You've completed this lesson!</p>
        </div>
      )}
    </div>
  );
}
