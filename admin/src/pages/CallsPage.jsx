// src/pages/CallsPage.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const STATUS_BADGE = {
  initiated: 'bg-blue-100 text-blue-700',
  ringing: 'bg-yellow-100 text-yellow-700',
  'in-progress': 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  'no-answer': 'bg-orange-100 text-orange-600',
  busy: 'bg-gray-100 text-gray-600',
};

export default function CallsPage() {
  const api = useApi();
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      const data = await api.get(`/api/calls?${params}`);
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, statusFilter]);

  function fmtDur(s) {
    if (!s) return '—';
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }
  function fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Calls</h2>
          <p className="text-sm text-gray-500">{total} total calls</p>
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
        >
          <option value="">All Status</option>
          {['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Calls', value: total, icon: '📞', color: 'bg-blue-50 text-blue-600' },
          { label: 'Completed', value: calls.filter(c => c.status === 'completed').length, icon: '✅', color: 'bg-green-50 text-green-600' },
          { label: 'Failed', value: calls.filter(c => c.status === 'failed').length, icon: '❌', color: 'bg-red-50 text-red-600' },
          { label: 'No Answer', value: calls.filter(c => c.status === 'no-answer').length, icon: '📵', color: 'bg-orange-50 text-orange-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${card.color}`}>{card.icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Session', 'Phone', 'Status', 'Duration', 'Retry Count', 'Started', 'Recording', 'Download'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
              ))}</tr>
            )) : calls.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No calls yet</td></tr>
            ) : calls.map(call => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{call.session?.sessionId?.slice(-10)}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{call.phone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[call.status] || 'bg-gray-100'}`}>
                    {call.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{fmtDur(call.duration)}</td>
                <td className="px-4 py-3 text-gray-500">{call.retryCount}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(call.startedAt)}</td>
                <td className="px-4 py-3">
                  {call.recording?.recordingUrl ? (
                    <audio controls className="h-8 w-32" src={call.recording.recordingUrl} />
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  {call.recording?.recordingUrl && (
                    <a
                      href={call.recording.recordingUrl}
                      download
                      className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      ⬇️ Download
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
