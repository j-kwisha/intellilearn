import { useEffect, useState } from 'react';
import api from '../../services/api';
import { reportCsv } from '../../services/reportExport';
import './AdminReportsPage.css';

const emptyFilters = { course_id: '', instructor_id: '', from: '', to: '' };
const percent = value => value === null ? '—' : `${Number(value).toFixed(1)}%`;
const riskLabels = { at_risk: 'At risk', not_at_risk: 'Not flagged by AI', insufficient_data: 'Insufficient data',
  unavailable: 'AI unavailable', not_requested: 'Checking AI…' };

function ReportTable({ headings, children, empty, columns }) {
  return <div className="adm-table-wrap"><table className="adm-courses-table">
    <thead><tr>{headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{empty ? <tr><td colSpan={columns} className="report-empty">No records match this view.</td></tr> : children}</tbody>
  </table></div>;
}

export default function AdminReportsPage() {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [revision, setRevision] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [exportSection, setExportSection] = useState('courses');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setRiskLoading(false);
      setError('');
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
      try {
        const response = await api.get('/admin/reports', { params, signal: controller.signal });
        if (controller.signal.aborted) return;
        setReport(response.data);
        setLoading(false);
        if (!response.data.students.some(s => s.risk_status === 'not_requested')) return;
        setRiskLoading(true);
        try {
          const risk = await api.get('/admin/reports', { params: { ...params, include_risk: 1 }, signal: controller.signal });
          if (!controller.signal.aborted) setReport(risk.data);
        } catch {
          if (!controller.signal.aborted) setReport(current => ({ ...current,
            students: current.students.map(s => s.risk_status === 'not_requested' ? { ...s, risk_status: 'unavailable' } : s),
          }));
        } finally {
          if (!controller.signal.aborted) setRiskLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.response?.status === 422 ? 'The report filters are invalid. Check the course, instructor and dates.' : 'Could not load reports. Please retry.');
          setLoading(false);
        }
      }
    }
    load();
    return () => controller.abort();
  }, [filters, revision]);

  function applyFilters(event) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) {
      setFilterError('The end date must be on or after the start date.');
      return;
    }
    setFilterError('');
    setFilters({ ...draft });
  }

  function exportReport() {
    const url = URL.createObjectURL(new Blob([reportCsv(report, exportSection)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `intellilearn-${exportSection}-report.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const students = (report?.students || []).filter(s =>
    (showAll || s.attention_reasons.length > 0 || s.risk_status === 'at_risk') &&
    `${s.student_name} ${s.email} ${s.course_name}`.toLowerCase().includes(search.toLowerCase()));
  const unavailable = report?.students.filter(s => s.risk_status === 'unavailable').length || 0;

  return <div className="admin-reports">
    <div className="report-heading"><div>
      <h2>Academic Reports</h2>
      <p>Course performance, student support and grading progress across IntelliLearn.</p>
    </div><div className="report-actions report-no-print">
      <button type="button" onClick={() => setRevision(v => v + 1)} disabled={loading}>Refresh</button>
      <button type="button" onClick={() => window.print()} disabled={loading || !report || !!error || riskLoading}>Print report</button>
    </div></div>

    <form className="report-filters report-no-print" onSubmit={applyFilters}>
      <label>Course<select value={draft.course_id} onChange={e => setDraft({ ...draft, course_id: e.target.value })}>
        <option value="">All courses</option>{report?.options.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>
      <label>Instructor<select value={draft.instructor_id} onChange={e => setDraft({ ...draft, instructor_id: e.target.value })}>
        <option value="">All instructors</option>{report?.options.instructors.map(i => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}
      </select></label>
      <label>Deadline from (UTC)<input type="date" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label>Deadline to (UTC)<input type="date" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <button className="adm-new-course-btn" disabled={loading}>Apply filters</button>
      <button type="button" onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); setFilterError(''); }} disabled={loading}>Reset</button>
    </form>
    {filterError && <p className="report-error" role="alert">{filterError}</p>}
    {loading ? <p role="status" className="report-message">Loading academic reports…</p> : error ?
      <div className="report-error" role="alert">{error} <button onClick={() => setRevision(v => v + 1)}>Retry</button></div> : report && <>
      <p className="report-meta">Generated: {new Date(report.generated_at).toLocaleString('en-PH', { timeZoneName: 'short' })}<br />
        Course: {report.options.courses.find(c => String(c.id) === String(report.filters.course_id))?.name || 'All courses'} · Instructor: {(() => {
          const instructor = report.options.instructors.find(i => String(i.id) === String(report.filters.instructor_id));
          return instructor ? `${instructor.first_name} ${instructor.last_name}` : 'All instructors';
        })()} · Assessment deadlines (UTC): {report.filters.from || 'Any'} to {report.filters.to || 'Any'}
      </p>
      <div className="report-summary">
        {[["Enrolled students", report.overview.students], ["Assigned instructors", report.overview.instructors],
          ["Active courses", report.overview.active_courses], ["Active enrollments", report.overview.enrollments],
          ["Awaiting grading", report.overview.pending_grading], ["Grading errors", report.overview.grading_errors]].map(([label, value]) =>
          <div className="report-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="report-export report-no-print">
        <label>CSV report<select value={exportSection} onChange={e => setExportSection(e.target.value)}>
          <option value="courses">Course comparisons</option><option value="students">All student/course results</option><option value="summary">Overview and grading</option>
        </select></label>
        <button onClick={exportReport} disabled={riskLoading}>Export CSV</button>
      </div>
      <section className="adm-courses-panel report-panel">
        <div className="adm-panel-header"><h3 className="adm-panel-title">Course comparison</h3></div>
        <ReportTable headings={['Course / instructor', 'Students', 'Average score', 'Submissions', 'Overdue missing', 'Grading']} columns={6} empty={!report.courses.length}>
          {report.courses.map(c => <tr key={c.id}>
            <td><strong>{c.name}</strong><small>{c.code} · {c.instructor_name}</small></td><td>{c.student_count}</td>
            <td>{percent(c.average_score)}</td><td>{c.submitted_count} / {c.expected_count}<small>{percent(c.submission_rate)}</small></td>
            <td>{c.missed_assessments}</td><td>{c.pending_grading} pending<small>{c.grading_errors} errors</small></td>
          </tr>)}
        </ReportTable>
      </section>
      <section className="adm-courses-panel report-panel">
        <div className="adm-panel-header"><h3 className="adm-panel-title">Students needing attention</h3></div>
        <div className="report-student-tools report-no-print">
          <label>Find student or course<input type="search" value={search} placeholder="Name, email or course" onChange={e => setSearch(e.target.value)} /></label>
          <label className="report-checkbox"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> Show all student/course results</label>
        </div>
        <p className="report-meta">{showAll ? 'All results' : 'Students with a score below 70%, an overdue missing submission, or an AI risk flag'} · {students.length} student/course records{search && ` · Search: ${search}`}</p>
        {riskLoading && <p role="status" className="report-meta">Checking AI risk predictions… Stored scores remain available.</p>}
        {!!unavailable && <p className="report-warning" role="status">AI predictions unavailable for {unavailable} student/course records. View all results to see their status. Stored scores and overdue counts are still shown.</p>}
        <ReportTable headings={['Student', 'Course', 'Average score', 'Overdue missing', 'AI risk', 'Reasons']} columns={6} empty={!students.length}>
          {students.map(s => <tr key={`${s.course_id}-${s.student_id}`}>
            <td><strong>{s.student_name}</strong><small>{s.email}</small></td><td>{s.course_name}</td><td>{percent(s.average_score)}</td>
            <td>{s.missed_assessments}</td><td><span className={`report-risk report-risk--${s.risk_status}`}>{riskLabels[s.risk_status]}</span>
              {s.risk_probability !== null && <small>{percent(s.risk_probability)} probability</small>}</td>
            <td>{[...s.attention_reasons, ...s.risk_reasons].join('; ') || '—'}</td>
          </tr>)}
        </ReportTable>
      </section>
      <section className="adm-courses-panel report-panel">
        <div className="adm-panel-header"><h3 className="adm-panel-title">Grading status</h3></div>
        <div className="report-grading-grid">
          {[["Graded submissions", report.grading.graded_submissions], ["Pending submissions", report.grading.pending_submissions],
            ["Submissions with errors", report.grading.error_submissions], ["AI-graded essays", report.grading.ai_graded_essays],
            ["Essays awaiting teacher grading", report.grading.pending_essays], ["Essay grading errors", report.grading.error_essays],
            ["Teacher-overridden essays", report.grading.teacher_overrides]].map(([label, value]) =>
            <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>
      <p className="report-notes">Reports use active student enrollments and published assessments. Averages use each student’s best graded attempt per assessment; pending work is excluded and these are not final course grades.
        Submission rates count each student/assessment once, excluding future schedules and paper-based assessments.
        Missing submissions count only deadlines that have passed since enrollment.
        Date filters select assessment deadlines in UTC; undated assessments are excluded when a date filter is applied.
        Grading counts include submitted attempts, including retakes. Teacher overrides are counted separately from current AI grades.
        AI activity uses distinct submission days as a proxy, not actual login counts; successful predictions may be cached for five minutes.</p>
    </>}
  </div>;
}
