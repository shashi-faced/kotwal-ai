import { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Message, Conversation } from '@/types/chat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import Sidebar from './Sidebar';
import {
  fetchChatModels,
  fetchChatResponse,
  fetchChatSession,
  fetchChatSessions,
  ChatModel,
  ChatSession,
  SensitiveDataInterceptError,
  DetectionInterceptBody,
  DetectionFinding,
} from '@/services/chatApi';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const generateSessionId = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h: string[] = [];
  for (let i = 0; i < 256; i += 1) h.push(i.toString(16).padStart(2, '0'));
  return (
    h[bytes[0]] + h[bytes[1]] + h[bytes[2]] + h[bytes[3]] + '-' +
    h[bytes[4]] + h[bytes[5]] + '-' +
    h[bytes[6]] + h[bytes[7]] + '-' +
    h[bytes[8]] + h[bytes[9]] + '-' +
    h[bytes[10]] + h[bytes[11]] + h[bytes[12]] + h[bytes[13]] + h[bytes[14]] + h[bytes[15]]
  );
};

const EMPTY_MODELS: { value: string; label: string }[] = [];

interface DetectionNotice {
  id: string;
  /** The user's original prompt — kept locally to power "Edit" + "Proceed". */
  userMessage: string;
  details: DetectionInterceptBody;
  timestamp: Date;
}

const formatScore = (score?: number) => (typeof score === 'number' ? Math.round(score * 100) : null);

const formatFindingLabel = (f: DetectionFinding): string => {
  const subtype = (f.subtype || '').replace(/_/g, ' ').toLowerCase();
  const category = (f.category || '').replace(/_/g, ' ').toLowerCase();
  const label = subtype || category || 'sensitive data';
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeSessionMessages = (session: ChatSession): Message[] => {
  const rawMessages = (session.messages ?? []) as unknown[];
  if (!rawMessages.length) return [];
  const out: Message[] = [];
  rawMessages.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const r = entry as Record<string, unknown>;
    const baseId = (typeof r.id === 'string' && r.id) || `${session.sessionId}-${index}`;
    const tsSrc = r.timestamp ?? r.updatedAt ?? r.createdAt ?? new Date();
    const ts = tsSrc instanceof Date ? tsSrc : typeof tsSrc === 'string' ? new Date(tsSrc) : new Date();

    if ('role' in r && (r.role === 'user' || r.role === 'assistant')) {
      out.push({
        id: typeof r.id === 'string' ? r.id : baseId,
        role: r.role as 'user' | 'assistant',
        content: typeof r.content === 'string' ? r.content : '',
        timestamp: ts,
      });
      return;
    }
    if (typeof r.message === 'string') out.push({ id: `${baseId}-user`, role: 'user', content: r.message, timestamp: ts });
    if (typeof r.response === 'string') out.push({ id: `${baseId}-assistant`, role: 'assistant', content: r.response, timestamp: ts });
  });
  return out;
};

const ChatContainer = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelOptions, setModelOptions] = useState(EMPTY_MODELS);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [notices, setNotices] = useState<DetectionNotice[]>([]);
  const [overrideReasonByNotice, setOverrideReasonByNotice] = useState<Record<string, string>>({});
  const [chatInputValue, setChatInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const hasInitializedHistory = useRef(false);
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [activeConversation?.messages, scrollToBottom]);

  const mapSessionToConversation = useCallback((session: ChatSession): Conversation => {
    const fallbackTitle =
      session.lastMessageAt || session.startedAt
        ? new Date(session.lastMessageAt ?? session.startedAt ?? new Date()).toLocaleString()
        : 'Previous chat';
    return {
      id: session.sessionId,
      sessionId: session.sessionId,
      title: session.title?.trim() || fallbackTitle,
      messages: normalizeSessionMessages(session),
      createdAt: session.startedAt ? new Date(session.startedAt) : new Date(),
      updatedAt: session.lastMessageAt ? new Date(session.lastMessageAt) : new Date(),
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    (async () => {
      setModelsLoading(true);
      try {
        const models = await fetchChatModels();
        if (!isMounted || !models.length) return;
        const opts = models.map((m: ChatModel) => ({ value: m.id, label: `${m.name} · ${m.provider}` }));
        setModelOptions(opts);
        setSelectedModel(opts[0].value);
      } catch (error) {
        toast({
          title: 'Unable to fetch models',
          description: error instanceof Error ? error.message : 'Try again later.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setModelsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    (async () => {
      try {
        const sessions = await fetchChatSessions();
        if (!isMounted) return;
        const mapped = sessions.map(mapSessionToConversation);
        setConversations((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const merged = [...mapped];
          prev.forEach((c) => { if (!existing.has(c.id)) merged.push(c); });
          return merged;
        });
        if (!hasInitializedHistory.current && mapped.length > 0) {
          setActiveConversationId((prev) => prev ?? mapped[0].id);
          hasInitializedHistory.current = true;
        }
      } catch (error) {
        toast({
          title: 'Unable to load history',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      }
    })();
    return () => { isMounted = false; };
  }, [token, mapSessionToConversation]);

  const createNewConversation = (firstMessage: string): Conversation => {
    const sessionId = generateSessionId();
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
    const c: Conversation = {
      id: sessionId, sessionId, title, messages: [], createdAt: new Date(), updatedAt: new Date(),
    };
    setConversations((prev) => [c, ...prev]);
    setActiveConversationId(sessionId);
    return c;
  };

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
    setOverrideReasonByNotice((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const clearAllNotices = useCallback(() => {
    setNotices([]);
    setOverrideReasonByNotice({});
  }, []);

  const handleSendMessage = async (
    content: string,
    options: { skipNotices?: boolean; overridePII?: boolean; overrideReason?: string } = {},
  ) => {
    let target = conversations.find((c) => c.id === activeConversationId) ?? null;
    if (!target) target = createNewConversation(content);
    const conversationId = target.id;
    const sessionId = target.sessionId ?? target.id;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((c) => c.id === conversationId
        ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() }
        : c),
    );

    if (!options.skipNotices) {
      setChatInputValue('');
      setNotices([]);
      setOverrideReasonByNotice({});
    }
    setIsTyping(true);

    try {
      const result = await fetchChatResponse({
        modelId: selectedModel,
        message: content,
        sessionId,
        overridePII: options.overridePII ?? false,
        overrideReason: options.overrideReason,
      });

      await new Promise((r) => setTimeout(r, 200));
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((c) => c.id === conversationId
          ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
          : c),
      );
    } catch (error) {
      if (error instanceof SensitiveDataInterceptError) {
        // Roll the user's prompt back out of the visible thread; show notice instead.
        setConversations((prev) =>
          prev.map((c) => c.id === conversationId
            ? { ...c, messages: c.messages.filter((m) => m.id !== userMessage.id), updatedAt: new Date() }
            : c),
        );
        if (!options.skipNotices) {
          const noticeId = `${Date.now()}`;
          setNotices((prev) => [{
            id: noticeId,
            userMessage: content,
            details: error.details,
            timestamp: new Date(),
          }, ...prev].slice(0, 3));
          setChatInputValue(content);
          setTimeout(() => chatInputRef.current?.focus(), 0);
        }
      } else {
        const fallback =
          "I'm having trouble reaching the Kotwal API right now. Please try again in a moment.";
        setConversations((prev) =>
          prev.map((c) => c.id === conversationId
            ? { ...c, messages: [...c.messages, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: fallback,
                timestamp: new Date(),
              } as Message], updatedAt: new Date() }
            : c),
        );
        toast({
          title: 'Unable to reach Kotwal',
          description: error instanceof Error ? error.message : 'Unknown error.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleProceedAnyway = async (notice: DetectionNotice) => {
    const reason = (overrideReasonByNotice[notice.id] || '').trim();
    if (notice.details.requireOverrideReason && !reason) {
      toast({
        title: 'Reason required',
        description: 'Please describe why this prompt is safe to send before proceeding.',
        variant: 'destructive',
      });
      return;
    }
    dismissNotice(notice.id);
    await handleSendMessage(notice.userMessage, {
      skipNotices: true,
      overridePII: true,
      overrideReason: reason || undefined,
    });
  };

  const hydrateConversation = useCallback(
    async (sessionId: string) => {
      if (!token) return;
      setLoadingSessionId(sessionId);
      try {
        const session = await fetchChatSession(sessionId);
        if (!session) {
          toast({
            title: 'Session unavailable',
            description: 'Unable to fetch this chat session. Please try another one.',
            variant: 'destructive',
          });
          return;
        }
        const hydrated = mapSessionToConversation(session);
        setConversations((prev) => {
          const others = prev.filter((c) => c.id !== hydrated.id);
          return [hydrated, ...others];
        });
      } catch (error) {
        toast({
          title: 'Unable to load chat',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoadingSessionId((cur) => (cur === sessionId ? null : cur));
      }
    },
    [mapSessionToConversation, token],
  );

  const handleNewChat = () => {
    setActiveConversationId(null);
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
    const existing = conversations.find((c) => c.id === id);
    if (!existing || existing.messages.length === 0) void hydrateConversation(id);
  };

  const hasMessages = Boolean(activeConversation && activeConversation.messages.length);

  return (
    <div className="chat-theme flex h-screen bg-background text-foreground">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        loadingSessionId={loadingSessionId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onOpenDashboard={() => { setSidebarOpen(false); navigate('/dashboard'); }}
        userEmail={user?.email}
        onLogout={async () => {
          setSidebarOpen(false);
          await logout();
          navigate('/login');
        }}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-white via-white to-slate-50/60">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-10">
          <div className="pb-32 pt-10">
            <div className="max-w-3xl mx-auto px-4">
              {!hasMessages ? (
                <WelcomeScreen />
              ) : (
                <div className="space-y-6">
                  {activeConversation?.messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isTyping={
                        isTyping && message.role === 'assistant' &&
                        index === (activeConversation?.messages.length ?? 0) - 1
                      }
                    />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Detection notices */}
        {notices.length > 0 && (
          <div className="border-t border-amber-200 bg-amber-50/95 px-4 py-6 shadow-inner">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-white/70 p-2 text-amber-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Sensitive content detected
                    </p>
                    <p className="text-xs text-amber-800">
                      Kotwal stopped your prompt before it left your network. Review the explanation below.
                    </p>
                  </div>
                </div>
                {notices.length > 1 && (
                  <button
                    type="button"
                    onClick={clearAllNotices}
                    className="text-xs font-medium text-amber-800 underline-offset-4 hover:underline"
                  >
                    Dismiss all
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {notices.map((notice) => {
                  const d = notice.details;
                  const action = d.action;
                  const isBlock = action === 'BLOCK';
                  const isWarn = action === 'WARN';
                  const canOverride = !!d.canOverride && isWarn;
                  const requireReason = !!d.requireOverrideReason;
                  const scorePct = formatScore(d.score);
                  const cardCls = isBlock
                    ? 'border-red-200 bg-red-50 text-red-900'
                    : 'border-amber-200 bg-white/90 text-amber-900';
                  const accent = isBlock ? 'text-red-600' : 'text-amber-600';
                  const promptBg = isBlock
                    ? 'bg-red-100/60 text-red-900'
                    : 'bg-amber-100/60 text-amber-900';

                  return (
                    <div key={notice.id} className={`rounded-2xl border p-4 text-sm shadow ${cardCls}`}>
                      {/* Header: action + score + dismiss */}
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-center gap-2">
                          {isBlock
                            ? <ShieldAlert className={`h-4 w-4 ${accent}`} />
                            : <ShieldCheck className={`h-4 w-4 ${accent}`} />}
                          <span className="text-sm font-semibold">{action}</span>
                          {scorePct !== null && (
                            <span className={`text-xs font-semibold ${accent}`}>
                              · risk {scorePct}/100
                            </span>
                          )}
                          {d.policyVersion && (
                            <span className="text-[11px] text-gray-500">policy {d.policyVersion}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissNotice(notice.id)}
                          className="text-xs font-medium text-gray-500 underline-offset-4 hover:underline"
                        >
                          Dismiss
                        </button>
                      </div>

                      {/* Categories present */}
                      {d.categoriesPresent && d.categoriesPresent.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {d.categoriesPresent.map((cat) => (
                            <span
                              key={cat}
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${isBlock ? 'border-red-200 bg-red-100/70' : 'border-amber-200 bg-amber-100/70'}`}
                            >
                              {cat.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Prompt preview */}
                      <div className="mt-3">
                        <p className={`text-[11px] font-semibold uppercase tracking-wide ${accent}`}>
                          Your prompt
                        </p>
                        <div className={`mt-1 max-h-32 overflow-auto rounded-xl ${promptBg} p-3 font-mono text-xs leading-relaxed`}>
                          {notice.userMessage}
                        </div>
                      </div>

                      {/* Findings */}
                      {d.findings && d.findings.length > 0 && (
                        <div className={`mt-3 rounded-xl border p-3 ${isBlock ? 'border-red-100 bg-red-50/60' : 'border-amber-100 bg-amber-50/70'}`}>
                          <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${accent}`}>
                            What we found
                          </p>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {d.findings.map((f, i) => (
                              <li key={`${f.subtype || f.category}-${i}`} className="rounded-lg bg-white/80 p-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold">{formatFindingLabel(f)}</span>
                                  {typeof f.confidence === 'number' && (
                                    <span className="text-[10px] text-gray-500">
                                      {Math.round(f.confidence * 100)}% conf
                                    </span>
                                  )}
                                </div>
                                {f.value && (
                                  <div className="mt-1 font-mono text-[11px] text-gray-700">{f.value}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Decision reasons */}
                      {d.decisionReasons && d.decisionReasons.length > 0 && (
                        <details className="mt-3 text-xs">
                          <summary className="cursor-pointer font-semibold">Why this decision?</summary>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                            {d.decisionReasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {/* Override flow (WARN only) */}
                      {canOverride && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-white p-3">
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                            Reason for override {requireReason && <span className="text-red-600">*</span>}
                          </label>
                          <p className="mt-0.5 text-[11px] text-gray-600">
                            This is logged to your tenant's audit trail. Be specific — e.g. "Test data, not real PII".
                          </p>
                          <textarea
                            value={overrideReasonByNotice[notice.id] || ''}
                            onChange={(e) => setOverrideReasonByNotice((prev) => ({ ...prev, [notice.id]: e.target.value }))}
                            placeholder="Explain why this prompt is safe to send"
                            className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-amber-400 focus:outline-none"
                            rows={2}
                            maxLength={500}
                          />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setChatInputValue(notice.userMessage);
                            setTimeout(() => chatInputRef.current?.focus(), 0);
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${isBlock ? 'border-red-300 text-red-800 hover:bg-red-100' : 'border-amber-300 text-amber-800 hover:bg-amber-100'}`}
                        >
                          Edit prompt
                        </button>
                        {canOverride && (
                          <button
                            type="button"
                            onClick={() => handleProceedAnyway(notice)}
                            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={requireReason && !(overrideReasonByNotice[notice.id] || '').trim()}
                          >
                            Send with override
                          </button>
                        )}
                      </div>

                      {isBlock && (
                        <p className="mt-3 text-[11px] text-red-700">
                          This prompt cannot be overridden. Edit it to remove the highlighted entities and try again.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="sticky bottom-0 border-t border-white/70 bg-gradient-to-t from-white via-white to-white/60 px-3 pb-2 pt-4 sm:px-6">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isTyping || modelsLoading}
            selectedModel={selectedModel}
            onChangeModel={setSelectedModel}
            modelOptions={modelOptions}
            value={chatInputValue}
            onInputChange={setChatInputValue}
            inputRef={chatInputRef}
          />
        </div>
      </main>
    </div>
  );
};

export default ChatContainer;
