import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function InstructorAiSummaryPage() {
  const { courseId } = useParams();
  const [results, setResults] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/ai/courses/${courseId}/student-risk`),
    ])
      .then(([courseRes, riskRes]) => {
        setCourse(courseRes.data.course);
        setResults(riskRes.data.results || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load AI summary.'))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  );

  const atRiskCount = results.filter((r) => r.at_risk === true).length;
  const safeCount = results.filter((r) => r.at_risk === false).length;

  return (
    <div className="page-content">
      <div className="dashboard-main">
        <header className="dashboard-title-row">
          <div>
            <h1>AI Student Summary</h1>
            <p className="dashboard-subtitle">{course?.name} — Risk analysis for all enrolled students.</p>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">{error}</div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-500">Total Students</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{results.length}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-sm text-red-600">At Risk</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{atRiskCount}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-sm text-emerald-600">Not At Risk</p>
            <p className="text-3xl font-bold text-emerald-700 mt-1">{safeCount}</p>
          </div>
        </div>

        {/* Student list */}
        {results.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            No students enrolled yet.
          </div>
        ) : (
          <div className="space-y-3">
            {results
              .sort((a, b) => (b.risk_probability ?? 0) - (a.risk_probability ?? 0))
              .map((item, idx) => (
                <div key={idx} className={`bg-white rounded-xl border p-5 ${
                  item.at_risk === true ? 'border-red-200' : 'border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.student?.first_name} {item.student?.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{item.student?.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      item.at_risk === true ? 'bg-red-100 text-red-700' :
                      item.at_risk === false ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {item.at_risk === true ? '⚠️ At Risk' :
                       item.at_risk === false ? '✅ Safe' : 'N/A'}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      { label: 'Quiz Avg', value: `${item.metrics?.quiz_avg ?? 0}%` },
                      { label: 'Logins', value: item.metrics?.login_count ?? 0 },
                      { label: 'Submission', value: `${((item.metrics?.submission_rate ?? 0) * 100).toFixed(0)}%` },
                      { label: 'Missed', value: item.metrics?.missed_tasks ?? 0 },
                    ].map((m) => (
                      <div key={m.label} className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-slate-400">{m.label}</p>
                        <p className="text-sm font-bold text-slate-700">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reasons */}
                  {item.reasons?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.reasons.map((r, i) => (
                        <span key={i} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
