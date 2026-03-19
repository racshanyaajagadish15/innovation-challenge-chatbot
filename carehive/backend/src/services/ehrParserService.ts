/**
 * EHR Parser Service
 * Currently a mock/rule-based parser. Designed for easy swap to NLP/LLM integration.
 *
 * Interface contract: parseEhrText(rawText) → EhrParsedData
 */

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

export interface EhrParsedData {
  diagnoses: EhrDiagnosis[];
  medications: EhrMedication[];
  instructions: string[];
  vitals?: EhrVitals;
  summary: string;
}

const KNOWN_CONDITIONS: Record<string, string> = {
  diabetes: 'E11',
  'type 2 diabetes': 'E11.9',
  hypertension: 'I10',
  'high blood pressure': 'I10',
  copd: 'J44.1',
  asthma: 'J45',
  'heart failure': 'I50',
  depression: 'F32',
  anxiety: 'F41',
  'chronic kidney disease': 'N18',
  hyperlipidemia: 'E78.5',
};

const KNOWN_MEDICATIONS: Record<string, { dosage: string; frequency: string }> = {
  metformin: { dosage: '500mg', frequency: 'twice daily' },
  lisinopril: { dosage: '10mg', frequency: 'once daily' },
  amlodipine: { dosage: '5mg', frequency: 'once daily' },
  atorvastatin: { dosage: '20mg', frequency: 'once daily' },
  omeprazole: { dosage: '20mg', frequency: 'once daily' },
  aspirin: { dosage: '100mg', frequency: 'once daily' },
  insulin: { dosage: '10 units', frequency: 'twice daily' },
  losartan: { dosage: '50mg', frequency: 'once daily' },
  simvastatin: { dosage: '40mg', frequency: 'once daily at night' },
  paracetamol: { dosage: '500mg', frequency: 'as needed' },
};

export function parseEhrText(rawText: string): EhrParsedData {
  const text = rawText.toLowerCase();
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  const diagnoses = extractDiagnoses(text);
  const medications = extractMedications(text, lines);
  const vitals = extractVitals(text);
  const instructions = extractInstructions(lines);

  const diagNames = diagnoses.map((d) => d.name).join(', ') || 'none identified';
  const medNames = medications.map((m) => m.name).join(', ') || 'none identified';
  const summary = `Parsed ${lines.length} lines. Diagnoses: ${diagNames}. Medications: ${medNames}. ${instructions.length} instruction(s) found.`;

  return { diagnoses, medications, instructions, vitals, summary };
}

function extractDiagnoses(text: string): EhrDiagnosis[] {
  const found: EhrDiagnosis[] = [];
  for (const [condition, code] of Object.entries(KNOWN_CONDITIONS)) {
    if (text.includes(condition)) {
      let severity: 'mild' | 'moderate' | 'severe' | undefined;
      const idx = text.indexOf(condition);
      const context = text.slice(Math.max(0, idx - 30), idx + condition.length + 30);
      if (context.includes('severe') || context.includes('uncontrolled')) severity = 'severe';
      else if (context.includes('moderate')) severity = 'moderate';
      else if (context.includes('mild') || context.includes('controlled')) severity = 'mild';

      found.push({ name: capitalize(condition), code, severity });
    }
  }
  return found;
}

function extractMedications(text: string, lines: string[]): EhrMedication[] {
  const found: EhrMedication[] = [];
  for (const [med, defaults] of Object.entries(KNOWN_MEDICATIONS)) {
    if (text.includes(med)) {
      const medLine = lines.find((l) => l.toLowerCase().includes(med));
      let dosage = defaults.dosage;
      let frequency = defaults.frequency;
      let instructions: string | undefined;

      if (medLine) {
        const dosageMatch = medLine.match(/(\d+\s*(?:mg|mcg|units?|ml|g))/i);
        if (dosageMatch) dosage = dosageMatch[1];

        if (/twice|bid|2x/i.test(medLine)) frequency = 'twice daily';
        else if (/three|tid|3x/i.test(medLine)) frequency = 'three times daily';
        else if (/once|od|qd|daily/i.test(medLine)) frequency = 'once daily';
        else if (/as needed|prn/i.test(medLine)) frequency = 'as needed';

        const afterMed = medLine.substring(medLine.toLowerCase().indexOf(med) + med.length);
        if (afterMed.includes('-')) {
          instructions = afterMed.split('-').slice(1).join('-').trim();
        }
      }

      found.push({ name: capitalize(med), dosage, frequency, instructions });
    }
  }
  return found;
}

function extractVitals(text: string): EhrVitals | undefined {
  const vitals: EhrVitals = {};
  let found = false;

  const bpMatch = text.match(/(?:bp|blood pressure)[:\s]*(\d{2,3}\/\d{2,3})/i);
  if (bpMatch) { vitals.bloodPressure = bpMatch[1]; found = true; }

  const hrMatch = text.match(/(?:hr|heart rate|pulse)[:\s]*(\d{2,3})\s*(?:bpm)?/i);
  if (hrMatch) { vitals.heartRate = parseInt(hrMatch[1]); found = true; }

  const tempMatch = text.match(/(?:temp|temperature)[:\s]*([\d.]+)\s*(?:°?[cf])?/i);
  if (tempMatch) { vitals.temperature = parseFloat(tempMatch[1]); found = true; }

  const weightMatch = text.match(/(?:weight|wt)[:\s]*([\d.]+)\s*(?:kg)?/i);
  if (weightMatch) { vitals.weight = parseFloat(weightMatch[1]); found = true; }

  return found ? vitals : undefined;
}

function extractInstructions(lines: string[]): string[] {
  const keywords = ['follow up', 'review', 'monitor', 'avoid', 'diet', 'exercise', 'refer', 'schedule', 'appointment', 'lifestyle'];
  return lines.filter((line) => {
    const lower = line.toLowerCase();
    return keywords.some((kw) => lower.includes(kw)) && line.length > 15;
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
