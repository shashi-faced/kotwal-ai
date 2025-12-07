import { API_URLS } from '@/lib/url';
import { handleUnauthorized } from '@/lib/session';
import { getStoredToken } from '@/lib/authStorage';

export interface ChatModel {
  id: string;
  name: string;
  provider: string;
}

interface ChatCompletionResponse {
  message?: string;
  response?: string;
  content?: string;
}

export const fetchChatResponse = async ({
  modelId,
  message,
  overridePII = '',
}: {
  modelId: string;
  message: string;
  overridePII?: string;
}): Promise<string> => {
  const token = getStoredToken();
  const response = await fetch(API_URLS.chat.send, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      modelId,
      message,
      overridePII,
    }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return '';
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || 'Failed to get chat response');
  }

  const data: ChatCompletionResponse = await response.json();
  const assistantMessage = data.message ?? data.response ?? data.content ?? '';

  if (!assistantMessage) {
    throw new Error('Chat API returned an empty response');
  }

  return assistantMessage;
};

export const fetchChatModels = async (): Promise<ChatModel[]> => {
  const token = getStoredToken();
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
