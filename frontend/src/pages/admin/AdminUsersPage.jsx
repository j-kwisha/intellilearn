import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

/* ── Row action menu ── */
function ActionMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="adm-action-cell" ref={ref}>
      <button
        className="adm-row-menu"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.6" fill="currentColor"/>
        </svg>
      </button>
      <div className={`adm-action-menu ${open ? 'adm-action-menu--open' : ''}`}>
        <button type="button" className="adm-action-delete danger" onClick={() => { setOpen(false); onDelete(); }}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState('');

  const fetchUsers = () => {
    api.get('/admin/users')
      .then((res) => setUsers(res.data.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const toggleActive = async (userId, isActive) => {
    try {
      await api.put(`/admin/users/${userId}`, { is_active: !isActive });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: !isActive } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Page header — amber left border, matching reference */}
      <section className="adm-page-header">
        <div className="adm-page-header-text">
          <h2>User Management</h2>
          <p>{users.length} total users</p>
        </div>
        <button className="adm-new-course-btn" id="addUserBtn" onClick={() => setShowCreateForm(true)}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
          Add User
        </button>
      </section>

      {/* Search panel — white card matching reference */}
      <div className="adm-search-panel">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Create user form */}
      {showCreateForm && (
        <CreateUserForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => { setShowCreateForm(false); fetchUsers(); }}
        />
      )}

      {/* Users table */}
      <section className="adm-courses-panel">
        {filteredUsers.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--adm-muted)', padding: '48px 0', fontFamily: 'Inter, sans-serif', fontSize: '14.5px' }}>
            {search ? 'No users match your search.' : 'No users found. The admin users API endpoint may need to be set up.'}
          </p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-courses-table" id="userRows">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="adm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td><span className="adm-course-name">{user.first_name} {user.last_name}</span></td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        className={`adm-role-badge adm-role-badge--${user.role}`}
                        style={{ border: 'none', cursor: 'pointer', appearance: 'none', textAlign: 'center', outline: 'none' }}
                      >
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(user.id, user.is_active)}
                        className={`adm-status ${user.is_active ? 'adm-status--active' : 'adm-status--inactive'}`}
                        style={{ border: 'none', cursor: 'pointer', background: 'inherit' }}
                      >
                        {user.is_active && <i></i>}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="adm-th-actions">
                      <ActionMenu onDelete={() => deleteUser(user.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function CreateUserForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    password_confirmation: '', role: 'student',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/users', form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-form-card">
      <h4 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: 'var(--adm-ink)', margin: '0 0 16px', fontSize: '1rem' }}>
        Add New User
      </h4>
      {error && <p style={{ color: '#e0453c', fontSize: '0.875rem', marginBottom: '12px', fontFamily: 'Inter, sans-serif' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input type="text" placeholder="First name" value={form.first_name} required className="adm-form-input"
            onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input type="text" placeholder="Last name" value={form.last_name} required className="adm-form-input"
            onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <input type="email" placeholder="Email" value={form.email} required className="adm-form-input"
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input type="password" placeholder="Password" value={form.password} required className="adm-form-input"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input type="password" placeholder="Confirm password" value={form.password_confirmation} required className="adm-form-input"
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
        </div>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="adm-form-input">
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
          <button type="submit" disabled={saving} className="adm-new-course-btn" style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating…' : 'Create User'}
          </button>
          <button type="button" onClick={onClose}
            style={{ background: 'var(--adm-bg)', color: 'var(--adm-ink-soft)', border: '1.5px solid var(--adm-line)', borderRadius: '999px', padding: '10px 22px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
