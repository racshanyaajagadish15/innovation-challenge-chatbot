/**
 * Validation schemas (can be used with zod if needed)
 * Lightweight schema definitions for API contracts
 */

export const CONDITION_OPTIONS = ['diabetes', 'hypertension', 'copd', 'heart_failure', 'other'] as const;

export const AGENT_TYPES = ['care', 'lifestyle', 'emotional', 'clinician'] as const;

export interface CreateHealthLogInput {
  userId: string;
  medicationTaken: boolean;
  steps: number;
  mood: number;
  notes?: string;
}

export interface CreateUserInput {
  name: string;
  age: number;
  condition: string;
}
