// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const SECTIONS = [
  {
    title: '🤖 Gemini AI',
    keys: [
      { key: 'GEMINI_API_KEY', label: 'Gemini API Key', type: 'password', placeholder: 'AIza...' },
      { key: 'GEMINI_MODEL', label: 'Model', type: 'text', placeholder: 'gemini-2.0-flash-exp' },
    ],
  },
  {
    title: '📞 Twilio',
    keys: [
      { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', type: 'password', placeholder: 'ACxxxxxxxxxx' },
      { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
      { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', type: 'text', placeholder: '+1xxxxxxxxxx' },
      { key: 'TWILIO_WEBHOOK_URL', label: 'Webhook Base URL', type: 'text', placeholder: 'https://yourdomain.com/api/twilio' },
    ],
  },
  {
    title: '🎙️ ElevenLabs',
    keys: [
      { key: 'ELEVENLABS_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk_...' },
      { key: 'ELEVENLABS_AGENT_ID', label: 'Agent ID', type: 'text', placeholder: 'agent_...' },
    ],
  },
  {
    title: '🌐 General',
    keys: [
      { key: 'TARGET_WEBSITE', label: 'Website to Crawl', type: 'text', placeholder: 'https://www.tamilpreneur.in/grand-sangamam' },
      { key: 'SESSION_PREFIX', label: 'Session ID Prefix', type: 'text', placeholder: 'GS-2026' },
    ],
  },
];

export default function SettingsPage() {
  const api = useApi();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    api.get('/api/settings')
      .then(data => setSettings(data.settings || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/api/settings', { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Configure API keys and system settings</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              ✅ Settings saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {SECTIONS.map(section => (
        <div key={section.title} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">{section.title}</h3>
          </div>
          <div className="p-5 space-y-4">
            {section.keys.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type={field.type === 'password' && !showKeys[field.key] ? 'password' : 'text'}
                    value={settings[field.key] || ''}
                    onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition pr-10"
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowKeys(k => ({ ...k, [field.key]: !k[field.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKeys[field.key] ? '🙈' : '👁️'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-700">Security Note</p>
            <p className="text-xs text-amber-600 mt-0.5">
              API keys stored here are saved in the database. For production, prefer using environment variables in your <code className="bg-amber-100 px-1 py-0.5 rounded">.env</code> file. Never share these keys publicly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
