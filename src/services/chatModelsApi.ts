/**
 * Chat-models admin API.
 * Backed by /api/chat-models (read) and /api/chat-models/admin/all (admin list).
 */
import { API_URLS } from '@/lib/url';
import { apiFetch, apiJson } from '@/lib/apiClient';

export interface ChatModelEntry {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended' | string;
  aiModelId?: string;
  tenantId?: string | null;
  AIModelMaster?: {
    id?: string;
    name?: string;
    provider?: string;
    configModel?: string;
    status?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatModelsAdminResponse {
  models: ChatModelEntry[];
  summary: { total: number; active: number; inactive: number; suspended: number };
}

export const fetchAdminChatModels = async (): Promise<ChatModelsAdminResponse> => {
  return apiJson<ChatModelsAdminResponse>(`${API_URLS.chat.models}/admin/all`, { method: 'GET' });
};

export const updateChatModelStatus = async (
  aiModelId: string,
  status: 'active' | 'inactive' | 'suspended',
): Promise<{ message: string; model: ChatModelEntry }> => {
  return apiJson(`${API_URLS.chat.models}/${aiModelId}/status`, {
    method: 'PATCH',
    body: { status },
  });
};

/**
 * Public/user-scope list (used by non-admin surfaces — same shape, fewer fields).
 */
export const fetchChatModelsList = async (): Promise<ChatModelEntry[]> => {
  const res = await apiFetch(API_URLS.chat.models, { method: 'GET' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error || 'Failed to load chat models');
  }
  const data = (await res.json()) as { models?: ChatModelEntry[] };
  return data.models ?? [];
};
