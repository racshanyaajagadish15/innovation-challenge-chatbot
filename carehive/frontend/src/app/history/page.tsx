'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { AuthGate } from '@/components/AuthGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion } from 'framer-motion';

type HealthLog = {
  id: string;
  medicationTaken: boolean;
  steps: number;
  mood: number;
  timestamp: string;
  sleepHours?: number;
  activityMinutes?: number;
  notes?: string;
  source?: string;
};

type Activity = { id: string; type: string; startTime: string; endTime: string; distanceKm?: number; notes?: string };

export default function HistoryPage() {
  const { userId } = useStore();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([api.getHistory(userId, 50), api.getActivityHistory(userId, 50)])
      .then(([l, a]) => {
        setLogs(l as any);
        setActivities(a as any);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, [userId]);

  const feed = useMemo(() => {
    const items: Array<
      | { kind: 'health'; at: string; data: HealthLog }
      | { kind: 'activity'; at: string; data: Activity }
    > = [];
    logs.forEach((l) => items.push({ kind: 'health', at: l.timestamp, data: l }));
    activities.forEach((a) => items.push({ kind: 'activity', at: a.startTime, data: a }));
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [logs, activities]);

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">History</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            All health logs and activity sessions over time.
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-8 text-slate-500 dark:text-slate-400">Loading…</CardContent>
          </Card>
        ) : feed.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-slate-500 dark:text-slate-400">
              No entries yet. Add a log on <span className="font-medium">Health log</span> or do a <span className="font-medium">Video check-in</span>.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feed.map((item) =>
              item.kind === 'health' ? (
                <HealthLogCard key={`h-${item.data.id}`} log={item.data} />
              ) : (
                <ActivityCard key={`a-${item.data.id}`} activity={item.data} />
              )
            )}
          </div>
        )}
      </motion.div>
    </AuthGate>
  );
}

function HealthLogCard({ log }: { log: HealthLog }) {
  const dt = new Date(log.timestamp);
  const when = dt.toLocaleString();
  const moodLabel = log.mood >= 8 ? 'Great' : log.mood >= 6 ? 'Good' : log.mood >= 4 ? 'Okay' : 'Low';
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Health log</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{when}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${
          (log.source || 'manual') === 'vision'
            ? 'border-cyan-200 bg-cyan-50/60 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:text-cyan-200'
            : 'border-teal-200 bg-teal-50/60 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-200'
        }`}>
          {(log.source || 'manual') === 'vision' ? 'Vision' : 'Manual'}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Steps" value={log.steps.toLocaleString()} />
          <Metric label="Mood" value={`${log.mood}/10 (${moodLabel})`} />
          <Metric label="Sleep" value={log.sleepHours != null ? `${log.sleepHours}h` : '—'} />
          <Metric label="Meds" value={log.medicationTaken ? 'Taken' : 'Missed'} />
        </div>
        {log.notes && (
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{log.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const start = new Date(activity.startTime);
  const end = new Date(activity.endTime);
  const durMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity: {activity.type}</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{start.toLocaleString()}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Duration" value={`${durMin} min`} />
        <Metric label="Distance" value={activity.distanceKm != null ? `${activity.distanceKm} km` : '—'} />
        <Metric label="End" value={end.toLocaleTimeString()} />
        <Metric label="Notes" value={activity.notes ? 'Yes' : '—'} />
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-3 py-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

