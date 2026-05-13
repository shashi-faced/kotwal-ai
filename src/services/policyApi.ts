/**
 * Policy admin API service.
 *
 *   GET    /api/policy           → effective policy + tenant overrides
 *   PUT    /api/policy           → replace tenant policyConfig
 *   PATCH  /api/policy           → merge partial overrides
 *   GET    /api/policy/defaults  → DEFAULT_POLICY + preset names
 */
import { API_URLS } from '@/lib/url';
import { apiJson } from '@/lib/apiClient';

export type DetectionAction = 'ALLOW' | 'WARN' | 'REDACT' | 'BLOCK';
export type RedactionStrategy = 'TOKEN' | 'MASK' | 'HASH' | 'FAKE';

export interface PolicyDocument {
  version?: number;
  jurisdiction?: string;
  preset?: string | null;
  enabledCategories?: string[];
  severity?: Record<string, number>;
  thresholds?: { warn?: number; block?: number };
  criticalConfidenceFloor?: number;
  quasiIdBonus?: number;
  categoryAction?: Record<string, DetectionAction>;
  redactionStrategy?: Record<string, RedactionStrategy>;
  allowOverride?: boolean;
  requireOverrideReason?: boolean;
  overrideMinRole?: string;
  customRecognizers?: unknown[];
  allowlist?: string[];
  subtypeOverrides?: Record<string, { confidence?: number; severity?: number; action?: DetectionAction }>;
  maxPromptChars?: number;
}

export interface PolicyResponse {
  policyConfig: PolicyDocument | null;
  effective: PolicyDocument;
}

export interface PolicyDefaultsResponse {
  default: PolicyDocument;
  presets: string[];
}

export const fetchPolicy = (): Promise<PolicyResponse> =>
  apiJson<PolicyResponse>(API_URLS.policy.base, { method: 'GET' });

export const fetchPolicyDefaults = (): Promise<PolicyDefaultsResponse> =>
  apiJson<PolicyDefaultsResponse>(API_URLS.policy.defaults, { method: 'GET' });

export const replacePolicy = (config: PolicyDocument): Promise<{ success: boolean; effective: PolicyDocument }> =>
  apiJson(API_URLS.policy.base, { method: 'PUT', body: config });

export const patchPolicy = (partial: Partial<PolicyDocument>): Promise<{ success: boolean; effective: PolicyDocument }> =>
  apiJson(API_URLS.policy.base, { method: 'PATCH', body: partial });
