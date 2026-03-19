export interface EhrRecord {
  id: string;
  userId: string;
  uploadedBy: string;
  fileName: string;
  rawText: string;
  parsedData: EhrParsedData | null;
  createdAt: string;
}

export interface EhrParsedData {
  diagnoses: EhrDiagnosis[];
  medications: EhrMedication[];
  instructions: string[];
  vitals?: EhrVitals;
  summary: string;
}

export interface EhrDiagnosis {
  name: string;
  code?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  date?: string;
}

export interface EhrMedication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

export interface EhrVitals {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}
