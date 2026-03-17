/**
 * CAREHIVE Shared Types
 * Used by both frontend and backend for type safety
 */

export type Condition = 'diabetes' | 'hypertension' | 'copd' | 'heart_failure' | 'other';

export type AgentType = 'care' | 'lifestyle' | 'emotional' | 'clinician';

export interface User {
  id: string;
  name: string;
  age: number;
  condition: Condition;
  email?: string;
  createdAt?: string;
}

export interface HealthLog {
  id: string;
  userId: string;
  medicationTaken: boolean;
  steps: number;
  mood: number; // 1-10 scale
  notes?: string;
  timestamp: string;
  source?: 'manual' | 'vision';
}

export interface Intervention {
  id: string;
  userId: string;
  agentType: AgentType;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  read?: boolean;
}

export interface AgentActivity {
  agentType: AgentType;
  action: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface AgentOutput {
  agentType: AgentType;
  analysis: Record<string, unknown>;
  decision: string;
  actions: Array<{ type: string; payload: unknown }>;
  message?: string;
}

export interface OrchestratorResult {
  interventions: Intervention[];
  agentOutputs: AgentOutput[];
  summary: string;
}

export interface ClinicianSummary {
  userId: string;
  periodStart: string;
  periodEnd: string;
  adherenceRate: number;
  riskFlags: string[];
  trends: string[];
  agentHighlights: string[];
  generatedAt: string;
}

export interface HealthInsight {
  type: 'adherence' | 'lifestyle' | 'mood' | 'risk';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  agentSource?: AgentType;
}
