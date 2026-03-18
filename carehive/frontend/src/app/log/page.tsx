'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { AuthGate } from '@/components/AuthGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

export default function LogPage() {
  const { userId } = useStore();
  const [sleepHours, setSleepHours] = useState<string>('');
  const [steps, setSteps] = useState<string>('0');
  const [mood, setMood] = useState<string>('5');
  const [medications, setMedications] = useState<Array<{ id: string; name: string; dosage?: string; instructions?: string }>>([]);
  const [takenMap, setTakenMap] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [walkStart, setWalkStart] = useState<string>('');
  const [walkEnd, setWalkEnd] = useState<string>('');
  const [walkDistanceKm, setWalkDistanceKm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMedications()
      .then((meds) => {
        setMedications(meds.map((m) => ({ id: m.id, name: m.name, dosage: m.dosage, instructions: m.instructions })));
        setTakenMap((prev) => {
          const next = { ...prev };
          meds.forEach((m) => {
            if (next[m.id] === undefined) next[m.id] = false;
          });
          return next;
        });
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const medicationTaken = useMemo(() => {
    if (medications.length === 0) return true;
    return medications.every((m) => Boolean(takenMap[m.id]));
  }, [medications, takenMap]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      // Log medication intakes (separate tracking)
      const intakes = medications
        .filter((m) => takenMap[m.id])
        .map((m) => ({ medicationId: m.id, taken: true }));
      if (intakes.length > 0) {
        await api.logMedicationIntakes({ intakes });
      }

      // Log walking session (optional)
      if (walkStart && walkEnd) {
        const dist = walkDistanceKm !== '' ? Math.max(0, Number(walkDistanceKm)) : undefined;
        await api.logActivitySession({
          type: 'walk',
          startTime: new Date(walkStart).toISOString(),
          endTime: new Date(walkEnd).toISOString(),
          distanceKm: dist,
          notes: notes.trim() || undefined,
        });
      }

      await api.logHealth({
        medicationTaken,
        steps: Math.max(0, parseInt(steps, 10) || 0),
        mood: Math.min(10, Math.max(1, parseInt(mood, 10) || 5)),
        notes: notes.trim() || undefined,
        sleepHours: sleepHours !== '' ? Math.max(0, Math.min(24, parseFloat(sleepHours) || 0)) : undefined,
      });
      setSuccess(true);
      setSleepHours('');
      setSteps('0');
      setMood('5');
      setNotes('');
      setWalkStart('');
      setWalkEnd('');
      setWalkDistanceKm('');
      setTakenMap((prev) => {
        const next = { ...prev };
        medications.forEach((m) => (next[m.id] = false));
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-2xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Health log</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Log your sleep, activity, steps, and mood for the day.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log today</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg px-3 py-2">
                  Log saved.
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Medications
                </label>
                {medications.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No saved medications yet. Add them in <span className="font-medium">Medications</span>.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {medications.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(takenMap[m.id])}
                          onChange={(e) => setTakenMap((prev) => ({ ...prev, [m.id]: e.target.checked }))}
                          className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</span>
                          {(m.dosage || m.instructions) && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {[m.dosage, m.instructions].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sleep (hours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    placeholder="e.g. 7.5"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Walk distance (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={walkDistanceKm}
                    onChange={(e) => setWalkDistanceKm(e.target.value)}
                    placeholder="e.g. 2.4"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Walk start
                  </label>
                  <input
                    type="datetime-local"
                    value={walkStart}
                    onChange={(e) => setWalkStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Walk end
                  </label>
                  <input
                    type="datetime-local"
                    value={walkEnd}
                    onChange={(e) => setWalkEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Steps
                </label>
                <input
                  type="number"
                  min={0}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mood (1–10)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full h-2 rounded-lg appearance-none bg-slate-200 dark:bg-slate-700 accent-teal-500"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{mood}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Saving…' : 'Save log'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </AuthGate>
  );
}
