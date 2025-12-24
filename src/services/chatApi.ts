import { API_URLS } from '@/lib/url';
import { handleUnauthorized } from '@/lib/session';
import { getStoredToken } from '@/lib/authStorage';

export interface ChatModel {
  id: string;
  name: string;
  provider: string;
}

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string | Date;
}

export interface ChatSession {
  sessionId: string;
  title?: string;
  messages?: ChatHistoryMessage[];
  startedAt?: string | Date;
  lastMessageAt?: string | Date;
  messageCount?: number;
}

interface ChatCompletionResponse {
  message?: string;
  response?: string;
  content?: string;
}

export interface PiiDetectionFinding {
  type?: string;
  label?: string;
  riskScore?: number;
  layer?: string;
}

export interface PiiDetectionDetails {
  success?: boolean;
  safe?: boolean;
  action?: string;
  findings?: PiiDetectionFinding[];
  latencyMs?: number;
  reason?: string[];
  riskLevel?: string;
  riskScore?: number;
  sensitive?: boolean;
}

interface ChatApiErrorBody {
  message?: string;
  error?: string;
  piiDetails?: PiiDetectionDetails;
}

export class SensitiveDataBlockedError extends Error {
  details?: PiiDetectionDetails;

  constructor(message: string, details?: PiiDetectionDetails) {
    super(message);
    this.name = 'SensitiveDataBlockedError';
    this.details = details;
  }
}

type FetchChatResponseArgs = {
  modelId: string;
  message: string;
  sessionId: string;
  overridePII?: boolean;
};

const extractArray = <T>(payload: unknown, keys: string[] = []): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }
  return [];
};

const toDateValue = (value: unknown): string | Date | undefined => {
  if (typeof value === 'string' || value instanceof Date) return value;
  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const pickField = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
};

const findArrayInRecord = (record: Record<string, unknown>, keys: string[]): unknown[] | null => {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
};

const toChatHistoryMessages = (rawMessages: unknown): ChatHistoryMessage[] => {
  if (!Array.isArray(rawMessages)) return [];
  const normalized: ChatHistoryMessage[] = [];

  rawMessages.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const idSeed =
      (typeof record.id === 'string' && record.id) ||
      (typeof record.sessionId === 'string' && `${record.sessionId}-${index}`) ||
      `${index}`;
    const timestampSource = toDateValue(record.updatedAt) ?? toDateValue(record.createdAt);
    const timestamp =
      timestampSource instanceof Date ? timestampSource : typeof timestampSource === 'string' ? new Date(timestampSource) : new Date();

    if (typeof record.message === 'string') {
      normalized.push({
        id: `${idSeed}-user`,
        role: 'user',
        content: record.message,
        timestamp,
      });
    }

    if (typeof record.response === 'string') {
      normalized.push({
        id: `${idSeed}-assistant`,
        role: 'assistant',
        content: record.response,
        timestamp,
      });
    }
  });

  return normalized;
};

type NormalizeOptions = {
  includeMessages?: boolean;
  fallbackSessionId?: string;
  messagesSource?: unknown;
};

const normalizeSessionPayload = (
  sessionInput: Record<string, unknown> | unknown[],
  options: NormalizeOptions = {},
): ChatSession | null => {
  const session = Array.isArray(sessionInput) ? {} : sessionInput;
  const rawSessionId = pickField(session, ['sessionId', 'id', 'session_id']) as unknown;
  const sessionId =
    (typeof rawSessionId === 'string' && rawSessionId.trim().length > 0 ? rawSessionId : null) ??
    options.fallbackSessionId ??
    null;

  if (!sessionId) return null;

  const startedAt = toDateValue(pickField(session, ['startedAt', 'createdAt']));
  const lastMessageAt = toDateValue(pickField(session, ['lastMessageAt', 'updatedAt']));
  const messageCount = parseNumber(pickField(session, ['messageCount', 'messagesCount', 'count']));
  const titleRaw = pickField(session, ['title', 'name']);

  const normalized: ChatSession = {
    sessionId,
    title: typeof titleRaw === 'string' ? titleRaw : undefined,
    startedAt,
    lastMessageAt,
    messageCount,
  };

  if (options.includeMessages) {
    const rawMessagesSource = options.messagesSource ?? sessionInput;
    const rawMessages = extractArray<unknown>(rawMessagesSource, ['messages', 'history', 'records', 'data', 'items']);
    const messages = toChatHistoryMessages(rawMessages);
    normalized.messages = messages;
    if (!normalized.messageCount && messages.length) {
      normalized.messageCount = messages.length;
    }
  }

  return normalized;
};

export const fetchChatResponse = async (
  { modelId, message, sessionId, overridePII = false }: FetchChatResponseArgs,
  authToken?: string,
): Promise<string> => {
  const token = authToken ?? getStoredToken();
  const response = await fetch(API_URLS.chat.send, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      modelId,
      message,
      sessionId,
      ...(overridePII ? { overridePII: true } : {}),
    }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return '';
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ChatApiErrorBody;
    console.log('API Error Response:', { status: response.status, body: errorBody });
    
    const piiDetails = errorBody?.piiDetails;
    console.log('PII Details:', piiDetails);

    if (
      response.status === 400 &&
      piiDetails &&
      typeof piiDetails === 'object' &&
      typeof piiDetails.action === 'string' &&
      piiDetails.action.toUpperCase() === 'BLOCK'
    ) {
      console.log('Throwing SensitiveDataBlockedError');
      const messageFromApi =
        (typeof errorBody.error === 'string' && errorBody.error) ||
        (typeof errorBody.message === 'string' && errorBody.message) ||
        'Sensitive data found in message.';
      throw new SensitiveDataBlockedError(messageFromApi, piiDetails);
    }

    throw new Error(errorBody?.message || errorBody?.error || 'Failed to get chat response');
  }

  const data: ChatCompletionResponse = await response.json();
  const assistantMessage = data.message ?? data.response ?? data.content ?? '';

  if (!assistantMessage) {
    throw new Error('Chat API returned an empty response');
  }

  return assistantMessage;
};

export const fetchChatModels = async (authToken?: string): Promise<ChatModel[]> => {
  const token = authToken ?? getStoredToken();
  const response = await fetch(API_URLS.chat.models, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    return [];
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || 'Failed to load chat models');
  }

  const data = (await response.json()) as { models: ChatModel[] };
  return data.models ?? [];
};

export const fetchChatSessions = async (authToken?: string): Promise<ChatSession[]> => {
  const token = authToken ?? getStoredToken();
  const response = await fetch(API_URLS.chat.sessions, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    handleUnauthorized();
    return [];
  }

  const isNotModified = response.status === 304;

  if (!response.ok && !isNotModified) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || 'Failed to fetch chat sessions');
  }

  const payload = await response.json().catch(() => null);
  const rawSessions = extractArray<Record<string, unknown>>(payload, ['sessions', 'data', 'items']);

  const sessions: ChatSession[] = rawSessions
    .map((session) => normalizeSessionPayload(session))
    .filter((session): session is ChatSession => session !== null);

  return sessions;
};

export const fetchChatSession = async (sessionId: string, authToken?: string): Promise<ChatSession | null> => {
  const token = authToken ?? getStoredToken();
  const response = await fetch(`${API_URLS.chat.sessions}/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  const isNotModified = response.status === 304;

  if (!response.ok && !isNotModified) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || 'Failed to fetch chat session');
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    return null;
  }

  let sessionSource: Record<string, unknown> | unknown[] | null = null;
  let messagesSource: unknown = null;

  if (Array.isArray(payload)) {
    sessionSource = payload;
    messagesSource = payload;
  } else if (isRecord(payload)) {
    const payloadRecord = payload;
    const nestedSessionKeys = ['session', 'data', 'payload', 'result'];

    for (const key of nestedSessionKeys) {
      const candidate = payloadRecord[key];
      if (isRecord(candidate)) {
        sessionSource = candidate;
        break;
      }
      if (Array.isArray(candidate) && !messagesSource) {
        messagesSource = candidate;
      }
    }

    if (!sessionSource) {
      sessionSource = payloadRecord;
    }

    const topLevelMessages =
      findArrayInRecord(payloadRecord, ['messages', 'history', 'records', 'items']) ??
      (Array.isArray(payloadRecord.data) ? (payloadRecord.data as unknown[]) : null);
    if (topLevelMessages) {
      messagesSource = topLevelMessages;
    }

    if (!messagesSource && sessionSource && !Array.isArray(sessionSource)) {
      const nestedMessages = findArrayInRecord(sessionSource, ['messages', 'history', 'records', 'data']);
      if (nestedMessages) {
        messagesSource = nestedMessages;
      }
    }

    if (!messagesSource) {
      messagesSource = payloadRecord;
    }
  } else {
    return null;
  }

  return normalizeSessionPayload(sessionSource ?? {}, {
    includeMessages: true,
    fallbackSessionId: sessionId,
    messagesSource,
  });
};
