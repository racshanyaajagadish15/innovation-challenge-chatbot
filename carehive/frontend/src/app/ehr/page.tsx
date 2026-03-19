'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { AuthGate } from '@/components/AuthGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { SkeletonList } from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import type { EhrRecord, EhrParsedData } from '@/types/ehr';

export default function EhrPage() {
  return (
    <AuthGate>
      <EhrInner />
    </AuthGate>
  );
}

function EhrInner() {
  const { userId, userRole, viewingPatientId, viewingPatientName } = useStore();
  const [records, setRecords] = useState<EhrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<EhrRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMultiPatientRole = userRole === 'clinician' || userRole === 'family';
  const targetPatientId = isMultiPatientRole ? viewingPatientId : undefined;

  async function loadRecords() {
    if (isMultiPatientRole && !viewingPatientId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getEhrRecords(targetPatientId ?? undefined);
      setRecords(res?.records ?? []);
    } catch (e) {
      console.warn('Failed to load EHR records:', e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [viewingPatientId]);

  async function handleUpload(fileName: string, rawText: string) {
    const record = await api.uploadEhr({
      fileName,
      rawText,
      patientId: targetPatientId ?? undefined,
    });
    setRecords((prev) => [record, ...prev]);
    setSelectedRecord(record);
  }

  async function handleConvertToMeds(ehrRecordId: string) {
    try {
      const res = await api.convertEhrToMedications(ehrRecordId);
      return res.created;
    } catch (e) {
      throw e;
    }
  }

  if (isMultiPatientRole && !viewingPatientId) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-5xl mx-auto">
        <EmptyState
          title="No patient selected"
          description="Use the sidebar to add and select a patient to view their EHR records."
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 md:p-8 max-w-5xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">EHR Records</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {isMultiPatientRole
            ? `EHR records for ${viewingPatientName || 'selected patient'}`
            : 'View your electronic health records and extracted data'}
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-l-4 border-l-amber-500">
          <CardContent className="py-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs
        tabs={[
          {
            id: 'upload',
            label: 'Upload EHR',
            content: <EhrUploader onUpload={handleUpload} />,
          },
          {
            id: 'records',
            label: `Records (${records.length})`,
            content: loading ? (
              <SkeletonList count={3} />
            ) : (
              <EhrRecordsList
                records={records}
                selectedId={selectedRecord?.id || null}
                onSelect={setSelectedRecord}
              />
            ),
          },
          ...(selectedRecord?.parsedData
            ? [
                {
                  id: 'results',
                  label: 'Parsed Results',
                  content: (
                    <EhrResults
                      record={selectedRecord}
                      onConvertToMeds={handleConvertToMeds}
                    />
                  ),
                },
              ]
            : []),
        ]}
        defaultTab={selectedRecord?.parsedData ? 'results' : 'upload'}
      />
    </motion.div>
  );
}

/* ---------- EHR Uploader ---------- */

function EhrUploader({ onUpload }: { onUpload: (fileName: string, rawText: string) => Promise<void> }) {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setRawText(text);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Please enter or upload EHR text');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(false);
    try {
      await onUpload(fileName || 'manual-entry.txt', rawText);
      setSuccess(true);
      setRawText('');
      setFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function loadSampleEhr() {
    setFileName('sample-ehr.txt');
    setRawText(SAMPLE_EHR);
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
          EHR uploaded and parsed successfully. Check the &quot;Parsed Results&quot; tab.
        </p>
      )}

      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Upload EHR Document</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Upload a text file or paste the EHR content below
              </p>
            </div>
            <div className="flex gap-3">
              <label className="cursor-pointer">
                <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Choose File
                </span>
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={loadSampleEhr}>
                Use Sample EHR
              </Button>
            </div>
            {fileName && (
              <Badge variant="info" size="md">{fileName}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          EHR Text Content
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          placeholder="Paste EHR text content here, or upload a file above..."
          className={`${inputClass} font-mono text-xs leading-relaxed`}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={uploading || !rawText.trim()}>
          {uploading ? 'Processing...' : 'Upload & Parse'}
        </Button>
      </div>
    </form>
  );
}

/* ---------- EHR Records List ---------- */

function EhrRecordsList({
  records,
  selectedId,
  onSelect,
}: {
  records: EhrRecord[];
  selectedId: string | null;
  onSelect: (r: EhrRecord) => void;
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        title="No EHR records"
        description="Upload an EHR document to get started."
        icon={
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <Card
          key={record.id}
          hover
          className={`cursor-pointer transition-all ${
            selectedId === record.id ? 'ring-2 ring-teal-500 border-teal-500' : ''
          }`}
        >
          <CardContent
            className="py-4 flex items-center justify-between gap-4"
            onClick={() => onSelect(record)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{record.fileName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {new Date(record.createdAt).toLocaleDateString()} at{' '}
                {new Date(record.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {record.parsedData && (
                <>
                  <Badge variant="info" size="sm">
                    {record.parsedData.diagnoses.length} diagnos{record.parsedData.diagnoses.length !== 1 ? 'es' : 'is'}
                  </Badge>
                  <Badge variant="success" size="sm">
                    {record.parsedData.medications.length} med{record.parsedData.medications.length !== 1 ? 's' : ''}
                  </Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------- EHR Results ---------- */

function EhrResults({
  record,
  onConvertToMeds,
}: {
  record: EhrRecord;
  onConvertToMeds: (id: string) => Promise<number>;
}) {
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<string | null>(null);

  const parsed = record.parsedData as EhrParsedData | null;
  if (!parsed) return null;

  async function handleConvert() {
    setConverting(true);
    try {
      const count = await onConvertToMeds(record.id);
      setConvertResult(`${count} medication${count !== 1 ? 's' : ''} added to your tracking list.`);
    } catch (e) {
      setConvertResult(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-300">{parsed.summary}</p>
        </CardContent>
      </Card>

      {/* Diagnoses */}
      {parsed.diagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Diagnoses</CardTitle>
              <Badge variant="info">{parsed.diagnoses.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parsed.diagnoses.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{d.name}</p>
                    {d.code && <p className="text-xs text-slate-400">ICD: {d.code}</p>}
                  </div>
                  {d.severity && (
                    <Badge
                      variant={d.severity === 'severe' ? 'danger' : d.severity === 'moderate' ? 'warning' : 'success'}
                      size="sm"
                    >
                      {d.severity}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      {parsed.medications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Medications</CardTitle>
                <Badge variant="success">{parsed.medications.length}</Badge>
              </div>
              <Button size="sm" onClick={handleConvert} disabled={converting}>
                {converting ? 'Adding...' : 'Add to My Medications'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {convertResult && (
              <p className="text-sm text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 rounded-lg px-3 py-2 mb-3">
                {convertResult}
              </p>
            )}
            <div className="space-y-3">
              {parsed.medications.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {m.dosage} — {m.frequency}
                    </p>
                    {m.instructions && (
                      <p className="text-xs text-slate-400 mt-0.5">{m.instructions}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vitals */}
      {parsed.vitals && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {parsed.vitals.bloodPressure && (
                <VitalItem label="Blood Pressure" value={parsed.vitals.bloodPressure} unit="mmHg" />
              )}
              {parsed.vitals.heartRate && (
                <VitalItem label="Heart Rate" value={String(parsed.vitals.heartRate)} unit="bpm" />
              )}
              {parsed.vitals.temperature && (
                <VitalItem label="Temperature" value={String(parsed.vitals.temperature)} unit="°C" />
              )}
              {parsed.vitals.weight && (
                <VitalItem label="Weight" value={String(parsed.vitals.weight)} unit="kg" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {parsed.instructions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {parsed.instructions.map((inst, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                  {inst}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VitalItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-400">{unit}</p>
    </div>
  );
}

/* ---------- Sample EHR ---------- */

const SAMPLE_EHR = `PATIENT CLINICAL SUMMARY
Date: 2025-12-15
Patient: John Doe, Age 62

DIAGNOSES:
- Type 2 Diabetes (moderate, E11.9)
- Hypertension (controlled)
- Hyperlipidemia

VITALS:
BP: 138/82 mmHg
HR: 76 bpm
Temperature: 36.8°C
Weight: 78 kg

CURRENT MEDICATIONS:
1. Metformin 500mg - twice daily - take with meals
2. Lisinopril 10mg - once daily - morning
3. Atorvastatin 20mg - once daily - at night
4. Aspirin 100mg - once daily - morning with food

INSTRUCTIONS:
- Follow up in 3 months for HbA1c review
- Monitor blood glucose daily, target fasting < 7.0 mmol/L
- Exercise at least 150 minutes per week
- Diet: reduce refined carbohydrates, increase fiber intake
- Schedule eye examination within 6 months
- Review medications at next appointment`;
