import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function StudentGradesPage() {
  const navigate = useNavigate();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then(async (coursesRes) => {
        const courses = coursesRes.data.courses || [];
        const gradeData = await Promise.all(
          courses.map(async (course) => {
            try {
              const r = await api.get(`/courses/${course.id}/grades`);
              const grades = r.data.grades || [];
              // Find the current student's grade
              const myGrade = grades[0] ?? null; // API already filters to current student
              return { course, grade: myGrade };
            } catch {
              return { course, grade: null };
            }
          })
        );
        setGrades(gradeData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const remarksColor = (remarks) => {
    if (!remarks) return 'bg-slate-100 text-slate-500';
    if (remarks === 'Passed') return 'bg-emerald-100 text-emerald-700';
    if (remarks === 'Failed') return 'bg-red-100 text-red-600';
    return 'bg-amber-100 text-amber-700';
  };

  const gradeColor = (grade) => {
    if (grade == null) return 'text-slate-400';
    if (grade >= 75) return 'text-emerald-600';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800">My Grades</h2>
        <p className="text-sm text-slate-500 mt-1">View your overall grade for each enrolled course.</p>
      </div>

      {grades.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-400 text-sm">No grade data available yet. Complete assessments to see your grades here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map(({ course, grade }) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => navigate(`/student/courses/${course.id}`)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">{course.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{course.code} · {course.section} · {course.semester}</p>
                  {grade && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {grade.quiz_average != null && (
                        <span className="text-xs text-slate-500">Quiz: <strong>{parseFloat(grade.quiz_average).toFixed(1)}%</strong></span>
                      )}
                      {grade.exam_average != null && (
                        <span className="text-xs text-slate-500">Exam: <strong>{parseFloat(grade.exam_average).toFixed(1)}%</strong></span>
                      )}
                      {grade.activity_average != null && (
                        <span className="text-xs text-slate-500">Activity: <strong>{parseFloat(grade.activity_average).toFixed(1)}%</strong></span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {grade?.overall_grade != null ? (
                    <>
                      <p className={`text-3xl font-bold ${gradeColor(grade.overall_grade)}`}>
                        {parseFloat(grade.overall_grade).toFixed(1)}%
                      </p>
                      <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${remarksColor(grade.remarks)}`}>
                        {grade.remarks || '—'}
                      </span>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-400">No grade yet</p>
                      <p className="text-xs text-slate-300 mt-0.5">Pending computation</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
