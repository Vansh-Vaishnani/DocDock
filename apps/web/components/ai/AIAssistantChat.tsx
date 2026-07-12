'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '../../app/auth/toast-provider';
import { sendChatMessageStream, type AIMessage } from '../../lib/aiService';

interface AIAssistantChatProps {
  containerHeight?: string;
  showTitleCard?: boolean;
}

export function AIAssistantChat({ containerHeight = 'h-[60vh]', showTitleCard = false }: AIAssistantChatProps) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('docdock-ai-history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        initDefaultMessage();
      }
    } else {
      initDefaultMessage();
    }
  }, []);

  const initDefaultMessage = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I am your DocDock AI Health Assistant. Ask me health-related questions, and I will guide you on next steps. Remember, I offer general guidance, not formal diagnoses.',
        timestamp: new Date()
      }
    ]);
  };

  // Save history when messages change
  const saveHistory = (newMsgs: AIMessage[]) => {
    localStorage.setItem('docdock-ai-history', JSON.stringify(newMsgs));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, loading]);

  const handleSend = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const userMsgText = customInput || input;
    if (!userMsgText.trim() || loading) return;

    setInput('');
    const userMessage: AIMessage = { role: 'user', content: userMsgText.trim(), timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveHistory(updatedMessages);
    setLoading(true);
    setStreamingText('');

    try {
      let accumulated = '';
      await sendChatMessageStream(userMsgText.trim(), updatedMessages, (chunk) => {
        accumulated += chunk;
        setStreamingText(accumulated);
      });

      const finalMessages: AIMessage[] = [
        ...updatedMessages,
        { role: 'assistant', content: accumulated || 'No response generated.', timestamp: new Date() }
      ];
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } catch (err: any) {
      showToast(err.message || 'Unable to connect to assistant.', 'error');
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  const regenerateResponse = () => {
    if (messages.length < 2 || loading) return;
    const lastUserMessageIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIdx === -1) return;

    const actualIdx = messages.length - 1 - lastUserMessageIdx;
    const lastUserMessage = messages[actualIdx];

    const sliced = messages.slice(0, actualIdx);
    setMessages(sliced);
    handleSend(undefined, lastUserMessage.content);
  };

  const clearConversation = () => {
    if (window.confirm('Are you sure you want to clear your conversation history?')) {
      localStorage.removeItem('docdock-ai-history');
      initDefaultMessage();
      showToast('Conversation history cleared.', 'info');
    }
  };

  return (
    <div className={`flex flex-col ${containerHeight} space-y-4 min-h-0`}>
      {showTitleCard && (
        <div className="dd-card shrink-0 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">24/7 Virtual health partner</p>
            <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>AI Assistant Chat</h2>
            <p className="text-xs text-slate-500">Discuss symptoms, medical conditions, or find out which clinical department fits your symptoms.</p>
          </div>
          <button
            onClick={clearConversation}
            type="button"
            className="rounded-full border border-rose-500 text-rose-500 px-3 py-1.5 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all flex items-center gap-1.5"
          >
            🗑️ Clear Chat
          </button>
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
                  isUser ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700/60'
                }`}>
                  {isUser ? (
                    <div className="leading-relaxed whitespace-pre-wrap font-sans max-w-none">
                      {msg.content}
                    </div>
                  ) : (
                    <div 
                      className="leading-relaxed whitespace-pre-wrap font-sans prose prose-slate dark:prose-invert max-w-none font-medium"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                    />
                  )}
                  
                  <div className="flex items-center justify-between gap-4 mt-2 pt-1.5 border-t border-slate-300/30 text-[10px] opacity-75">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!isUser && (
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        type="button"
                        className="hover:underline flex items-center gap-1 font-semibold"
                      >
                        📋 Copy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Streaming Text */}
          {loading && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700/60">
                <div 
                  className="leading-relaxed whitespace-pre-wrap font-sans prose prose-slate dark:prose-invert max-w-none font-medium"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(streamingText) }}
                />
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {loading && !streamingText && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700/60">
                <span className="font-semibold italic">AI Assistant is thinking</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Actions row above input */}
        {messages.length > 1 && !loading && (
          <div className="px-4 py-1.5 border-t flex justify-end bg-slate-50 dark:bg-slate-900/40" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={regenerateResponse}
              type="button"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
            >
              🔄 Regenerate Last Response
            </button>
          </div>
        )}

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
            className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold shadow-md disabled:opacity-50"
          >
            Ask AI
          </button>
        </form>
      </div>
    </div>
  );
}

function parseMarkdown(text: string) {
  if (!text) return '';
  
  // Escape HTML tags to prevent arbitrary code execution, but preserve links, tables, bold, list structures
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Render markdown bold **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Render markdown italics *text* -> <em>text</em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Render lists
  const lines = html.split('\n');
  let inList = false;
  let parsedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.substring(2);
      if (!inList) {
        inList = true;
        return `<ul><li>${content}</li>`;
      }
      return `<li>${content}</li>`;
    } else {
      if (inList) {
        inList = false;
        return `</ul>${line}`;
      }
      return line;
    }
  });
  if (inList) {
    parsedLines.push('</ul>');
  }
  html = parsedLines.join('\n');

  // Render links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">$1</a>');

  // Render tables
  const tableLines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  const finalLines = [];

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<div class="overflow-x-auto my-4 border border-slate-200 dark:border-slate-800 rounded-xl"><table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs text-left">';
        const cols = line.split('|').slice(1, -1).map(c => c.trim());
        tableHtml += '<thead class="bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-700 dark:text-slate-300"><tr>';
        cols.forEach(col => {
          tableHtml += `<th class="px-4 py-2">${col}</th>`;
        });
        tableHtml += '</tr></thead><tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">';
      } else {
        if (line.includes('---')) continue;
        const cols = line.split('|').slice(1, -1).map(c => c.trim());
        tableHtml += '<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">';
        cols.forEach(col => {
          tableHtml += `<td class="px-4 py-2">${col}</td>`;
        });
        tableHtml += '</tr>';
      }
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table></div>';
        finalLines.push(tableHtml);
      }
      finalLines.push(line);
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table></div>';
    finalLines.push(tableHtml);
  }
  html = finalLines.join('\n');

  // Strip recommend doctors tag
  html = html.replace(/\[RECOMMEND_DOCTORS:[^\]]+\]/gi, '');

  return html;
}
