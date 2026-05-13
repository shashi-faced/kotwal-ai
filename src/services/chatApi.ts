/**
 * Chat API service.
 *
 * All requests go through the central apiFetch which auto-refreshes on 401
 * via the httpOnly refresh-token cookie.
 *
 * Detection responses (new backend contract)
 * ------------------------------------------
 *   On BLOCK the server returns 422 with:
 *     { error, action: 'BLOCK', score, decisionReasons, categoriesPresent,
 *       findings, contributions, canOverride: false, policyVersion }
 *
 *   On WARN the server returns 409 with:
 *     { error, action: 'WARN', score, decisionReasons, categoriesPresent,
 *       findings, contributions, canOverride: true, requireOverrideReason: true,
 *       policyVersion }
 *
 *   On REDACT the server proceeds and returns 200 with the assistant message.
 */
import { API_URLS } from '@/lib/url';
import { apiFetch, ApiError } from '@/lib/apiClient';

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
  detection?: DetectionSummary;
}

export type DetectionAction = 'ALLOW' | 'WARN' | 'REDACT' | 'BLOCK';

export interface DetectionFinding {
  category?: string;
  subtype?: string;
  confidence?: number;
  /** Server already masks the original value — never the raw secret. */
  value?: string;
  start?: number;
  end?: number;
}

export interface DetectionContribution {
  category?: string;
  subtype?: string;
  weight?: number;
}

export interface DetectionSummary {
  action: DetectionAction;
  score?: number;
  decisionReasons?: string[];
  categoriesPresent?: string[];
  findings?: DetectionFinding[];
  contributions?: DetectionContribution[];
  policyVersion?: string;
}

export interface DetectionInterceptBody extends DetectionSummary {
  error?: string;
  canOverride?: boolean;
  requireOverrideReason?: boolean;
}

/**
 * Thrown when the server intercepts a prompt (BLOCK or WARN). Carries the full
 * explainability payload so the UI can render reasons + offer an override flow.
 */
export class SensitiveDataInterceptError extends Error {
  details: DetectionInterceptBody;
  status: number;

  constructor(message: string, status: number, details: DetectionInterceptBody) {
    super(message);
    this.name = 'SensitiveDataInterceptError';
    this.status = status;
    this.details = details;
  }

  get isBlock(): boolean { return this.details.action === 'BLOCK'; }
  get isWarn(): boolean { return this.details.action === 'WARN'; }
  get canOverride(): boolean { return !!this.details.canOverride; }
  get requireOverrideReason(): boolean { return !!this.details.requireOverrideReason; }
}

interface FetchChatResponseArgs {
  modelId: string;
  message: string;
  sessionId: string;
  overridePII?: boolean;
  overrideReason?: string;
}

const isInterceptBody = (b: unknown): b is DetectionInterceptBody =>
  !!b && typeof b === 'object' && typeof (b as { action?: unknown }).action === 'string';

export const fetchChatResponse = async ({
  modelId,
  message,
  sessionId,
  overridePII = false,
  overrideReason,
}: FetchChatResponseArgs): Promise<{ content: string; detection?: DetectionSummary }> => {
  const res = await apiFetch(API_URLS.chat.send, {
    method: 'POST',
    body: {
      modelId,
      message,
      sessionId,
      ...(overridePII ? { overridePII: true } : {}),
      ...(overrideReason ? { overrideReason } : {}),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }

  // Intercept paths: 422 BLOCK, 409 WARN.
  if ((res.status === 422 || res.status === 409) && isInterceptBody(body)) {
    const details = body as DetectionInterceptBody;
    throw new SensitiveDataInterceptError(
      details.error || (details.action === 'BLOCK' ? 'Prompt blocked.' : 'Prompt requires confirmation.'),
      res.status,
      details,
    );
  }

  if (!res.ok) {
    const msg =
      (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : null) || `Failed to get chat response (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }

  const data = (body || {}) as ChatCompletionResponse;
  const content = data.message ?? data.response ?? data.content ?? '';
  if (!content) throw new Error('Chat API returned an empty response');
  return { content, detection: data.detection };
};

export const fetchChatModels = async (): Promise<ChatModel[]> => {
  const res = await apiFetch(API_URLS.chat.models, { method: 'GET' });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as { error?: string })?.error || 'Failed to load chat models');
  }
  const data = (await res.json()) as { models?: ChatModel[] } | ChatModel[];
  if (Array.isArray(data)) return data;
  return data.models ?? [];
};

// --- Helpers shared by session normalisation -------------------------------

const extractArray = <T>(payload: unknown, keys: string[] = []): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      const v = (payload as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

const pickField = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) if (key in record) return record[key];
  return undefined;
};

const findArrayInRecord = (record: Record<string, unknown>, keys: string[]): unknown[] | null => {
  for (const key of keys) {
    const v = record[key];
    if (Array.isArray(v)) return v;
  }
  return null;
};

const toDateValue = (v: unknown): string | Date | undefined => {
  if (typeof v === 'string' || v instanceof Date) return v;
  return undefined;
};

const parseNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};

const toChatHistoryMessages = (rawMessages: unknown): ChatHistoryMessage[] => {
  if (!Array.isArray(rawMessages)) return [];
  const out: ChatHistoryMessage[] = [];
  rawMessages.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const r = entry as Record<string, unknown>;
    const idSeed =
      (typeof r.id === 'string' && r.id) ||
      (typeof r.sessionId === 'string' && `${r.sessionId}-${index}`) ||
      `${index}`;
    const ts = toDateValue(r.updatedAt) ?? toDateValue(r.createdAt);
    const timestamp = ts instanceof Date ? ts : typeof ts === 'string' ? new Date(ts) : new Date();

    if (typeof r.message === 'string') {
      out.push({ id: `${idSeed}-user`, role: 'user', content: r.message, timestamp });
    }
    if (typeof r.response === 'string') {
      out.push({ id: `${idSeed}-assistant`, role: 'assistant', content: r.response, timestamp });
    }
  });
  return out;
};

interface NormalizeOptions {
  includeMessages?: boolean;
  fallbackSessionId?: string;
  messagesSource?: unknown;
}

const normalizeSessionPayload = (
  sessionInput: Record<string, unknown> | unknown[],
  opts: NormalizeOptions = {},
): ChatSession | null => {
  const session = Array.isArray(sessionInput) ? {} : sessionInput;
  const rawSessionId = pickField(session, ['sessionId', 'id', 'session_id']);
  const sessionId =
    (typeof rawSessionId === 'string' && rawSessionId.trim().length > 0 ? rawSessionId : null) ??
    opts.fallbackSessionId ??
    null;
  if (!sessionId) return null;

  const startedAt = toDateValue(pickField(session, ['startedAt', 'createdAt']));
  const lastMessageAt = toDateValue(pickField(session, ['lastMessageAt', 'updatedAt']));
  const messageCount = parseNumber(pickField(session, ['messageCount', 'messagesCount', 'count']));
  const titleRaw = pickField(session, ['title', 'name']);

  const out: ChatSession = {
    sessionId,
    title: typeof titleRaw === 'string' ? titleRaw : undefined,
    startedAt,
    lastMessageAt,
    messageCount,
  };

  if (opts.includeMessages) {
    const src = opts.messagesSource ?? sessionInput;
    const raw = extractArray<unknown>(src, ['messages', 'history', 'records', 'data', 'items']);
    const messages = toChatHistoryMessages(raw);
    out.messages = messages;
    if (!out.messageCount && messages.length) out.messageCount = messages.length;
  }
  return out;
};

export const fetchChatSessions = async (): Promise<ChatSession[]> => {
  const res = await apiFetch(API_URLS.chat.sessions, { method: 'GET', cache: 'no-store' });
  if (res.status === 304) return [];
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as { error?: string })?.error || 'Failed to fetch chat sessions');
  }
  const payload = await res.json().catch(() => null);
  const raw = extractArray<Record<string, unknown>>(payload, ['sessions', 'data', 'items']);
  return raw.map((s) => normalizeSessionPayload(s)).filter((s): s is ChatSession => s !== null);
};

export const fetchChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  const res = await apiFetch(`${API_URLS.chat.sessions}/${sessionId}`, { method: 'GET', cache: 'no-store' });
  if (res.status === 304) return null;
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as { error?: string })?.error || 'Failed to fetch chat session');
  }
  const payload = await res.json().catch(() => null);
  if (!payload) return null;

  let sessionSource: Record<string, unknown> | unknown[] | null = null;
  let messagesSource: unknown = null;

  if (Array.isArray(payload)) {
    sessionSource = payload;
    messagesSource = payload;
  } else if (isRecord(payload)) {
    const nestedKeys = ['session', 'data', 'payload', 'result'];
    for (const k of nestedKeys) {
      const c = payload[k];
      if (isRecord(c)) { sessionSource = c; break; }
      if (Array.isArray(c) && !messagesSource) messagesSource = c;
    }
    if (!sessionSource) sessionSource = payload;

    const top =
      findArrayInRecord(payload, ['messages', 'history', 'records', 'items']) ??
      (Array.isArray(payload.data) ? (payload.data as unknown[]) : null);
    if (top) messagesSource = top;

    if (!messagesSource && sessionSource && !Array.isArray(sessionSource)) {
      const nested = findArrayInRecord(sessionSource, ['messages', 'history', 'records', 'data']);
      if (nested) messagesSource = nested;
    }
    if (!messagesSource) messagesSource = payload;
  } else {
    return null;
  }

  return normalizeSessionPayload(sessionSource ?? {}, {
    includeMessages: true,
    fallbackSessionId: sessionId,
    messagesSource,
  });
};

// --- Back-compat alias so existing imports compile during the rewire ---
export { SensitiveDataInterceptError as SensitiveDataBlockedError };
export type PiiDetectionDetails = DetectionInterceptBody;
export type PiiDetectionFinding = DetectionFinding;
