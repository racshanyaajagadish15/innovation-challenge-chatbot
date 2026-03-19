'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { AuthGate } from '@/components/AuthGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { SkeletonList } from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import type { Medication, MedicationFrequency, DailyScheduleItem } from '@/types/medication';
import { FREQUENCY_LABELS, FREQUENCY_SLOTS } from '@/types/medication';

export default function MedicationsPage() {
  return (
    <AuthGate>
      <MedicationsInner />
    </AuthGate>
  );
}

function MedicationsInner() {
  const { medications, setMedications, addMedication, removeMedication } = useStore();
  const [schedule, setSchedule] = useState<DailyScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDate, setScheduleDate] = useState(todayStr());
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [medsRes, schedRes] = await Promise.allSettled([
        api.getMedications(),
        api.getDailySchedule(scheduleDate),
      ]);
      if (medsRes.status === 'fulfilled') {
        setMedications(medsRes.value?.medications ?? []);
      } else {
        console.warn('Failed to load medications:', medsRes.reason);
      }
      if (schedRes.status === 'fulfilled') {
        setSchedule(schedRes.value?.schedule ?? []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [scheduleDate, setMedications]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAdd(data: MedicationFormData) {
    try {
      const med = await api.addMedication(data);
      addMedication(med);
      setShowAdd(false);
      loadData();
    } catch (e) {
      throw e;
    }
  }

  async function handleDeactivate(id: string) {
    await api.deleteMedication(id);
    removeMedication(id);
    loadData();
  }

  async function handleLogDose(medicationId: string, scheduledTime: string, status: 'taken' | 'missed' | 'skipped') {
    await api.logMedicationDose({ medicationId, status, scheduledTime });
    loadData();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 md:p-8 max-w-4xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Medications</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track your medications, dosages, and daily schedule
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>Add Medication</Button>
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
            id: 'schedule',
            label: 'Daily Schedule',
            content: loading ? (
              <SkeletonList count={4} />
            ) : (
              <DailyScheduleView
                schedule={schedule}
                date={scheduleDate}
                onDateChange={setScheduleDate}
                onLog={handleLogDose}
              />
            ),
          },
          {
            id: 'all',
            label: `All Medications (${(medications ?? []).length})`,
            content: loading ? (
              <SkeletonList count={3} />
            ) : (
              <MedicationList medications={medications} onDeactivate={handleDeactivate} />
            ),
          },
        ]}
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Medication">
        <MedicationForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
      </Modal>
    </motion.div>
  );
}

/* ---------- Daily Schedule View ---------- */

function DailyScheduleView({
  schedule,
  date,
  onDateChange,
  onLog,
}: {
  schedule: DailyScheduleItem[];
  date: string;
  onDateChange: (d: string) => void;
  onLog: (medId: string, scheduledTime: string, status: 'taken' | 'missed' | 'skipped') => void;
}) {
  if (schedule.length === 0) {
    return (
      <EmptyState
        title="No medications scheduled"
        description="Add medications to see your daily schedule here."
        icon={
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  const timeGroups = groupByTime(schedule);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onDateChange(offsetDate(date, -1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
        />
        <button
          onClick={() => onDateChange(offsetDate(date, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        {date !== todayStr() && (
          <button
            onClick={() => onDateChange(todayStr())}
            className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline"
          >
            Today
          </button>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(timeGroups).map(([time, items]) => (
          <div key={time}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{formatTime(time)}</span>
              <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <ScheduleItemCard key={`${item.medication.id}-${time}`} item={item} onLog={onLog} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleItemCard({
  item,
  onLog,
}: {
  item: DailyScheduleItem;
  onLog: (medId: string, scheduledTime: string, status: 'taken' | 'missed' | 'skipped') => void;
}) {
  const [logging, setLogging] = useState(false);
  const logged = item.log?.status;
  const scheduledTime = `${todayStr()}T${item.time}:00`;

  async function handleLog(status: 'taken' | 'missed' | 'skipped') {
    setLogging(true);
    try {
      await onLog(item.medication.id, scheduledTime, status);
    } finally {
      setLogging(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="py-3 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
              {item.medication.name}
            </p>
            <Badge variant="outline" size="sm">{item.medication.dosage}</Badge>
          </div>
          {item.medication.instructions && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {item.medication.instructions}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {logged ? (
            <Badge
              variant={logged === 'taken' ? 'success' : logged === 'missed' ? 'danger' : 'warning'}
              dot
            >
              {logged === 'taken' ? 'Taken' : logged === 'missed' ? 'Missed' : 'Skipped'}
            </Badge>
          ) : (
            <>
              <Button size="sm" onClick={() => handleLog('taken')} disabled={logging}>
                Take
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleLog('skipped')} disabled={logging}>
                Skip
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Medication List ---------- */

function MedicationList({
  medications,
  onDeactivate,
}: {
  medications: Medication[];
  onDeactivate: (id: string) => void;
}) {
  const meds = medications ?? [];
  if (meds.length === 0) {
    return (
      <EmptyState
        title="No medications"
        description="Add your first medication to start tracking."
      />
    );
  }

  return (
    <div className="space-y-3">
      {meds.map((med) => (
        <Card key={med.id}>
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-medium text-slate-800 dark:text-slate-100">{med.name}</h3>
                <Badge variant="info" size="sm">{med.dosage}</Badge>
                <Badge variant="default" size="sm">{FREQUENCY_LABELS[med.frequency] || med.frequency}</Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Schedule: {med.timing.map(formatTime).join(', ')}
              </p>
              {med.instructions && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{med.instructions}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeactivate(med.id)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Remove
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------- Medication Form ---------- */

interface MedicationFormData {
  name: string;
  dosage: string;
  frequency: string;
  timing: string[];
  instructions?: string;
}

function MedicationForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: MedicationFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('once_daily');
  const [timing, setTiming] = useState<string[]>(['08:00']);
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTiming(FREQUENCY_SLOTS[frequency] || ['08:00']);
  }, [frequency]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) {
      setError('Name and dosage are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        timing: timing.filter(Boolean),
        instructions: instructions.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Medication name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Metformin"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Dosage
        </label>
        <input
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="e.g. 500mg"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Frequency
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as MedicationFrequency)}
          className={inputClass}
        >
          {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Timing
        </label>
        <div className="flex flex-wrap gap-2">
          {timing.map((t, i) => (
            <input
              key={i}
              type="time"
              value={t}
              onChange={(e) => {
                const next = [...timing];
                next[i] = e.target.value;
                setTiming(next);
              }}
              className={`${inputClass} w-32`}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Instructions (optional)
        </label>
        <input
          type="text"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Take with food"
          className={inputClass}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Medication'}</Button>
      </div>
    </form>
  );
}

/* ---------- Helpers ---------- */

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function groupByTime(items: DailyScheduleItem[]): Record<string, DailyScheduleItem[]> {
  const groups: Record<string, DailyScheduleItem[]> = {};
  for (const item of items) {
    const key = item.time;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
