
import { Message, Role, PullProgress } from "../types";

export class LocalModelService {
  async *streamChat(
    apiBase: string,
    model: string,
    history: Message[],
    systemInstruction: string
  ) {
    const url = `${apiBase.replace(/\/$/, '')}/api/chat`;
    
    const messages = [
      { role: 'system', content: systemInstruction },
      ...history.map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              yield { text: json.message.content };
            }
          } catch (e) {
            console.error("解析失敗", e);
          }
        }
      }
    } catch (error) {
      console.error("本地模型連線失敗:", error);
      throw error;
    }
  }

  async pullModel(apiBase: string, modelName: string, onProgress: (p: PullProgress) => void, signal?: AbortSignal) {
    const url = `${apiBase.replace(/\/$/, '')}/api/pull`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
        signal
      });

      if (!response.ok) throw new Error(`無法拉取模型: ${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            const progress: PullProgress = {
              status: json.status,
              digest: json.digest,
              total: json.total,
              completed: json.completed,
              percent: json.total ? Math.round((json.completed / json.total) * 100) : 0
            };
            onProgress(progress);
          } catch (e) {
            console.error("解析拉取進度失敗", e);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("拉取模型出錯:", error);
      throw error;
    }
  }

  async listLocalModels(apiBase: string) {
    const url = `${apiBase.replace(/\/$/, '')}/api/tags`;
    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const json = await response.json();
      return json.models || [];
    } catch (e) {
      return [];
    }
  }
}

export const localModelService = new LocalModelService();
