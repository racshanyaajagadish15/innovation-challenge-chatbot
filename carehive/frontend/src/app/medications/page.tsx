'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { AuthGate } from '@/components/AuthGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

type Medication = {
  id: string;
  name: string;
  dosage?: string;
  instructions?: string;
  createdAt: string;
  reminders: Array<{ id: string; timeOfDay: string; enabled: boolean }>;
};

type FlatReminder = {
  id: string;
  medicationId: string;
  medicationName: string;
  timeOfDay: string;
  enabled: boolean;
};

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reminders, setReminders] = useState<FlatReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingReminderFor, setAddingReminderFor] = useState<string | null>(null);
  const [newReminderTime, setNewReminderTime] = useState('09:00');

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([api.getMedications(), api.getReminders()])
      .then(([meds, rems]) => {
        setMedications(meds);
        setReminders(rems);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.addMedication({
        name: newName.trim(),
        dosage: newDosage.trim() || undefined,
        instructions: newInstructions.trim() || undefined,
      });
      setNewName('');
      setNewDosage('');
      setNewInstructions('');
      setShowAddMed(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMedication(id: string) {
    if (!confirm('Remove this medication and its reminders?')) return;
    try {
      await api.deleteMedication(id);
      load();
    } catch {
      setError('Failed to delete');
    }
  }

  async function handleAddReminder(medicationId: string) {
    setSaving(true);
    try {
      await api.addReminder(medicationId, { timeOfDay: newReminderTime, enabled: true });
      setAddingReminderFor(null);
      setNewReminderTime('09:00');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reminder');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReminder(medicationId: string, reminderId: string, enabled: boolean) {
    try {
      await api.updateReminder(medicationId, reminderId, { enabled });
      load();
    } catch {
      setError('Failed to update reminder');
    }
  }

  async function handleDeleteReminder(medicationId: string, reminderId: string) {
    try {
      await api.deleteReminder(medicationId, reminderId);
      load();
    } catch {
      setError('Failed to delete reminder');
    }
  }

  function formatTime(t: string) {
    const [h, m] = t.split(':');
    const hour = parseInt(h!, 10);
    const am = hour < 12;
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m || '00'} ${am ? 'AM' : 'PM'}`;
  }

  const todaysReminders = reminders
    .filter((r) => r.enabled)
    .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));

  const notifiedRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (todaysReminders.length === 0 || typeof window === 'undefined' || !('Notification' in window)) return;
    const check = () => {
      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (Notification.permission !== 'granted') return;
      todaysReminders.forEach((r) => {
        const reminderTime = r.timeOfDay.slice(0, 5);
        if (reminderTime === nowStr && notifiedRef.current[r.id] !== nowStr) {
          notifiedRef.current[r.id] = nowStr;
          new Notification(`CAREHIVE: ${r.medicationName}`, { body: 'Time to take your medication.' });
        }
      });
    };
    if (Notification.permission === 'default') Notification.requestPermission();
    const id = setInterval(check, 60 * 1000);
    return () => clearInterval(id);
  }, [todaysReminders]);

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-3xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Medication tracker</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Add medicines and set reminders so you never miss a dose.
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Today's schedule */}
        {todaysReminders.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>Today&apos;s schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {todaysReminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-100">{r.medicationName}</span>
                    <span className="text-teal-600 dark:text-teal-400 font-medium">{formatTime(r.timeOfDay)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enable browser notifications to get reminder alerts when it&apos;s time.
                </p>
                {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => Notification.requestPermission()}
                  >
                    Enable notifications
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add medication */}
        {!showAddMed ? (
          <Button onClick={() => setShowAddMed(true)} className="mb-6">
            Add medication
          </Button>
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">New medication</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMedication} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Metformin"
                    required
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    placeholder="e.g. 500mg"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instructions</label>
                  <input
                    type="text"
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    placeholder="e.g. Take with food"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Adding…' : 'Add'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowAddMed(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Loading…</p>
        ) : medications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500 dark:text-slate-400">
              No medications yet. Add one above to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {medications.map((med) => (
              <Card key={med.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{med.name}</CardTitle>
                    {(med.dosage || med.instructions) && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {[med.dosage, med.instructions].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMedication(med.id)}
                    className="text-sm text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Reminders</p>
                  {med.reminders.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No reminders</p>
                  ) : (
                    <ul className="space-y-2">
                      {med.reminders.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <span className="text-sm text-slate-700 dark:text-slate-300">{formatTime(r.timeOfDay)}</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={r.enabled}
                                onChange={(e) => handleToggleReminder(med.id, r.id, e.target.checked)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              On
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteReminder(med.id, r.id)}
                              className="text-xs text-slate-500 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {addingReminderFor === med.id ? (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-slate-100"
                      />
                      <Button size="sm" onClick={() => handleAddReminder(med.id)} disabled={saving}>
                        Add
                      </Button>
                      <button
                        type="button"
                        onClick={() => setAddingReminderFor(null)}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingReminderFor(med.id)}
                      className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      + Add reminder
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </AuthGate>
  );
}
