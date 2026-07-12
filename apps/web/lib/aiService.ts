export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function sendChatMessageStream(
  message: string,
  history: AIMessage[],
  onChunk: (chunk: string) => void
): Promise<void> {
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
    throw new Error('Failed to connect to AI assistant.');
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Streaming response is not supported by the browser.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine.startsWith('data: ')) continue;
      
      const jsonStr = cleanLine.substring(6);
      if (jsonStr === '[DONE]') {
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.text) {
          onChunk(parsed.text);
        }
      } catch (e) {
        // Skip malformed SSE lines
      }
    }
  }
}
