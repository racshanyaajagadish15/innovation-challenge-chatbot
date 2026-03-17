'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { MetricCard } from '@/components/MetricCard';
import { AlertBanner } from '@/components/AlertBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StepsMoodChart, AdherenceChart } from '@/components/Charts';
import { AuthGate } from '@/components/AuthGate';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const { userId, userName } = useStore();
  const [history, setHistory] = useState<
    Array<{ medicationTaken: boolean; steps: number; mood: number; timestamp: string }>
  >([]);
  const [insights, setInsights] = useState<
    Array<{ type: string; title: string; description: string; severity: string; agentSource?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([api.getHistory(userId), api.getInsights(userId)])
      .then(([logs, { insights: i }]) => {
        setHistory(logs);
        setInsights(i);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [userId]);

  const adherenceRate = history.length
    ? Math.round((history.filter((l) => l.medicationTaken).length / history.length) * 1000) / 10
    : 0;
  const avgSteps = history.length ? Math.round(history.reduce((s, l) => s + l.steps, 0) / history.length) : 0;
  const avgMood = history.length ? Math.round((history.reduce((s, l) => s + l.mood, 0) / history.length) * 10) / 10 : 0;

  const chartData = [...history]
    .reverse()
    .slice(-14)
    .map((l, i) => ({
      day: `Day ${i + 1}`,
      steps: l.steps,
      mood: l.mood,
      meds: l.medicationTaken ? 1 : 0,
    }));

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-8 max-w-6xl mx-auto"
      >
        <div className="carehive-card p-6">
          <p className="text-sm text-slate-500 dark:text-slate-300">Loading dashboard…</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="p-8 max-w-6xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">
          {userName ? `Welcome back, ${userName}.` : 'Health overview'}
        </p>
      </div>

      {error && <AlertBanner title="Connection issue" description={error} severity="warning" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Adherence" value={`${adherenceRate}%`} subtitle="Last 7 days" />
        <MetricCard title="Avg steps" value={avgSteps.toLocaleString()} />
        <MetricCard title="Avg mood" value={avgMood} subtitle="1–10 scale" />
        <MetricCard title="Logs" value={history.length} subtitle="Recent entries" />
      </div>

      {insights.length > 0 && (
        <div className="mb-8 space-y-2">
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Insights</h2>
          {insights.map((i, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <div className="mb-2 flex items-center gap-2">
                {i.agentSource && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-teal-200 bg-teal-50/60 text-teal-800 dark:border-teal-900/70 dark:bg-teal-950/20 dark:text-teal-200">
                    From {i.agentSource}
                  </span>
                )}
              </div>
              <AlertBanner
                title={i.title}
                description={i.description}
                severity={i.severity === 'critical' ? 'critical' : i.severity === 'warning' ? 'warning' : 'info'}
              />
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Steps &amp; mood (last 14 entries)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <StepsMoodChart data={chartData} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Medication adherence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <AdherenceChart data={chartData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

