export function PlaceholderPage({ title }) {
  const icons = {
    Reports: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M20 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    Courses: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M2 5.5S4 4 8 4s6 1.5 6 1.5v14S12 18 8 18s-6 1.5-6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M22 5.5S20 4 16 4s-6 1.5-6 1.5v14S12 18 16 18s6 1.5 6 1.5v-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
  };

  return (
    <div className="adm-coming-soon">
      <div className="adm-coming-soon-icon">
        {icons[title] || (
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <h2>This page is coming soon.</h2>
      <p>We're building out {title}. Check back soon.</p>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800">403</h1>
        <p className="text-slate-500 mt-2">You don't have permission to access this page.</p>
      </div>
    </div>
  );
}
