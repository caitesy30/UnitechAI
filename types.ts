
export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export type Provider = 'gemini' | 'local';

export interface Attachment {
  mimeType: string;
  data: string; // base64
  url: string; // blob url for UI
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  groundingSources?: GroundingSource[];
  timestamp: number;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  systemInstruction: string;
  model: string;
  provider: Provider;
  apiBase?: string;
  useSearch: boolean;
  imageSize?: ImageSize;
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
}

export type GeminiModel = string;
