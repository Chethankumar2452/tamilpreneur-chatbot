// src/components/LeadForm.jsx
import React, { useState } from 'react';

export default function LeadForm({ sessionId, question, onSubmitted, onDismiss, isDark, apiUrl }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function validatePhone(p) {
    return /^(\+91|91|0)?[6-9]\d{9}$/.test(p.replace(/\s/g, ''));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validatePhone(phone)) {
      setError('Please enter a valid Indian mobile number');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phone: phone.replace(/\s/g, ''),
          name: name.trim() || undefined,
          question,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit');
        return;
      }

      onSubmitted();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-2xl p-4 border-2 border-orange-400 ${isDark ? 'bg-gray-800' : 'bg-orange-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📞</span>
          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Want a callback?
          </p>
        </div>
        <button
          onClick={onDismiss}
          className={`text-xs ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
        >
          ✕
        </button>
      </div>

      <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Share your number and our team will call you within a minute!
      </p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name (optional)"
          className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-400'
              : 'bg-white border-gray-200 text-gray-800 focus:border-orange-400'
          }`}
        />

        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Mobile number (e.g. 9876543210)"
          required
          className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-400'
              : 'bg-white border-gray-200 text-gray-800 focus:border-orange-400'
          } ${error ? 'border-red-400' : ''}`}
        />

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          {loading ? '📞 Initiating call...' : '📞 Call Me Now'}
        </button>
      </form>
    </div>
  );
}
