import { AI } from '../config/credentials';

export type AIChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT =
  'You are Crizon AI, a friendly assistant inside the Crizon app. Reply in the user\'s language (Urdu/Roman Urdu/English). Keep answers helpful, clear, and concise.';

export const AIService = {
  /**
   * Non-streaming chat completion (safe default).
   * Returns full reply text.
   */
  chat: async (history: AIChatMessage[]): Promise<string> => {
    const body = {
      model: AI.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
      ],
      stream: false,
    };

    const res = await fetch(`${AI.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error (${res.status}): ${txt.slice(0, 100)}`);
    }

    const json = await res.json();
    const reply =
      json?.choices?.[0]?.message?.content ||
      json?.choices?.[0]?.text ||
      '';
    return String(reply).trim();
  },

  /**
   * Streaming chat (Server-Sent Events). Calls onToken for each chunk.
   * Falls back gracefully if the worker doesn't support streaming.
   */
  chatStream: async (
    history: AIChatMessage[],
    onToken: (chunk: string) => void
  ): Promise<string> => {
    const body = {
      model: AI.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
      ],
      stream: true,
    };

    const res = await fetch(`${AI.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI.apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      // Fallback to non-streaming
      const full = await AIService.chat(history);
      onToken(full);
      return full;
    }

    const reader = (res.body as any).getReader
      ? (res.body as any).getReader()
      : null;

    let full = '';

    if (!reader) {
      // React Native's fetch may not expose .getReader
      const text = await res.text();
      full = AIService._parseSSE(text);
      onToken(full);
      return full;
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const parsed = AIService._parseSSE(chunk, true, onToken);
      full += parsed;
    }

    return full;
  },

  _parseSSE: (
    raw: string,
    incremental = false,
    onToken?: (s: string) => void
  ): string => {
    const lines = raw.split('\n');
    let out = '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.replace(/^data:\s*/, '');
      if (payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload);
        const piece =
          j?.choices?.[0]?.delta?.content ||
          j?.choices?.[0]?.message?.content ||
          '';
        if (piece) {
          out += piece;
          if (incremental && onToken) onToken(piece);
        }
      } catch {
        // ignore non-JSON lines
      }
    }
    return out;
  },
};
