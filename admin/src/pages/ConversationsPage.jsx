// src/pages/ConversationsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  abandoned: 'bg-red-100 text-red-600',
};

export default function ConversationsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const data = await api.get(`/api/admin/sessions?${params}`);
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, statusFilter]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
          <p className="text-sm text-gray-500">{total} total sessions</p>
        </div>
        <button
          onClick={() => {
            const csv = sessions.map(s =>
              `${s.sessionId},${s.status},${s._count?.messages || 0},${s.lead?.phone || ''},${s.createdAt}`
            ).join('\n');
            const blob = new Blob([`Session ID,Status,Messages,Phone,Created\n${csv}`], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'conversations.csv'; a.click();
          }}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search session ID..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
          />
          <button type="submit" className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#f97316' }}>
            Search
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Session ID', 'Status', 'Messages', 'Lead Phone', 'Device', 'Created', 'Action'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No conversations found
                </td>
              </tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.sessionId}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{s._count?.messages || 0}</td>
                <td className="px-4 py-3 text-gray-700">{s.lead?.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{s.device || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(s.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/admin/conversations/${s.sessionId}`)}
                    className="px-3 py-1.5 rounded-lg text-xs text-orange-600 border border-orange-200 hover:bg-orange-50 font-medium"
                  >
                    View Chat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
