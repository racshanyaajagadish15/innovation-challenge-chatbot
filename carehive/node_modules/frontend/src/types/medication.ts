export type MedicationFrequency = 'once_daily' | 'twice_daily' | 'three_daily' | 'four_daily' | 'as_needed' | 'weekly';

export const FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_daily: 'Three times daily',
  four_daily: 'Four times daily',
  as_needed: 'As needed',
  weekly: 'Weekly',
};

export const FREQUENCY_SLOTS: Record<MedicationFrequency, string[]> = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_daily: ['08:00', '14:00', '20:00'],
  four_daily: ['08:00', '12:00', '16:00', '20:00'],
  as_needed: [],
  weekly: ['08:00'],
};

export type MedicationLogStatus = 'taken' | 'missed' | 'skipped';

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  timing: string[];
  instructions?: string;
  active: boolean;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  userId: string;
  status: MedicationLogStatus;
  scheduledTime: string;
  takenAt: string | null;
  createdAt: string;
}

export interface DailyScheduleItem {
  medication: Medication;
  time: string;
  log?: MedicationLog;
}
