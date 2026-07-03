// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../components/StatCard';
import { useApi } from '../hooks/useApi';

function fmtDuration(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function DashboardPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([
          api.get('/api/analytics/stats'),
          api.get('/api/analytics/trend?period=weekly'),
        ]);
        setStats(s);
        setTrend(t.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { label: 'Total Visitors', value: stats.totalVisitors, icon: '👥', color: 'blue' },
    { label: "Today's Visitors", value: stats.todayVisitors, icon: '🌐', color: 'blue' },
    { label: 'Active Chats', value: stats.activeChats, icon: '💬', color: 'green' },
    { label: 'Completed Chats', value: stats.completedChats, icon: '✅', color: 'gray' },
    { label: 'Total Leads', value: stats.totalLeads, icon: '🎯', color: 'orange' },
    { label: "Today's Leads", value: stats.todayLeads, icon: '⭐', color: 'orange' },
    { label: 'Calls Today', value: stats.callsToday, icon: '📞', color: 'purple' },
    { label: 'Answered Calls', value: stats.answeredCalls, icon: '✅', color: 'green' },
    { label: 'Missed Calls', value: stats.missedCalls, icon: '❌', color: 'red' },
    { label: 'Avg Chat Time', value: fmtDuration(stats.avgChatTime), icon: '⏱️', color: 'gray' },
    { label: 'Avg Call Duration', value: fmtDuration(stats.avgCallDuration), icon: '⏳', color: 'gray' },
    { label: 'Conversion Rate', value: stats.conversionRate != null ? `${stats.conversionRate}%` : undefined, icon: '📊', color: 'green' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Real-time performance metrics</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-800">7-Day Performance</h3>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block" /> Visitors</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 inline-block" /> Leads</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-400 inline-block" /> Calls</span>
          </div>
        </div>
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                labelFormatter={d => `Date: ${d}`}
              />
              <Line type="monotone" dataKey="visitors" stroke="#60a5fa" strokeWidth={2} dot={false} name="Visitors" />
              <Line type="monotone" dataKey="leads" stroke="#f97316" strokeWidth={2} dot={false} name="Leads" />
              <Line type="monotone" dataKey="calls" stroke="#4ade80" strokeWidth={2} dot={false} name="Calls" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            {loading ? 'Loading chart...' : 'No data yet'}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'View Leads', to: '/admin/leads', icon: '🎯', color: 'bg-orange-500' },
          { label: 'View Calls', to: '/admin/calls', icon: '📞', color: 'bg-purple-500' },
          { label: 'Conversations', to: '/admin/conversations', icon: '💬', color: 'bg-blue-500' },
          { label: 'Re-index Site', to: '/admin/knowledge', icon: '🔄', color: 'bg-green-500' },
        ].map(q => (
          <button
            key={q.label}
            onClick={() => navigate(q.to)}
            className={`${q.color} text-white p-4 rounded-xl flex items-center gap-3 hover:opacity-90 transition shadow-sm`}
          >
            <span className="text-2xl">{q.icon}</span>
            <span className="font-medium text-sm">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
