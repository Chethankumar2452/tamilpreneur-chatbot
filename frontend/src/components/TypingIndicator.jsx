// src/components/TypingIndicator.jsx
import React from 'react';

export default function TypingIndicator({ isDark }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        GS
      </div>
      <div className={`px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1 ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        {[1, 2, 3].map(i => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${isDark ? 'bg-gray-400' : 'bg-gray-400'}`}
            style={{
              animation: 'bounceDot 1.4s infinite ease-in-out',
              animationDelay: `${(i - 1) * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
