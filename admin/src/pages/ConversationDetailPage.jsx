// src/pages/ConversationDetailPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const CALL_STATUS_COLOR = {
  initiated: 'text-blue-600 bg-blue-50',
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  'no-answer': 'text-yellow-600 bg-yellow-50',
};

export default function ConversationDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    api.get(`/api/admin/sessions/${sessionId}`)
      .then(d => setSession(d.session))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return (
    <div className="text-center py-16 text-gray-400">Session not found</div>
  );

  const { messages = [], lead, callLog } = session;

  function fmtTime(d) {
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/conversations')}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
          ← Back
        </button>
        <div>
          <h2 className="font-bold text-gray-900">{session.sessionId}</h2>
          <p className="text-xs text-gray-500">{fmtDate(session.startTime)}</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
          session.status === 'active' ? 'bg-green-100 text-green-700' :
          session.status === 'completed' ? 'bg-gray-100 text-gray-600' :
          'bg-red-100 text-red-600'
        }`}>
          {session.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat Timeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Conversation</h3>
            <span className="text-xs text-gray-400">{messages.length} messages</span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 520 }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 ${
                  msg.sender === 'bot' ? 'bg-orange-500' : 'bg-gray-400'
                }`}>
                  {msg.sender === 'bot' ? 'AI' : 'U'}
                </div>
                <div className={`max-w-[75%] ${msg.sender === 'user' ? 'items-end flex flex-col' : ''}`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'bot'
                      ? 'bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100'
                      : 'text-white rounded-tr-none'
                  }`}
                    style={msg.sender !== 'bot' ? { background: '#f97316' } : {}}>
                    {msg.message}
                  </div>
                  <span className="text-xs text-gray-400 mt-1 px-1">{fmtTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        {/* Side panel: session info + lead + call */}
        <div className="space-y-4">
          {/* Session Info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Session Info</h4>
            {[
              ['IP', session.ipAddress],
              ['Device', session.device],
              ['Browser', session.userAgent?.split(' ').slice(-1)[0]],
              ['Duration', session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : '—'],
              ['Started', fmtTime(session.startTime)],
              ['Ended', session.endTime ? fmtTime(session.endTime) : 'Ongoing'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs text-gray-700 font-medium max-w-[55%] text-right truncate">{v || '—'}</span>
              </div>
            ))}
          </div>

          {/* Lead Info */}
          {lead && (
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
              <h4 className="font-semibold text-sm text-orange-700 mb-3">🎯 Lead Captured</h4>
              {[
                ['Name', lead.name],
                ['Phone', lead.phone],
                ['Status', lead.status],
                ['Call Status', lead.callStatus],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-orange-100 last:border-0">
                  <span className="text-xs text-orange-600">{k}</span>
                  <span className="text-xs text-orange-800 font-medium">{v || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Call Info */}
          {callLog && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">📞 Call Details</h4>
              {[
                ['Phone', callLog.phone],
                ['Status', callLog.status],
                ['Duration', callLog.duration ? `${callLog.duration}s` : '—'],
                ['Call SID', callLog.callSid?.slice(-8)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{k}</span>
                  <span className={`text-xs font-medium ${k === 'Status' ? (CALL_STATUS_COLOR[v] || '') : 'text-gray-700'} ${k === 'Status' ? 'px-2 py-0.5 rounded-full' : ''}`}>
                    {v || '—'}
                  </span>
                </div>
              ))}

              {/* Recording */}
              {callLog.recording?.recordingUrl && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">🎙️ Recording</p>
                  <audio controls className="w-full" src={callLog.recording.recordingUrl}>
                    Your browser does not support audio.
                  </audio>
                  {callLog.recording.transcript && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-24 overflow-y-auto">
                      <p className="font-medium mb-1">Transcript:</p>
                      {callLog.recording.transcript}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
