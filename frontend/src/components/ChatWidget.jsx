// src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import LeadForm from './LeadForm';
import SuggestedQuestions from './SuggestedQuestions';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const socket = io(API_URL, { autoConnect: false });

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [browserId] = useState(() => localStorage.getItem('gs_browser_id') || crypto.randomUUID());
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadQuestion, setLeadQuestion] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Save browser ID
  useEffect(() => {
    localStorage.setItem('gs_browser_id', browserId);
  }, [browserId]);

  // Init session & load suggestions
  const initialized = useRef(false);

useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;

  initSession();
  loadSuggestions();
}, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isTyping]);

  // Mark unread when closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      setHasUnread(true);
    }
    if (isOpen) {
      setHasUnread(false);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Dark mode on body
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Socket events
  useEffect(() => {
    socket.connect();
    if (sessionId) {
      socket.emit('join_session', sessionId);
    }
    return () => { socket.disconnect(); };
  }, [sessionId]);

  async function initSession() {
    const savedSession = localStorage.getItem('gs_session_id');
    if (savedSession) {
      setSessionId(savedSession);
      await loadHistory(savedSession);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browserId }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      localStorage.setItem('gs_session_id', data.sessionId);

      // Welcome message
      addBotMessage("👋 Welcome to **Grand Sangamam**! I'm your AI assistant.\n\nHow can I help you today?");
    } catch (err) {
      console.error('Session init error:', err);
    }
  }

  async function loadHistory(sid) {
    try {
      const res = await fetch(`${API_URL}/api/chat/history/${sid}`);
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(data.messages.map(m => ({
          id: m.id,
          sender: m.sender,
          text: m.message,
          time: new Date(m.timestamp),
        })));
        setShowSuggestions(false);
      } else {
        addBotMessage("👋 Welcome to **Grand Sangamam**! I'm your AI assistant.\n\nHow can I help you today?");
      }
    } catch (err) {
      console.error('History load error:', err);
    }
  }

  async function loadSuggestions() {
    try {
      const res = await fetch(`${API_URL}/api/chat/suggestions`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (_) {}
  }

  function addBotMessage(text) {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'bot',
      text,
      time: new Date(),
    }]);
  }

  async function sendMessage(text = input.trim()) {
    if (!text || !sessionId || isStreaming) return;

    setInput('');
    setShowSuggestions(false);
    setShowLeadForm(false);

    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date(),
    }]);

    setIsTyping(true);
    setIsStreaming(true);
    setStreamingText('');

    // Abort any previous stream
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('Failed to send message');

      setIsTyping(false);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));

            if (json.done) {
              // Stream complete
              setStreamingText('');
              setMessages(prev => [...prev, {
                id: Date.now(),
                sender: 'bot',
                text: json.fullResponse || accumulated,
                time: new Date(),
              }]);

              if (json.shouldCollectLead) {
                setTimeout(() => {
                  setLeadQuestion(text);
                  setShowLeadForm(true);
                }, 500);
              }
            } else if (json.text) {
              accumulated += json.text;
              setStreamingText(accumulated);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setIsTyping(false);
        addBotMessage("I'm having trouble connecting right now. Please try again in a moment.");
        console.error('Send message error:', err);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleLeadSubmitted() {
    setShowLeadForm(false);
    addBotMessage("✅ **Got it!** Our team will call you within a minute.\n\nIs there anything else I can help you with?");
  }

  function clearChat() {
    localStorage.removeItem('gs_session_id');
    setMessages([]);
    setSessionId(null);
    setShowSuggestions(true);
    initSession();
  }

  const brandColor = '#f97316';

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-4 w-96 max-h-[600px] flex flex-col rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: `linear-gradient(135deg, ${brandColor}, #ea580c)` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                GS
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Grand Sangamam AI</p>
                <p className="text-orange-100 text-xs">
                  {isTyping || isStreaming ? 'Typing...' : '● Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDark(d => !d)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
                title="Toggle dark mode"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <button
                onClick={clearChat}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
                title="Clear chat"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className={`flex-1 overflow-y-auto p-4 space-y-3 chat-messages ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
            style={{ minHeight: 300, maxHeight: 400 }}
          >
            {/* Suggested questions */}
            {showSuggestions && messages.length <= 1 && suggestions.length > 0 && (
              <SuggestedQuestions
                suggestions={suggestions}
                onSelect={sendMessage}
                isDark={isDark}
              />
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isDark={isDark}
                brandColor={brandColor}
              />
            ))}

            {/* Streaming text */}
            {isStreaming && streamingText && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  GS
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl rounded-tl-none text-sm ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800 shadow-sm'}`}>
                  {streamingText}
                  <span className="inline-block w-1 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && !isStreaming && <TypingIndicator isDark={isDark} />}

            {/* Lead form */}
            {showLeadForm && (
              <LeadForm
                sessionId={sessionId}
                question={leadQuestion}
                onSubmitted={handleLeadSubmitted}
                onDismiss={() => setShowLeadForm(false)}
                isDark={isDark}
                apiUrl={API_URL}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`p-3 border-t ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-white'}`}>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about Grand Sangamam..."
                rows={1}
                disabled={isStreaming}
                className={`flex-1 resize-none bg-transparent text-sm outline-none max-h-24 ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                style={{ minHeight: 24 }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: input.trim() && !isStreaming ? brandColor : '#d1d5db',
                }}
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className={`text-center text-xs mt-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Powered by Grand Sangamam AI
            </p>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${brandColor}, #ea580c)` }}
        aria-label="Open chat"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.007 22l4.932-1.353A9.963 9.963 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
        )}

        {/* Unread badge */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            !
          </span>
        )}
      </button>
    </>
  );
}
