export default function ThemeSwitch({ darkMode, onToggle }) {
  return (
    <button type="button" className="student-theme-toggle" onClick={onToggle}
      role="switch" aria-label="Dark mode" aria-checked={darkMode}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
      <span className={`student-theme-track${darkMode ? ' is-dark' : ''}`} aria-hidden="true">
        <span className="student-theme-stars" />
        <span className="student-theme-cloud student-theme-cloud-one" />
        <span className="student-theme-cloud student-theme-cloud-two" />
        <span className="student-theme-orb" />
      </span>
      <span className="student-theme-label">{darkMode ? 'Dark' : 'Light'}</span>
    </button>
  );
}
