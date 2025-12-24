import { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
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
  SensitiveDataBlockedError,
  PiiDetectionDetails,
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
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set UUID version (4) and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const byteToHex: string[] = [];
  for (let i = 0; i < 256; i += 1) {
    byteToHex.push(i.toString(16).padStart(2, '0'));
  }

  return (
    byteToHex[bytes[0]] +
    byteToHex[bytes[1]] +
    byteToHex[bytes[2]] +
    byteToHex[bytes[3]] +
    '-' +
    byteToHex[bytes[4]] +
    byteToHex[bytes[5]] +
    '-' +
    byteToHex[bytes[6]] +
    byteToHex[bytes[7]] +
    '-' +
    byteToHex[bytes[8]] +
    byteToHex[bytes[9]] +
    '-' +
    byteToHex[bytes[10]] +
    byteToHex[bytes[11]] +
    byteToHex[bytes[12]] +
    byteToHex[bytes[13]] +
    byteToHex[bytes[14]] +
    byteToHex[bytes[15]]
  );
};

const FALLBACK_MODELS: { value: string; label: string }[] = [
  { value: 'fallback-mini', label: 'Kotwal Mini · Fast' },
  { value: 'fallback-pro', label: 'Kotwal Pro · Balanced' },
  { value: 'fallback-ultra', label: 'Kotwal Ultra · Detailed' },
];

interface SensitiveDataNotice {
  message: string;
  details?: PiiDetectionDetails;
  userMessage: string;
  timestamp: Date;
}

const normalizeSessionMessages = (session: ChatSession): Message[] => {
  const rawMessages = (session.messages ?? []) as unknown[];
  if (!rawMessages.length) return [];

  const normalized: Message[] = [];
  rawMessages.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const baseId =
      (typeof record.id === 'string' && record.id) || `${session.sessionId}-${index}`;
    const timestampSource =
      record.timestamp ??
      record.updatedAt ??
      record.createdAt ??
      new Date();
    const timestamp =
      timestampSource instanceof Date
        ? timestampSource
        : typeof timestampSource === 'string'
          ? new Date(timestampSource)
          : new Date();

    if ('role' in record && (record.role === 'user' || record.role === 'assistant')) {
      normalized.push({
        id: typeof record.id === 'string' ? record.id : baseId,
        role: record.role as 'user' | 'assistant',
        content: typeof record.content === 'string' ? record.content : '',
        timestamp,
      });
      return;
    }

    if (typeof record.message === 'string') {
      normalized.push({
        id: `${baseId}-user`,
        role: 'user',
        content: record.message,
        timestamp,
      });
    }

    if (typeof record.response === 'string') {
      normalized.push({
        id: `${baseId}-assistant`,
        role: 'assistant',
        content: record.response,
        timestamp,
      });
    }
  });

  return normalized;
};

const ChatContainer = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelOptions, setModelOptions] = useState(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0].value);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [sensitiveNotices, setSensitiveNotices] = useState<SensitiveDataNotice[]>([]);
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

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, scrollToBottom]);

  const mapSessionToConversation = useCallback((session: ChatSession): Conversation => {
    const fallbackTitle =
      session.lastMessageAt || session.startedAt
        ? new Date(session.lastMessageAt ?? session.startedAt ?? new Date()).toLocaleString()
        : 'Previous chat';

    const normalizedMessages = normalizeSessionMessages(session);

    return {
      id: session.sessionId,
      sessionId: session.sessionId,
      title: session.title?.trim() || fallbackTitle,
      messages: normalizedMessages,
      createdAt: session.startedAt ? new Date(session.startedAt) : new Date(),
      updatedAt: session.lastMessageAt ? new Date(session.lastMessageAt) : new Date(),
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const models = await fetchChatModels(token);
        if (!isMounted || !models.length) return;

        const options = models.map((model: ChatModel) => ({
          value: model.id,
          label: `${model.name} · ${model.provider}`,
        }));

        setModelOptions(options);
        setSelectedModel(options[0].value);
      } catch (error) {
        console.error('Failed to load chat models', error);
        toast({
          title: 'Unable to fetch models',
          description: error instanceof Error ? error.message : 'Try again later.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setModelsLoading(false);
        }
      }
    };

    loadModels();
    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const sessions = await fetchChatSessions(token);
        if (!isMounted) return;
        const mapped = sessions.map(mapSessionToConversation);
        setConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const merged = [...mapped];
          prev.forEach((conversation) => {
            if (!existingIds.has(conversation.id)) {
              merged.push(conversation);
            }
          });
          return merged;
        });
        if (!hasInitializedHistory.current && mapped.length > 0) {
          setActiveConversationId((prev) => prev ?? mapped[0].id);
          hasInitializedHistory.current = true;
        }
      } catch (error) {
        console.error('Failed to load chat history', error);
        toast({
          title: 'Unable to load history',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const createNewConversation = (firstMessage: string): Conversation => {
    const sessionId = generateSessionId();
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
    const newConversation: Conversation = {
      id: sessionId,
      sessionId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(sessionId);
    return newConversation;
  };

  const dismissSensitiveNotice = useCallback((timestamp: number) => {
    setSensitiveNotices((prev) => prev.filter((notice) => notice.timestamp.getTime() !== timestamp));
  }, []);

  const clearAllSensitiveNotices = useCallback(() => {
    setSensitiveNotices([]);
  }, []);

  const handleSendMessage = async (
    content: string,
    options: { skipNotices?: boolean; override?: boolean } = {},
  ) => {
    let targetConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

    if (!targetConversation) {
      targetConversation = createNewConversation(content);
    }

    const conversationId = targetConversation.id;
    const sessionId = targetConversation.sessionId ?? targetConversation.id;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() }
          : c
      )
    );

    if (!options.skipNotices) {
      setChatInputValue('');
    }
    setIsTyping(true);

    let assistantContent: string | null = null;
    let blockedDueToSensitive = false;

    try {
      assistantContent = await fetchChatResponse(
        {
          modelId: selectedModel,
          message: content,
          sessionId,
          override: options.override ?? false,
        },
        token,
      );
    } catch (error) {
      if (error instanceof SensitiveDataBlockedError) {
        blockedDueToSensitive = true;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.filter((message) => message.id !== userMessage.id),
                  updatedAt: new Date(),
                }
              : c,
          ),
        );

        if (!options.skipNotices && !options.override) {
          setSensitiveNotices((prev) => {
            const notice: SensitiveDataNotice = {
              message: error.message || 'Sensitive data found in message.',
              details: error.details,
              userMessage: content,
              timestamp: new Date(),
            };
            return [notice, ...prev].slice(0, 3);
          });
          setChatInputValue(content);
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 0);
        }
        console.warn('Sensitive data blocked', error);
        assistantContent = null;
      } else {
        console.error('Failed to fetch chat response', error);
        assistantContent =
          "I'm having trouble reaching the Kotwal API right now, but we can keep chatting if you'd like!";
        toast({
          title: 'Unable to reach Kotwal',
          description: error instanceof Error ? error.message : 'Unknown error occurred.',
          variant: 'destructive',
        });
      }
    }

    if (assistantContent !== null) {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
            : c
        )
      );
    } else if (blockedDueToSensitive) {
      setIsTyping(false);
      return;
    }

    setIsTyping(false);
  };

  const hydrateConversation = useCallback(
    async (sessionId: string) => {
      if (!token) return;
      setLoadingSessionId(sessionId);
      try {
        const session = await fetchChatSession(sessionId, token);
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
        console.error('Failed to load chat session', error);
        toast({
          title: 'Unable to load chat',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoadingSessionId((current) => (current === sessionId ? null : current));
      }
    },
    [mapSessionToConversation, toast, token],
  );

  const handleNewChat = () => {
    setActiveConversationId(null);
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setSidebarOpen(false);

    const existingConversation = conversations.find((c) => c.id === id);
    if (!existingConversation || existingConversation.messages.length === 0) {
      void hydrateConversation(id);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        loadingSessionId={loadingSessionId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onOpenDashboard={() => {
          setSidebarOpen(false);
          navigate('/dashboard');
        }}
        userEmail={user?.email}
        onLogout={() => {
          setSidebarOpen(false);
          logout();
          navigate('/login');
        }}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="pb-32">
            {sensitiveNotices.length > 0 && (
              <div className="px-4 pt-6">
                <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-amber-200/70 bg-amber-50/90 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-white/70 p-2 text-amber-600">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Sensitive prompt blocked</p>
                        <p className="text-xs text-amber-800">
                          Remove personal information from your last prompt before retrying.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sensitiveNotices.length > 1 && (
                        <button
                          type="button"
                          onClick={clearAllSensitiveNotices}
                          className="text-xs font-medium text-amber-800 underline-offset-4 hover:underline"
                        >
                          Dismiss all
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {sensitiveNotices.map((notice) => (
                      <div
                        key={notice.timestamp.getTime()}
                        className="rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-amber-900 shadow"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-medium">{notice.message}</p>
                            {notice.details?.action && (
                              <p className="text-xs text-amber-700">Action: {notice.details.action}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
                            Resolve the prompt below to continue.
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                            Blocked prompt
                          </p>
                          <div className="mt-1 rounded-xl bg-amber-100/60 p-3 font-mono text-xs leading-relaxed text-amber-900">
                            {notice.userMessage}
                          </div>
                        </div>

                        {notice.details?.findings?.length ? (
                          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                              Detected PII
                            </p>
                            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                              {notice.details.findings.map((finding, index) => (
                                <li
                                  key={`${finding.type ?? 'pii'}-${index}`}
                                  className="rounded-lg bg-white/80 p-2 text-xs"
                                >
                                  <p className="font-medium">{finding.label ?? finding.type ?? 'Unknown'}</p>
                                  <p className="text-amber-700">
                                    {finding.type ? finding.type : 'Pattern'}{' '}
                                    {typeof finding.riskScore === 'number' ? `· Score ${finding.riskScore}` : ''}
                                  </p>
                                  {finding.layer && (
                                    <p className="text-[11px] uppercase tracking-wide text-amber-500">
                                      {finding.layer}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] text-amber-700 sm:max-w-xs">
                            Only continue if you understand and accept the risk. Proceeding will be logged for compliance
                            review.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setChatInputValue(notice.userMessage);
                                setTimeout(() => chatInputRef.current?.focus(), 0);
                              }}
                              className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                            >
                              Edit prompt
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                dismissSensitiveNotice(notice.timestamp.getTime());
                                await handleSendMessage(notice.userMessage, {
                                  skipNotices: true,
                                  override: true,
                                });
                              }}
                              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-amber-700"
                            >
                              Proceed anyway
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!activeConversation || activeConversation.messages.length === 0 ? (
              <WelcomeScreen />
            ) : (
              <>
                {activeConversation.messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isTyping={
                      isTyping &&
                      message.role === 'assistant' &&
                      index === activeConversation.messages.length - 1
                    }
                  />
                ))}
                {isTyping && activeConversation.messages[activeConversation.messages.length - 1]?.role === 'user' && (
                  <div className="chat-message chat-message-assistant fade-in">
                    <div className="max-w-3xl mx-auto flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-foreground"
                        >
                          <path
                            d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4066-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6099-1.4997z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-6">
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
