/**
 * CAREHIVE global state (Zustand)
 */
import { create } from 'zustand';

export interface Intervention {
  id: string;
  userId: string;
  agentType: string;
  message: string;
  priority: string;
  createdAt: string;
  read?: boolean;
}

interface CarehiveState {
  userId: string | null;
  userName: string | null;
  setUser: (id: string, name: string | null) => void;
  /** When set, API calls use Bearer token and /user/me; otherwise demo user. */
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  /** True after AuthLoader finishes its initial session/demo resolution. */
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;
  interventions: Intervention[];
  addIntervention: (i: Intervention) => void;
  setInterventions: (i: Intervention[]) => void;
}

export const useStore = create<CarehiveState>((set) => ({
  userId: null,
  userName: null,
  setUser: (id, name) => set({ userId: id, userName: name }),
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  authReady: false,
  setAuthReady: (ready) => set({ authReady: ready }),
  interventions: [],
  addIntervention: (i) => set((s) => ({ interventions: [{ ...i, createdAt: i.createdAt || new Date().toISOString() }, ...s.interventions] })),
  setInterventions: (interventions) => set({ interventions }),
}));
