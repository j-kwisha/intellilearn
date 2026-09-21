import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function StudentRiskCheckPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/ai/my-risk')
      .then((res) => setResults(res.data.results || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load risk data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="page-content">
      <div className="dashboard-main">
        <header className="dashboard-title-row">
          <div>
            <h1>My Risk Status</h1>
            <p className="dashboard-subtitle">AI-based analysis of your academic performance per course.</p>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">{error}</div>
        )}

        {results.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            No enrolled courses found.
          </div>
        )}

        <div className="space-y-4">
          {results.map((item, idx) => (
            <div key={idx} className={`bg-white rounded-xl border-2 p-6 ${
              item.at_risk === true ? 'border-red-300' :
              item.at_risk === false ? 'border-emerald-300' : 'border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{item.course?.name}</h3>
                  <p className="text-sm text-slate-500">{item.course?.code}</p>
                </div>
                <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${
                  item.at_risk === true ? 'bg-red-100 text-red-700' :
                  item.at_risk === false ? 'bg-emerald-100 text-emerald-700' :
                  item.status === 'not_assessed' ? 'bg-slate-100 text-slate-500' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {item.at_risk === true ? '⚠️ At Risk' :
                   item.at_risk === false ? '✅ Not At Risk' :
                   item.status === 'not_assessed' ? '📊 Not Assessed Yet' : 'N/A'}
                </span>
              </div>

              {/* Not assessed message */}
              {item.status === 'not_assessed' && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                  📊 Risk assessment requires at least one quiz submission or activity. Complete some assessments for your risk status to be calculated.
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
                <MetricCard label="Quiz Avg" value={`${item.metrics?.quiz_avg ?? 0}%`} />
                <MetricCard label="Logins" value={item.metrics?.login_count ?? 0} />
                <MetricCard label="Submission Rate" value={`${((item.metrics?.submission_rate ?? 0) * 100).toFixed(0)}%`} />
                <MetricCard label="Missed Tasks" value={item.metrics?.missed_tasks ?? 0} />
              </div>

              {/* Risk probability */}
              {item.risk_probability !== null && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Risk Level</span>
                    <span>{(item.risk_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${item.at_risk ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(item.risk_probability * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Reasons */}
              {item.reasons?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Contributing factors:</p>
                  <ul className="space-y-1">
                    {item.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                        <span>•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-bold text-slate-800">{value}</p>
    </div>
  );
}
