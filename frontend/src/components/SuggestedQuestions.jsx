// src/components/SuggestedQuestions.jsx
import React from 'react';

export default function SuggestedQuestions({ suggestions, onSelect, isDark }) {
  return (
    <div className="mb-2">
      <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Quick questions:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 8).map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.text)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all hover:shadow-sm active:scale-95 ${
              isDark
                ? 'border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400'
                : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500 bg-white'
            }`}
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
