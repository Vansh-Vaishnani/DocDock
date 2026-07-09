'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '../../app/auth/toast-provider';
import { sendChatMessage, type AIMessage } from '../../lib/aiService';

interface AIAssistantChatProps {
  containerHeight?: string;
  showTitleCard?: boolean;
}

export function AIAssistantChat({ containerHeight = 'h-[60vh]', showTitleCard = false }: AIAssistantChatProps) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your DocDock AI Health Assistant. Ask me health-related questions, and I will guide you on next steps. Remember, I offer general guidance, not formal diagnoses.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: AIMessage[] = [...messages, { role: 'user', content: userMessage, timestamp: new Date() }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await sendChatMessage(userMessage, newMessages);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      showToast(err.message || 'Unable to connect to assistant.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col ${containerHeight} space-y-4`}>
      {showTitleCard && (
        <div className="dd-card shrink-0 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">24/7 Virtual health partner</p>
          <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>AI Assistant Chat</h2>
          <p className="text-xs text-slate-500">Discuss symptoms, medical conditions, or find out which clinical department fits your symptoms.</p>
        </div>
      )}

      <div className="flex-1 dd-card flex flex-col overflow-hidden p-0" style={{ backgroundColor: 'var(--card-bg)' }}>
        {/* Chat Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  isUser ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[9px] text-right mt-1 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs italic animate-pulse">
                AI Assistant is typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t p-3 flex gap-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask anything... e.g. What is the cause of fever for 3 days?"
            className="flex-1 dd-input text-sm px-3.5 py-2"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary rounded-xl px-5 py-2 text-sm"
          >
            Ask AI
          </button>
        </form>
      </div>
    </div>
  );
}
