// src/components/MessageBubble.jsx
import React from 'react';

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  // Simple markdown: **bold**, newlines
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
}

export default function MessageBubble({ message, isDark, brandColor }) {
  const isBot = message.sender === 'bot';

  return (
    <div className={`flex items-start gap-2 message-enter ${isBot ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ background: isBot ? brandColor : '#6b7280' }}
      >
        {isBot ? 'GS' : 'U'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isBot ? '' : 'items-end flex flex-col'}`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isBot
              ? `${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800 shadow-sm'} rounded-tl-none`
              : 'text-white rounded-tr-none'
          }`}
          style={!isBot ? { background: brandColor } : {}}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }}
        />
        <span className={`text-xs mt-1 px-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {formatTime(message.time)}
        </span>
      </div>
    </div>
  );
}
