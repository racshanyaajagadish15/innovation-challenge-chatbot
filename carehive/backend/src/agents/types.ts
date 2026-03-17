/**
 * Agent contract - all agents implement this interface
 */
import type { AgentType } from '@carehive/shared';

export interface AgentContext {
  userId: string;
  healthLogs: Array<{
    medicationTaken: boolean;
    steps: number;
    mood: number;
    timestamp: Date;
    notes?: string | null;
  }>;
  recentInterventions: Array<{ agentType: string; message: string }>;
}

export interface AgentOutput {
  agentType: AgentType;
  analysis: Record<string, unknown>;
  decision: string;
  actions: Array< { type: string; payload: unknown }>;
  message?: string;
}

export interface IAgent {
  readonly type: AgentType;
  analyze(context: AgentContext): Promise<Record<string, unknown>>;
  decide(context: AgentContext, analysis: Record<string, unknown>): Promise<string>;
  act(context: AgentContext, analysis: Record<string, unknown>, decision: string): Promise<AgentOutput>;
}
