// src/pages/RecordingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function RecordingsPage() {
  const api = useApi();
  const [recordings, setRecordings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/api/calls/recordings?page=${page}&limit=20`);
      setRecordings(data.recordings || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  const filtered = search
    ? recordings.filter(r =>
        r.callLog?.phone?.includes(search) ||
        r.transcript?.toLowerCase().includes(search.toLowerCase())
      )
    : recordings;

  function fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Recordings</h2>
          <p className="text-sm text-gray-500">{total} call recordings</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by phone or transcript..."
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400 w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-full mb-3" />
            <div className="h-16 bg-gray-100 rounded w-full" />
          </div>
        )) : filtered.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-gray-400">No recordings found</div>
        ) : filtered.map(rec => (
          <div
            key={rec.id}
            className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${
              selected?.id === rec.id ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100'
            }`}
            onClick={() => setSelected(rec)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800">{rec.callLog?.phone || 'Unknown'}</p>
                <p className="text-xs text-gray-400">{fmtDate(rec.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {rec.duration && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                    {Math.floor(rec.duration / 60)}m {rec.duration % 60}s
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  rec.callLog?.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {rec.callLog?.status || 'unknown'}
                </span>
              </div>
            </div>

            {rec.recordingUrl ? (
              <audio
                controls
                className="w-full h-9 mb-3"
                src={rec.recordingUrl}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <div className="h-9 bg-gray-50 rounded-lg flex items-center justify-center text-xs text-gray-400 mb-3 border border-dashed border-gray-200">
                Recording processing...
              </div>
            )}

            {rec.transcript && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">📝 Transcript</p>
                <p className="text-xs text-gray-600 line-clamp-3">{rec.transcript}</p>
              </div>
            )}

            {rec.summary && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-blue-600 mb-1">✨ AI Summary</p>
                <p className="text-xs text-blue-700 line-clamp-2">{rec.summary}</p>
              </div>
            )}

            <div className="flex gap-2">
              {rec.recordingUrl && (
                <a
                  href={rec.recordingUrl}
                  download
                  className="flex-1 text-center py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600"
                  onClick={e => e.stopPropagation()}
                >
                  ⬇️ Download
                </a>
              )}
              <button className="flex-1 py-1.5 rounded-lg text-xs border border-orange-200 hover:bg-orange-50 text-orange-600">
                📋 Full Transcript
              </button>
            </div>
          </div>
        ))}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
