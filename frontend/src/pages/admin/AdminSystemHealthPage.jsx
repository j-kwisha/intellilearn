import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminSystemHealthPage.css';

const STATUS_LABELS = { healthy: 'Healthy', attention: 'Needs attention', failed: 'Issue detected' };

export default function AdminSystemHealthPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runChecks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/system-health');
      setReport(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not run system checks. Try again or review the backend logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  return <section className="admin-system-health">
    <header className="system-health-heading">
      <div>
        <h2>System Health</h2>
        <p>Check the core services that can affect logins, uploads, email, and AI features.</p>
      </div>
      <button type="button" className="system-health-run" onClick={runChecks} disabled={loading}>
        <span aria-hidden="true">↻</span> {loading ? 'Checking…' : 'Run checks'}
      </button>
    </header>

    <div className="system-health-note" role="note">
      <strong>Diagnostics only</strong>
      <span>These checks identify common service problems. They do not restart services or repair application code automatically.</span>
    </div>

    {error && <p className="system-health-error" role="alert">{error}</p>}
    {report && <>
      <div className={`system-health-summary system-health-summary--${report.status}`} role="status">
        <span className="system-health-summary-icon" aria-hidden="true">{report.status === 'healthy' ? '✓' : '!'}</span>
        <div>
          <strong>{report.status === 'healthy' ? 'All checked services are responding' : report.status === 'failed' ? 'One or more services need investigation' : 'Some settings need attention'}</strong>
          <p>Last checked {new Date(report.checked_at).toLocaleString()}</p>
        </div>
      </div>

      <div className="system-health-grid">
        {report.checks.map(check => <article key={check.key} className={`system-health-card system-health-card--${check.status}`}>
          <div className="system-health-card-top">
            <h3>{check.label}</h3>
            <span className={`system-health-badge system-health-badge--${check.status}`}>{STATUS_LABELS[check.status] || 'Unknown'}</span>
          </div>
          <p>{check.message}</p>
          {check.next_step && <div className="system-health-next"><strong>Next step</strong><span>{check.next_step}</span></div>}
        </article>)}
      </div>

      <p className="system-health-footnote">The email check verifies configuration only; it does not send a test message. The AI check calls the AI service’s health endpoint without generating content.</p>
    </>}
    {!report && loading && <div className="system-health-loading" aria-live="polite">Checking database, storage, email configuration, and AI service…</div>}
  </section>;
}
