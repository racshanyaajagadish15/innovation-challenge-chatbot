'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthGate } from '@/components/AuthGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

type Parsed = {
  summary?: string;
  diagnoses?: string[];
  allergies?: string[];
  vaccinations?: string[];
  symptoms?: string[];
  medications?: Array<{ name: string; dosage?: string; instructions?: string }>;
  suggestedActions?: any[];
};

function normalizeTime(input: string): string | null {
  const s = String(input || '').trim();
  if (!s) return null;

  // Accept HH:MM or HH:MM:SS (24h)
  const m24 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m24) {
    const hh = parseInt(m24[1], 10);
    const mm = parseInt(m24[2], 10);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }

  // Accept "9am", "9 am", "9:30pm", "9:30 PM"
  const m12 = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(s.replace(/\./g, '').replace(/\s+/g, ' '));
  if (m12) {
    let hh = parseInt(m12[1], 10);
    const mm = parseInt(m12[2] ?? '0', 10);
    const ap = m12[3].toLowerCase();
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
    if (ap === 'pm' && hh !== 12) hh += 12;
    if (ap === 'am' && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  return null;
}

export default function EhrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { summary: string | null; parsed: Parsed; llmProvider?: string; extractionSource?: string }>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [uploads, setUploads] = useState<Array<{ id: string; filename: string; summary: string | null; createdAt: string }>>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  const refreshUploads = () => {
    setLoadingUploads(true);
    api
      .listEhrs(20)
      .then((list) => {
        setUploads(list.map((e) => ({ id: e.id, filename: e.filename, summary: e.summary, createdAt: e.createdAt })));
      })
      .catch(() => {
        // ignore
      })
      .finally(() => setLoadingUploads(false));
  };

  useEffect(() => {
    refreshUploads();
  }, []);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setApplied(false);
    setUploading(true);
    try {
      const r = await api.uploadEhr(file);
      setResult({
        summary: r.summary,
        parsed: (r.parsed || {}) as Parsed,
        extractionSource: (r as any).extractionSource,
        llmProvider: (r as any).llmProvider,
      });
      refreshUploads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function applyMedicationsAndReminders() {
    if (!result?.parsed) return;
    const meds = result.parsed.medications || [];
    const suggested = result.parsed.suggestedActions?.find((a: any) => a?.type === 'add_reminders');
    const rawTimes: any = suggested?.defaultTimes ?? ['09:00', '21:00'];
    const list: string[] = Array.isArray(rawTimes)
      ? rawTimes.map((t) => (typeof t === 'string' ? t : typeof t?.time === 'string' ? t.time : String(t)))
      : typeof rawTimes === 'string'
        ? rawTimes.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const normalizedTimes = list
      .map((t) => normalizeTime(t))
      .filter((t): t is string => Boolean(t));
    if (meds.length === 0) {
      setError('No medications detected in this EHR.');
      return;
    }
    const timesToUse = normalizedTimes.length > 0 ? normalizedTimes : ['09:00', '21:00'];
    setError(null);
    setApplying(true);
    try {
      for (const m of meds) {
        const created = await api.addMedication({ name: m.name, dosage: m.dosage, instructions: m.instructions });
        const medId = (created as any).id as string;
        for (const t of timesToUse) {
          await api.addReminder(medId, { timeOfDay: t, enabled: true });
        }
      }
      setApplied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-3xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">EHR import (HealthHub simulation)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Upload an EHR PDF. CAREHIVE will summarise it and suggest baseline data to add (medications, reminders, diagnoses).
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Upload PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-950/30 dark:file:text-teal-200"
            />
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? 'Uploading…' : 'Upload & summarise'}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Uploaded EHRs</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUploads ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : uploads.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No uploads yet.</p>
            ) : (
              <div className="space-y-3">
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{u.filename}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(u.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {u.summary && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{u.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">Summary</CardTitle>
                  <span className="text-xs px-2 py-1 rounded-full border border-cyan-200/40 bg-cyan-50/10 text-cyan-200">
                    {result.extractionSource === 'ai' ? `AI extracted (${result.llmProvider || 'provider'})` : 'Not AI'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {result.summary || result.parsed.summary || 'No summary available.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MiniList title="Diagnoses" items={result.parsed.diagnoses || []} />
                  <MiniList title="Medications detected" items={(result.parsed.medications || []).map((m) => m.name)} />
                  <MiniList title="Allergies" items={result.parsed.allergies || []} />
                  <MiniList title="Vaccinations" items={result.parsed.vaccinations || []} />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Button onClick={applyMedicationsAndReminders} disabled={applying || applied}>
                    {applied ? 'Applied to medications' : applying ? 'Applying…' : 'Add meds + reminders'}
                  </Button>
                  <Button variant="secondary" onClick={() => (window.location.href = '/medications')}>
                    Review medications
                  </Button>
                  <Button variant="secondary" onClick={() => (window.location.href = '/log')}>
                    Go to daily log
                  </Button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This is a simulation of HealthHub integration: we extract from your uploaded document and let you confirm/add baseline data.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </AuthGate>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 p-4">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">None detected</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.slice(0, 8).map((it) => (
            <li key={it} className="text-sm text-slate-600 dark:text-slate-300">
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

