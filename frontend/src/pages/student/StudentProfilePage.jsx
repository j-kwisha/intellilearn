import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { connectGoogleProfile } from '../../services/googleProfile';

export default function StudentProfilePage() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isInstructor = user?.role === 'instructor';

  const handleProfileUpdate = async (e) => {
    e.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const res = await api.put('/profile', form);
      setMessage('Profile updated successfully.');
      setEditing(false);
      localStorage.setItem('user', JSON.stringify({ ...user, ...res.data.user }));
    } catch (err) { setError(err.response?.data?.message || 'Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      await api.put('/profile/password', passwordForm);
      setMessage('Password changed successfully.');
      setShowPasswordForm(false);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors?.current_password?.[0] || errors?.password?.[0] || err.response?.data?.message || 'Failed to change password.');
    } finally { setSaving(false); }
  };

  const FI = isInstructor ? 'instr-form-input' : 'adm-form-input';

  const panelStyle = isInstructor
    ? { background:'var(--instr-panel)', border:'1px solid var(--instr-line)', borderRadius:'20px', boxShadow:'0 6px 22px rgba(15,35,25,0.10)', padding:'24px', marginBottom:'18px' }
    : { background:'var(--adm-panel)', border:'1px solid var(--adm-line)', borderRadius:'20px', boxShadow:'var(--shadow-panel)', padding:'24px', marginBottom:'18px' };

  const inkStyle = isInstructor ? 'var(--instr-ink)' : 'var(--adm-ink)';
  const mutedStyle = isInstructor ? 'var(--instr-muted)' : 'var(--adm-muted)';
  const bgStyle = isInstructor ? 'var(--instr-bg)' : 'var(--adm-bg)';
  const accentColor = isInstructor ? 'var(--instr-green-600)' : 'var(--adm-blue-500)';
  const avatarBg = isInstructor ? 'var(--instr-mint-soft)' : '#eef1ff';
  const avatarText = isInstructor ? 'var(--instr-green-600)' : 'var(--adm-blue-500)';

  const PrimaryBtn = ({ children, ...props }) => isInstructor
    ? <button className="instr-pill-btn" {...props}>{children}</button>
    : <button className="adm-new-course-btn" {...props}>{children}</button>;

  const SecondaryBtn = ({ children, ...props }) => isInstructor
    ? <button className="instr-outline-btn" {...props}>{children}</button>
    : <button style={{ background:'var(--adm-bg)', color:'var(--adm-ink-soft)', border:'1.5px solid var(--adm-line)', borderRadius:'999px', padding:'10px 22px', fontSize:'14px', fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer' }} {...props}>{children}</button>;

  const headingStyle = { fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'17px', color: inkStyle, margin:'0 0 16px' };
  const labelStyle = isInstructor ? 'instr-form-label' : undefined;

  return (
    <div style={{ maxWidth:'660px' }}>
      {/* Profile header */}
      <div style={panelStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:'18px' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'50%', background: avatarBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
            {user?.avatar
              ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:'24px', fontWeight:700, color: avatarText, fontFamily:'Poppins,sans-serif' }}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
            }
          </div>
          <div>
            <h2 style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'20px', color: inkStyle, margin:'0 0 2px' }}>
              {user?.first_name} {user?.last_name}
            </h2>
            <p style={{ fontFamily:'Inter,sans-serif', fontSize:'14px', color: mutedStyle, margin:'0 0 6px' }}>{user?.email}</p>
            <span style={{ fontSize:'12.5px', fontWeight:600, padding:'4px 12px', borderRadius:'999px', background: avatarBg, color: avatarText, fontFamily:'Inter,sans-serif', textTransform:'capitalize' }}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {message && <div style={{ background:'#f0fdf4', color:'#15803d', fontSize:'14px', padding:'12px 16px', borderRadius:'10px', border:'1px solid #bbf7d0', marginBottom:'16px', fontFamily:'Inter,sans-serif' }}>{message}</div>}
      {error && <div style={{ background:'#fef2f2', color:'#dc2626', fontSize:'14px', padding:'12px 16px', borderRadius:'10px', border:'1px solid #fecaca', marginBottom:'16px', fontFamily:'Inter,sans-serif' }}>{error}</div>}

      {/* Personal info */}
      <div style={panelStyle}>
        <h3 style={headingStyle}>Google Profile</h3>
        <p style={{ color: mutedStyle }}>Import your name and photo from the Google account with the same email. This will replace your current name and photo.</p>
        <PrimaryBtn disabled={saving} onClick={async () => {
          setSaving(true); setError('');
          try { await connectGoogleProfile(window.location.pathname); }
          catch (err) {
            setError(err.response?.data?.message || 'Could not connect Google. Please try again.');
            setSaving(false);
          }
        }}>Connect Google</PrimaryBtn>
      </div>

      <div style={panelStyle}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <h3 style={headingStyle}>Personal Information</h3>
          {!editing && <button onClick={() => setEditing(true)} style={{ fontFamily:'Inter,sans-serif', fontSize:'14px', fontWeight:600, color: accentColor, background:'none', border:'none', cursor:'pointer' }}>Edit</button>}
        </div>

        {editing ? (
          <form onSubmit={handleProfileUpdate} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              <div>
                {labelStyle && <label className={labelStyle}>First name</label>}
                <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name:e.target.value})} className={FI} />
              </div>
              <div>
                {labelStyle && <label className={labelStyle}>Last name</label>}
                <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name:e.target.value})} className={FI} />
              </div>
            </div>
            <div>
              {labelStyle && <label className={labelStyle}>Email</label>}
              <input type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} className={FI} />
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <PrimaryBtn type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</PrimaryBtn>
              <SecondaryBtn type="button" onClick={() => setEditing(false)}>Cancel</SecondaryBtn>
            </div>
          </form>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              {[['FIRST NAME', user?.first_name], ['LAST NAME', user?.last_name]].map(([lbl, val]) => (
                <div key={lbl}>
                  <p style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color: mutedStyle, margin:'0 0 4px', fontFamily:'Inter,sans-serif' }}>{lbl}</p>
                  <p style={{ fontSize:'14px', fontWeight:600, color: inkStyle, margin:0, fontFamily:'Inter,sans-serif' }}>{val}</p>
                </div>
              ))}
            </div>
            {[['EMAIL', user?.email], ['ROLE', user?.role]].map(([lbl, val]) => (
              <div key={lbl}>
                <p style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color: mutedStyle, margin:'0 0 4px', fontFamily:'Inter,sans-serif' }}>{lbl}</p>
                <p style={{ fontSize:'14px', fontWeight:600, color: inkStyle, margin:0, fontFamily:'Inter,sans-serif', textTransform:'capitalize' }}>{val}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security */}
      <div style={panelStyle}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <h3 style={headingStyle}>Security</h3>
          <button onClick={() => setShowPasswordForm(v => !v)} style={{ fontFamily:'Inter,sans-serif', fontSize:'14px', fontWeight:600, color: accentColor, background:'none', border:'none', cursor:'pointer' }}>
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm ? (
          <form onSubmit={handlePasswordChange} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {[['Current password', 'current_password'], ['New password', 'password'], ['Confirm new password', 'password_confirmation']].map(([lbl, field]) => (
              <div key={field}>
                {labelStyle && <label className={labelStyle}>{lbl}</label>}
                <input type="password" value={passwordForm[field]} onChange={e => setPasswordForm({...passwordForm, [field]:e.target.value})} placeholder={field === 'password' ? 'Minimum 8 characters' : ''} required className={FI} />
              </div>
            ))}
            <PrimaryBtn type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</PrimaryBtn>
          </form>
        ) : (
          <p style={{ fontFamily:'Inter,sans-serif', fontSize:'14px', color: mutedStyle, margin:0 }}>Click "Change Password" to update your password.</p>
        )}
      </div>

      {/* Danger zone */}
      <div style={{ ...panelStyle, borderColor:'#fecaca' }}>
        <h3 style={{ ...headingStyle, color:'#dc2626' }}>Danger Zone</h3>
        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'14px', color: mutedStyle, margin:'0 0 16px' }}>Logging out will end your current session.</p>
        <button onClick={logout} style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'999px', padding:'10px 20px', fontSize:'14px', fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer' }}>
          Log out
        </button>
      </div>
    </div>
  );
}
