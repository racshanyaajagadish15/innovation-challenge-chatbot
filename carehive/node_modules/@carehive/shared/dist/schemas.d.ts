/**
 * Validation schemas (can be used with zod if needed)
 * Lightweight schema definitions for API contracts
 */
export declare const CONDITION_OPTIONS: readonly ["diabetes", "hypertension", "copd", "heart_failure", "other"];
export declare const AGENT_TYPES: readonly ["care", "lifestyle", "emotional", "clinician"];
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
