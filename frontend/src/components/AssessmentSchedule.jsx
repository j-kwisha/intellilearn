function scheduleTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  });
}

export default function AssessmentSchedule({ assessment, className = 'mt-2 text-xs text-slate-500' }) {
  const start = scheduleTime(assessment.available_from);
  const end = scheduleTime(assessment.due_date);
  if (!start && !end) return null;

  return (
    <div className={`flex flex-wrap gap-x-6 gap-y-1 ${className}`}>
      {start && <p className="m-0">
        <span className="font-semibold">Start: </span>
        <time dateTime={assessment.available_from}>{start}</time>
      </p>}
      {end && <p className="m-0">
        <span className="font-semibold">End: </span>
        <time dateTime={assessment.due_date}>{end}</time>
      </p>}
    </div>
  );
}
