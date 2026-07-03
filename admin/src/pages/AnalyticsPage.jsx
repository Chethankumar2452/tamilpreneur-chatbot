// src/pages/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useApi } from '../hooks/useApi';

const COLORS = ['#f97316', '#60a5fa', '#4ade80', '#a78bfa', '#fb7185', '#34d399'];

export default function AnalyticsPage() {
  const api = useApi();
  const [period, setPeriod] = useState('weekly');
  const [trend, setTrend] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [t, q, s] = await Promise.all([
          api.get(`/api/analytics/trend?period=${period}`),
          api.get('/api/analytics/questions'),
          api.get('/api/analytics/stats'),
        ]);
        setTrend(t.data || []);
        setKeywords(q.popularKeywords?.slice(0, 10) || []);
        setStats(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period]);

  const callPieData = [
    { name: 'Answered', value: stats.answeredCalls || 0 },
    { name: 'Missed', value: stats.missedCalls || 0 },
    { name: 'Pending', value: Math.max(0, (stats.callsToday || 0) - (stats.answeredCalls || 0) - (stats.missedCalls || 0)) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500">Performance insights and trends</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['weekly', 'monthly', 'yearly'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Visitors', value: stats.totalVisitors || 0, color: 'text-blue-600' },
          { label: 'Total Leads', value: stats.totalLeads || 0, color: 'text-orange-600' },
          { label: 'Conversion Rate', value: `${stats.conversionRate || 0}%`, color: 'text-green-600' },
          { label: 'Avg Chat Time', value: stats.avgChatTime ? `${Math.floor(stats.avgChatTime / 60)}m` : '—', color: 'text-purple-600' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className={`text-2xl font-bold ${m.color}`}>{loading ? '—' : m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Visitor / Lead / Call Trend */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-5">
          {period === 'weekly' ? '7-Day' : period === 'monthly' ? '30-Day' : 'Yearly'} Trend
        </h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={d => period === 'weekly' ? d.slice(5) : d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="visitors" name="Visitors" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leads" name="Leads" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="calls" name="Calls" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Call Success Pie */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-5">Call Success Rate (Today)</h3>
          {callPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={callPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {callPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
              No call data for today
            </div>
          )}
        </div>

        {/* Popular Keywords */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-5">Popular Question Keywords</h3>
          {keywords.length > 0 ? (
            <div className="space-y-2.5">
              {keywords.map((kw, i) => (
                <div key={kw.word} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium capitalize">{kw.word}</span>
                      <span className="text-gray-400 text-xs">{kw.count} times</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (kw.count / (keywords[0]?.count || 1)) * 100)}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
              No message data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
