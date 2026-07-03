// src/pages/AdminUsersPage.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function AdminUsersPage() {
  const api = useApi();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/users');
      setAdmins(data.admins || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    setError('');
    if (!form.username || !form.email || !form.password) {
      setError('All fields are required');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/admin/users', form);
      setShowModal(false);
      setForm({ username: '', email: '', password: '', role: 'admin' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function fmtDate(d) {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Admin Users</h2>
          <p className="text-sm text-gray-500">{admins.length} admin accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          + Add Admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['User', 'Email', 'Role', 'Status', 'Last Login', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
              ))}</tr>
            )) : admins.map(admin => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      {admin.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{admin.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    admin.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {admin.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${admin.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-600">{admin.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(admin.lastLogin)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(admin.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Create Admin User</h3>

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Username"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
              />
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Password (min 8 chars)"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
              />
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowModal(false); setError(''); }} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: '#f97316' }}>
                {saving ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
