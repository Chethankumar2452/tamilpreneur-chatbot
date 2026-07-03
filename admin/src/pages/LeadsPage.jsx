// src/pages/LeadsPage.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const STATUS_OPTIONS = ['new', 'called', 'callback', 'converted', 'lost'];
const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  called: 'bg-purple-100 text-purple-700',
  callback: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
};
const CALL_COLORS = {
  initiated: 'bg-blue-50 text-blue-600',
  answered: 'bg-green-50 text-green-600',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-600',
  pending: 'bg-gray-50 text-gray-500',
};

export default function LeadsPage() {
  const api = useApi();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editLead, setEditLead] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      const data = await api.get(`/api/leads?${params}`);
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, statusFilter]);

  async function handleRetryCall(lead) {
    try {
      await api.post(`/api/leads/${lead.id}/retry-call`);
      alert('📞 Call retried!');
      load();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await api.put(`/api/leads/${editLead.id}`, {
        status: editLead.status,
        notes: editLead.notes,
        assignedTo: editLead.assignedTo,
        followUpDate: editLead.followUpDate,
      });
      setEditLead(null);
      load();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leads</h2>
          <p className="text-sm text-gray-500">{total} total leads captured</p>
        </div>
        <button
          onClick={() => {
            const csv = leads.map(l => `${l.session?.sessionId},${l.phone},${l.name || ''},${l.status},${l.callStatus || ''},${l.createdAt}`).join('\n');
            const blob = new Blob([`Session,Phone,Name,Status,Call Status,Created\n${csv}`], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
          }}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="flex gap-2 flex-1 min-w-48">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search phone or name..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
          />
          <button onClick={load} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#f97316' }}>
            Search
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Session', 'Phone', 'Name', 'Status', 'Call Status', 'Follow-up', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                ))}
              </tr>
            )) : leads.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No leads yet</td></tr>
            ) : leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{lead.session?.sessionId?.slice(-10)}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{lead.phone}</td>
                <td className="px-4 py-3 text-gray-600">{lead.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${CALL_COLORS[lead.callStatus] || 'bg-gray-50 text-gray-400'}`}>
                    {lead.callStatus || 'pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(lead.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditLead({ ...lead })}
                      className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleRetryCall(lead)}
                      className="px-2.5 py-1.5 rounded-lg text-xs border border-orange-200 hover:bg-orange-50 text-orange-600"
                    >
                      📞
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Edit Lead — {editLead.phone}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                <select
                  value={editLead.status}
                  onChange={e => setEditLead(l => ({ ...l, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Assigned To</label>
                <input
                  value={editLead.assignedTo || ''}
                  onChange={e => setEditLead(l => ({ ...l, assignedTo: e.target.value }))}
                  placeholder="Team member name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Follow-up Date</label>
                <input
                  type="datetime-local"
                  value={editLead.followUpDate ? new Date(editLead.followUpDate).toISOString().slice(0, 16) : ''}
                  onChange={e => setEditLead(l => ({ ...l, followUpDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <textarea
                  value={editLead.notes || ''}
                  onChange={e => setEditLead(l => ({ ...l, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add notes..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditLead(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                style={{ background: '#f97316' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
