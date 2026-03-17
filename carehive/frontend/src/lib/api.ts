/**
 * CAREHIVE API client.
 * When accessToken is set in store, requests include Authorization: Bearer for real user data.
 */
import { useStore } from '@/store/useStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useStore.getState().accessToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<T>;
}

export interface UserMe {
  id: string;
  name: string;
  age: number;
  condition: string;
  email?: string;
  createdAt?: string;
}

export const api = {
  getDemoUser: () => fetchApi<UserMe>('/user/demo'),
  getMe: () => fetchApi<UserMe>('/user/me'),
  updateProfile: (body: { name: string; age: number; condition: string }) =>
    fetchApi<UserMe>('/user/profile', { method: 'POST', body: JSON.stringify(body) }),
  logHealth: (body: { userId?: string; medicationTaken: boolean; steps: number; mood: number; notes?: string }) =>
    fetchApi<{ id: string }>('/health/log', { method: 'POST', body: JSON.stringify(body) }),
  getHistory: (userId: string, limit = 30) =>
    fetchApi<Array<{ id: string; medicationTaken: boolean; steps: number; mood: number; timestamp: string }>>(
      `/health/history?userId=${encodeURIComponent(userId)}&limit=${limit}`
    ),
  getInsights: (userId: string) =>
    fetchApi<{ insights: Array<{ type: string; title: string; description: string; severity: string; agentSource?: string }> }>(
      `/insights?userId=${encodeURIComponent(userId)}`
    ),
  runOrchestrator: (userId: string) =>
    fetchApi<{ summary: string; interventionsCreated: number }>(`/insights/orchestrate?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
    }),
  getClinicianSummary: (userId: string) =>
    fetchApi<{
      userName: string;
      condition: string;
      periodStart: string;
      periodEnd: string;
      adherenceRate: number;
      riskFlags: string[];
      trends: string[];
      agentHighlights: string[];
      generatedAt: string;
    }>(`/clinician/summary?userId=${encodeURIComponent(userId)}`),
  getAgentActivity: (userId: string) =>
    fetchApi<{ activity: Array<{ agentType: string; message: string; priority: string; timestamp: string }> }>(
      `/agents/activity?userId=${encodeURIComponent(userId)}`
    ),
  chat: (message: string, userId?: string) =>
    fetchApi<{ reply: string }>('/chat', { method: 'POST', body: JSON.stringify({ message, userId }) }),
  visionAnalyze: (body: { image: string; mimeType?: string }) =>
    fetchApi<{ analysis: { mood: number; posture: string; summary?: string }; healthLog?: unknown }>('/vision/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
