// src/pages/KnowledgeBasePage.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const CATEGORIES = ['general', 'registration', 'speakers', 'schedule', 'venue', 'sponsorship', 'startup', 'support', 'travel'];
const SOURCE_BADGE = {
  website: 'bg-blue-50 text-blue-600',
  pdf: 'bg-purple-50 text-purple-600',
  manual: 'bg-green-50 text-green-600',
};

export default function KnowledgeBasePage() {
  const api = useApi();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlLog, setCrawlLog] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', content: '', category: 'general', url: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (categoryFilter) params.append('category', categoryFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (search) params.append('search', search);
      const data = await api.get(`/api/knowledge?${params}`);
      setItems(data.knowledge || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, categoryFilter, sourceFilter]);

  async function handleReindex() {
    if (!confirm('This will re-crawl the Grand Sangamam website and update the knowledge base. Continue?')) return;
    setCrawling(true);
    setCrawlLog(['🚀 Starting website crawl...']);
    try {
      await api.post('/api/knowledge/reindex', {});
      setCrawlLog(prev => [...prev, '✅ Crawl initiated! Updates will appear via real-time notifications.']);
      setTimeout(load, 5000);
    } catch (err) {
      setCrawlLog(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setCrawling(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this knowledge entry?')) return;
    try {
      await api.delete(`/api/knowledge/${id}`);
      load();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  async function handleAdd() {
    if (!newItem.title || !newItem.content) return alert('Title and content are required');
    setSaving(true);
    try {
      await api.post('/api/knowledge', newItem);
      setShowAddModal(false);
      setNewItem({ title: '', content: '', category: 'general', url: '' });
      load();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Knowledge Base</h2>
          <p className="text-sm text-gray-500">{total} entries indexed</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: '#4ade80', color: '#166534' }}
          >
            + Add Entry
          </button>
          <button
            onClick={handleReindex}
            disabled={crawling}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            {crawling ? (
              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Crawling...</>
            ) : '🔄 Re-index Website'}
          </button>
        </div>
      </div>

      {/* Crawl log */}
      {crawlLog.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
          {crawlLog.map((log, i) => (
            <p key={i} className="text-green-400">{log}</p>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Search knowledge..."
          className="flex-1 min-w-40 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
        />
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
        >
          <option value="">All Sources</option>
          <option value="website">Website</option>
          <option value="pdf">PDF</option>
          <option value="manual">Manual</option>
        </select>
        <button onClick={load} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#f97316' }}>Search</button>
      </div>

      {/* Knowledge Items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-3">No knowledge entries found</p>
            <button
              onClick={handleReindex}
              className="px-4 py-2 rounded-lg text-white text-sm"
              style={{ background: '#f97316' }}
            >
              🔄 Index Website Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-sm text-gray-800 truncate">{item.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_BADGE[item.source] || 'bg-gray-50 text-gray-500'}`}>
                        {item.source}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                        {item.category}
                      </span>
                    </div>
                    {item.url && (
                      <p className="text-xs text-blue-500 mb-1 truncate">{item.url}</p>
                    )}
                    <p className={`text-xs text-gray-500 ${expandedId === item.id ? '' : 'line-clamp-2'}`}>
                      {item.content}
                    </p>
                    {item.content?.length > 150 && (
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-xs text-orange-500 mt-1 hover:underline"
                      >
                        {expandedId === item.id ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400 hover:text-red-600 text-xs p-1.5 rounded hover:bg-red-50 flex-shrink-0"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} entries</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">Add Knowledge Entry</h3>
            <div className="space-y-3">
              <input
                value={newItem.title}
                onChange={e => setNewItem(n => ({ ...n, title: e.target.value }))}
                placeholder="Title (e.g. Registration Information)"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
              />
              <select
                value={newItem.category}
                onChange={e => setNewItem(n => ({ ...n, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <input
                value={newItem.url}
                onChange={e => setNewItem(n => ({ ...n, url: e.target.value }))}
                placeholder="Source URL (optional)"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
              />
              <textarea
                value={newItem.content}
                onChange={e => setNewItem(n => ({ ...n, content: e.target.value }))}
                placeholder="Content — paste the information the AI should know about..."
                rows={6}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: '#f97316' }}>
                {saving ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
