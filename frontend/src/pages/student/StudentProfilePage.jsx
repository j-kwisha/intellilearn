import { useEffect, useRef, useState } from 'react';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useAuth } from '../../context/AuthContextStore';
import api from '../../services/api';
import { connectGoogleProfile } from '../../services/googleProfile';
import { getAuthSession } from '../../services/authSession';
import { profilePhotoError } from '../../services/profilePhoto';
import GoogleLogo from '../../components/shared/GoogleLogo';
import ProfileAvatar from '../../components/shared/ProfileAvatar';
import './StudentProfilePage.css';

const blankPassword = { current_password: '', password: '', password_confirmation: '' };
const blankPhoto = { file: null, preview: null, remove: false };
const accountFields = user => ({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' });
const fieldErrors = error => Object.fromEntries(Object.entries(error.response?.data?.errors || {}).map(([key, messages]) => [key, messages[0]]));

function Notice({ notice }) {
  return notice?.text && <div className={`profile-notice profile-notice--${notice.type}`}
    role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>;
}

function TextField({ label, name, value, onChange, error, placeholder, type = 'text', autoComplete }) {
  const id = `profile-${name}`;
  return <div className="profile-field">
    <label htmlFor={id}>{label}</label>
    <input id={id} name={name} type={type} value={value} onChange={onChange} required maxLength={255}
      placeholder={placeholder} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
    {error && <p id={`${id}-error`} className="profile-field-error">{error}</p>}
  </div>;
}

function PasswordField({ label, name, value, onChange, error }) {
  const [visible, setVisible] = useState(false);
  const id = `profile-${name}`;
  return <div className="profile-field">
    <label htmlFor={id}>{label}</label>
    <div className="profile-password-input">
      <input id={id} name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} required
        minLength={name === 'current_password' ? undefined : 8} autoComplete={name === 'current_password' ? 'current-password' : 'new-password'}
        placeholder={name === 'current_password' ? 'Enter your current password' : name === 'password' ? 'At least 8 characters' : 'Re-enter your new password'}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
      <button type="button" className="profile-password-toggle" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        aria-pressed={visible} onClick={() => setVisible(v => !v)}>
        {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </button>
    </div>
    {error && <p id={`${id}-error`} className="profile-field-error">{error}</p>}
  </div>;
}

export default function StudentProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => accountFields(user));
  const [photo, setPhoto] = useState(blankPhoto);
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileNotice, setProfileNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState(blankPassword);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [googleNotice, setGoogleNotice] = useState(null);
  const photoInput = useRef(null);
  const photoVersion = useRef(0);
  const submissionLock = useRef(false);
  const busy = saving || updating || connecting || checkingPhoto;

  useEffect(() => () => { if (photo.preview) URL.revokeObjectURL(photo.preview); }, [photo.preview]);
  useEffect(() => () => { photoVersion.current++; }, []);

  function resetPhoto() {
    photoVersion.current++;
    setPhoto(blankPhoto);
    if (photoInput.current) photoInput.current.value = '';
  }

  function beginEditing() {
    setForm(accountFields(user)); setProfileErrors({}); setProfileNotice(null);
    resetPhoto(); setEditing(true);
  }

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const error = profilePhotoError(file);
    if (error) { setProfileErrors(current => ({ ...current, avatar: error })); return; }
    const version = ++photoVersion.current;
    const preview = URL.createObjectURL(file);
    setCheckingPhoto(true);
    try {
      const image = new Image(); image.src = preview;
      await image.decode();
      if (photoVersion.current !== version) { URL.revokeObjectURL(preview); return; }
      setPhoto({ file, preview, remove: false });
      setProfileErrors(current => ({ ...current, avatar: '' }));
    } catch {
      URL.revokeObjectURL(preview);
      if (photoVersion.current === version) setProfileErrors(current => ({ ...current, avatar: 'This image could not be read. Choose another JPG, PNG, or WebP file.' }));
    } finally { if (photoVersion.current === version) setCheckingPhoto(false); }
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();
    if (submissionLock.current || busy || profileErrors.avatar) return;
    submissionLock.current = true;
    setSaving(true); setProfileNotice(null); setProfileErrors({});
    const session = getAuthSession(); const captured = session.snapshot();
    const data = new FormData(); data.append('_method', 'PUT');
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (photo.file) data.append('avatar', photo.file);
    if (photo.remove) data.append('remove_avatar', '1');
    try {
      // PHP parses multipart uploads on POST; Laravel routes the override to PUT /profile.
      const response = await api.post('/profile', data);
      if (!updateUser(response.data.user, captured)) return;
      setProfileNotice({ type: 'success', text: 'Profile updated successfully.' });
      resetPhoto(); setEditing(false);
    } catch (error) {
      if (session.isCurrent(captured)) {
        setProfileErrors(fieldErrors(error));
        setProfileNotice({ type: 'error', text: error.response?.status === 422 ? 'Please correct the highlighted fields.' : 'Could not save your profile. Please try again.' });
      }
    } finally { submissionLock.current = false; setSaving(false); }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    if (submissionLock.current || busy) return;
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordErrors({ password_confirmation: 'The passwords do not match.' }); return;
    }
    submissionLock.current = true;
    setUpdating(true); setPasswordNotice(null); setPasswordErrors({});
    const session = getAuthSession(); const captured = session.snapshot();
    try {
      await api.put('/profile/password', passwordForm);
      if (!session.isCurrent(captured)) return;
      setPasswordNotice({ type: 'success', text: 'Password changed successfully.' });
      setShowPasswordForm(false); setPasswordForm(blankPassword);
    } catch (error) {
      if (session.isCurrent(captured)) {
        setPasswordErrors(fieldErrors(error));
        setPasswordNotice({ type: 'error', text: error.response?.status === 422 ? 'Please correct the highlighted fields.' : 'Could not change your password. Please try again.' });
      }
    } finally { submissionLock.current = false; setUpdating(false); }
  }

  async function connectGoogle() {
    if (submissionLock.current || busy) return;
    submissionLock.current = true; setConnecting(true); setGoogleNotice(null);
    try { await connectGoogleProfile(window.location.pathname); }
    catch { setGoogleNotice({ type: 'error', text: 'Could not connect Google. Please try again.' }); setConnecting(false); submissionLock.current = false; }
  }

  const preview = photo.preview || (photo.remove ? null : user?.avatar);

  return <div className={`profile-settings${user?.role === 'instructor' ? ' profile-settings--instructor' : ''}`}>
    <section className="profile-panel profile-summary" aria-label="Your profile">
      <div className="profile-avatar profile-avatar--summary"><ProfileAvatar user={user} /></div>
      <div className="profile-summary-info"><h2>{user?.first_name} {user?.last_name}</h2><p>{user?.email}</p><span className="profile-role">{user?.role}</span></div>
      <p className="profile-summary-caption">Manage your personal information, photo and account settings.</p>
    </section>

    <div className="profile-settings-grid">
      <section className="profile-panel profile-personal" aria-labelledby="personal-title" aria-busy={saving}>
        <div className="profile-panel-heading"><h3 id="personal-title">Personal Information</h3>
          {!editing && <button type="button" className="profile-text-btn" onClick={beginEditing} disabled={busy}>Edit Profile</button>}
        </div>
        <Notice notice={profileNotice} />
        {editing ? <form onSubmit={handleProfileUpdate}>
          <fieldset disabled={busy}>
            <legend className="sr-only">Edit personal information</legend>
            <div className="profile-photo-editor">
              <div className="profile-avatar profile-avatar--preview"><ProfileAvatar user={form} src={preview} /></div>
              <div className="profile-photo-controls">
                <label htmlFor="profile-photo" className="profile-photo-label">Profile picture</label>
                <input ref={photoInput} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto}
                  className="sr-only" tabIndex={-1} aria-describedby={`profile-photo-help${profileErrors.avatar ? ' profile-photo-error' : ''}`} aria-invalid={!!profileErrors.avatar} />
                <div className="profile-actions">
                  <button type="button" className="profile-btn profile-btn--secondary" onClick={() => photoInput.current?.click()}>
                    <PhotoCameraOutlinedIcon fontSize="small" />{checkingPhoto ? 'Reading photo…' : 'Upload Photo'}
                  </button>
                  {(preview || profileErrors.avatar) && <button type="button" className="profile-text-btn" onClick={() => {
                    photoVersion.current++; setPhoto({ ...blankPhoto, remove: !!user?.avatar });
                    setProfileErrors(current => ({ ...current, avatar: '' }));
                  }}>Remove Photo</button>}
                </div>
                <p id="profile-photo-help" className="profile-help">JPG, PNG or WebP. Maximum 5 MB. Saved with your profile.</p>
                {photo.file && <p className="profile-photo-filename">Selected: {photo.file.name}</p>}
                {photo.remove && <p className="profile-help">Your photo will be removed when you save changes.</p>}
                {profileErrors.avatar && <p id="profile-photo-error" className="profile-field-error" role="alert">{profileErrors.avatar}</p>}
              </div>
            </div>
            <div className="profile-name-grid">
              {['first_name', 'last_name'].map(name => <TextField key={name} name={name} label={name === 'first_name' ? 'First name' : 'Last name'}
                autoComplete={name === 'first_name' ? 'given-name' : 'family-name'} placeholder={name === 'first_name' ? 'Enter your first name' : 'Enter your last name'}
                value={form[name]} error={profileErrors[name]} onChange={event => { setForm({ ...form, [name]: event.target.value }); setProfileErrors(current => ({ ...current, [name]: '' })); }} />)}
            </div>
            <TextField name="email" label="Email address" type="email" autoComplete="email" placeholder="you@example.com"
              value={form.email} error={profileErrors.email} onChange={event => { setForm({ ...form, email: event.target.value }); setProfileErrors(current => ({ ...current, email: '' })); }} />
            <div className="profile-actions profile-form-actions">
              <button type="submit" className="profile-btn profile-btn--primary" disabled={busy || !!profileErrors.avatar}>{saving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" className="profile-btn profile-btn--secondary" onClick={() => { resetPhoto(); setEditing(false); setProfileErrors({}); setProfileNotice(null); }}>Cancel</button>
            </div>
          </fieldset>
        </form> : <dl className="profile-details">
          {[['First name', user?.first_name], ['Last name', user?.last_name], ['Email address', user?.email], ['Role', user?.role]].map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>}
      </section>

      <div className="profile-settings-aside">
        <section className="profile-panel" aria-labelledby="security-title" aria-busy={updating}>
          <div className="profile-panel-heading"><h3 id="security-title">Security</h3>
            <button type="button" className="profile-text-btn" disabled={busy} onClick={() => {
              setShowPasswordForm(v => !v); setPasswordForm(blankPassword); setPasswordErrors({}); setPasswordNotice(null);
            }}>{showPasswordForm ? 'Cancel' : 'Change Password'}</button>
          </div>
          <Notice notice={passwordNotice} />
          {showPasswordForm ? <form onSubmit={handlePasswordChange}>
            <fieldset disabled={busy}>
              <legend className="sr-only">Change password</legend>
              {[['Current password', 'current_password'], ['New password', 'password'], ['Confirm new password', 'password_confirmation']].map(([label, name]) =>
                <PasswordField key={name} label={label} name={name} value={passwordForm[name]} error={passwordErrors[name]}
                  onChange={event => { setPasswordForm({ ...passwordForm, [name]: event.target.value }); setPasswordErrors(current => ({ ...current, [name]: '' })); }} />)}
              <button className="profile-btn profile-btn--primary" type="submit" disabled={busy}>{updating ? 'Updating…' : 'Change Password'}</button>
            </fieldset>
          </form> : <p>Use a strong password to keep your account secure.</p>}
        </section>

        <section className="profile-panel" aria-labelledby="google-title">
          <div className="profile-panel-heading"><h3 id="google-title">Google Profile</h3></div>
          <p>Import your name and photo from the Google account with the same email. This replaces your current name and photo.</p>
          <Notice notice={googleNotice} />
          <button type="button" className="profile-btn profile-google-btn" disabled={busy} onClick={connectGoogle}>
            <GoogleLogo />{connecting ? 'Connecting…' : 'Connect with Google'}
          </button>
        </section>

        <section className="profile-panel profile-session" aria-labelledby="session-title">
          <div><h3 id="session-title">Session</h3><p>Sign out of your current account.</p></div>
          <button type="button" className="profile-btn profile-btn--secondary" disabled={busy} onClick={logout}>Log out</button>
        </section>
      </div>
    </div>
  </div>;
}
