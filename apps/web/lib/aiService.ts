export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function sendChatMessage(message: string, history: AIMessage[]): Promise<string> {
  const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
  let token = '';
  try {
    if (raw) {
      token = (JSON.parse(raw) as { accessToken?: string }).accessToken || '';
    }
  } catch {}

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      message,
      conversationHistory: history.slice(-6).map(m => ({ role: m.role, content: m.content }))
    })
  });

  if (!res.ok) {
    throw new Error('Failed to fetch assistant response.');
  }

  const data = await res.json();
  return data.data.response;
}
