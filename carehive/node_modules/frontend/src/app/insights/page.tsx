'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { AuthGate } from '@/components/AuthGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertBanner } from '@/components/AlertBanner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';

interface HistoryEntry {
  medicationTaken: boolean;
  steps: number;
  mood: number;
  timestamp: string;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  severity: string;
  agentSource?: string;
}

export default function InsightsPage() {
  return (
    <AuthGate>
      <InsightsInner />
    </AuthGate>
  );
}

function InsightsInner() {
  const { userId, userName, userRole, viewingPatientId, viewingPatientName } = useStore();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMultiPatientRole = userRole === 'clinician' || userRole === 'family';
  const targetUserId = isMultiPatientRole ? viewingPatientId : userId;

  useEffect(() => {
    if (!targetUserId) {
      setHistory([]);
      setInsights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([api.getHistory(targetUserId, 60), api.getInsights(targetUserId)])
      .then(([logs, { insights: i }]) => {
        setHistory(logs);
        setInsights(i);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [targetUserId]);

  const analytics = useMemo(() => computeAnalytics(history), [history]);
  const riskAlerts = useMemo(() => computeRiskAlerts(history, analytics), [history, analytics]);
  const dailySummary = useMemo(() => computeDailySummary(history, analytics), [history, analytics]);

  if (isMultiPatientRole && !viewingPatientId) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-6xl mx-auto">
        <EmptyState
          title="No patient selected"
          description="Use the sidebar to add and select a patient to view their health insights."
        />
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 md:p-8 max-w-6xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Health Insights</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Personalized health analytics, risk monitoring, and daily summary
        </p>
      </div>

      {error && <AlertBanner title="Data unavailable" description={error} severity="warning" />}

      {/* Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <HealthScoreCard score={analytics.healthScore} trend={analytics.scoreTrend} />
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {dailySummary.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No data to summarize yet.</p>
            ) : (
              <ul className="space-y-2">
                {dailySummary.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className={`mt-0.5 shrink-0 ${item.positive ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {item.positive ? '↑' : '↓'}
                    </span>
                    {item.message}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Adherence"
          value={`${analytics.adherenceRate}%`}
          status={analytics.adherenceRate >= 80 ? 'good' : analytics.adherenceRate >= 60 ? 'warn' : 'bad'}
          sublabel="medication compliance"
        />
        <MetricTile
          label="Mood Trend"
          value={analytics.moodTrend > 0 ? 'Improving' : analytics.moodTrend < 0 ? 'Declining' : 'Stable'}
          status={analytics.moodTrend >= 0 ? 'good' : 'warn'}
          sublabel={`avg ${analytics.avgMood}/10`}
        />
        <MetricTile
          label="Activity"
          value={analytics.avgSteps.toLocaleString()}
          status={analytics.avgSteps >= 5000 ? 'good' : analytics.avgSteps >= 3000 ? 'warn' : 'bad'}
          sublabel="avg daily steps"
        />
        <MetricTile
          label="Streak"
          value={`${analytics.currentStreak}d`}
          status={analytics.currentStreak >= 7 ? 'good' : analytics.currentStreak >= 3 ? 'warn' : 'bad'}
          sublabel="consecutive adherence"
        />
      </div>

      {/* Risk Alerts */}
      {riskAlerts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Risk Alerts</h2>
            <Badge variant="danger" dot>{riskAlerts.length}</Badge>
          </div>
          <div className="space-y-3">
            {riskAlerts.map((alert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <AlertBanner
                  title={alert.title}
                  description={alert.description}
                  severity={alert.severity}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Insights */}
      {insights.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            AI Agent Insights
          </h2>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      {insight.agentSource && (
                        <Badge variant="default" size="sm">{insight.agentSource}</Badge>
                      )}
                      <Badge
                        variant={insight.severity === 'critical' ? 'danger' : insight.severity === 'warning' ? 'warning' : 'info'}
                        size="sm"
                      >
                        {insight.severity}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-slate-800 dark:text-slate-100">{insight.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{insight.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Behavior Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BehaviorPatternCard
          title="Best Adherence Days"
          items={analytics.bestDays}
          emptyText="Not enough data to identify patterns yet."
        />
        <BehaviorPatternCard
          title="Smart Suggestions"
          items={analytics.suggestions}
          emptyText="Keep logging to receive personalized suggestions."
        />
      </div>
    </motion.div>
  );
}

/* ---------- Sub-components ---------- */

function HealthScoreCard({ score, trend }: { score: number; trend: number }) {
  const color = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  const bgRing = score >= 80 ? 'stroke-emerald-500' : score >= 60 ? 'stroke-amber-500' : 'stroke-red-500';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardContent className="py-6 flex flex-col items-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Health Score</p>
        <div className="relative w-28 h-28 mb-3">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-slate-700" />
            <circle
              cx="50" cy="50" r="45" fill="none" strokeWidth="8"
              strokeLinecap="round"
              className={bgRing}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${color}`}>{score}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {trend > 0 ? (
            <Badge variant="success" size="sm" dot>+{trend} this week</Badge>
          ) : trend < 0 ? (
            <Badge variant="danger" size="sm" dot>{trend} this week</Badge>
          ) : (
            <Badge variant="default" size="sm">Stable</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  status,
  sublabel,
}: {
  label: string;
  value: string;
  status: 'good' | 'warn' | 'bad';
  sublabel: string;
}) {
  const borderColor = status === 'good' ? 'border-l-emerald-500' : status === 'warn' ? 'border-l-amber-500' : 'border-l-red-500';
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="py-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

function BehaviorPatternCard({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Analytics Engine ---------- */

interface Analytics {
  healthScore: number;
  scoreTrend: number;
  adherenceRate: number;
  avgMood: number;
  moodTrend: number;
  avgSteps: number;
  currentStreak: number;
  bestDays: string[];
  suggestions: string[];
}

function computeAnalytics(history: HistoryEntry[]): Analytics {
  if (history.length === 0) {
    return {
      healthScore: 0,
      scoreTrend: 0,
      adherenceRate: 0,
      avgMood: 0,
      moodTrend: 0,
      avgSteps: 0,
      currentStreak: 0,
      bestDays: [],
      suggestions: ['Start logging your health data to see personalized insights.'],
    };
  }

  const sorted = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recent = sorted.slice(0, 14);
  const older = sorted.slice(14, 28);

  const adherenceRate = Math.round((recent.filter((e) => e.medicationTaken).length / recent.length) * 100);
  const avgMood = Math.round((recent.reduce((s, e) => s + e.mood, 0) / recent.length) * 10) / 10;
  const avgSteps = Math.round(recent.reduce((s, e) => s + e.steps, 0) / recent.length);

  const olderMood = older.length ? older.reduce((s, e) => s + e.mood, 0) / older.length : avgMood;
  const moodTrend = Math.round((avgMood - olderMood) * 10) / 10;

  let currentStreak = 0;
  for (const entry of sorted) {
    if (entry.medicationTaken) currentStreak++;
    else break;
  }

  const adherenceScore = Math.min(adherenceRate, 100) * 0.35;
  const moodScore = Math.min(avgMood / 10, 1) * 100 * 0.25;
  const stepsScore = Math.min(avgSteps / 8000, 1) * 100 * 0.25;
  const streakScore = Math.min(currentStreak / 14, 1) * 100 * 0.15;
  const healthScore = Math.round(adherenceScore + moodScore + stepsScore + streakScore);

  const olderScore = older.length ? Math.round(
    Math.min(older.filter((e) => e.medicationTaken).length / older.length * 100, 100) * 0.35 +
    Math.min(olderMood / 10, 1) * 100 * 0.25 +
    Math.min((older.reduce((s, e) => s + e.steps, 0) / older.length) / 8000, 1) * 100 * 0.25 +
    15
  ) : healthScore;
  const scoreTrend = healthScore - olderScore;

  const dayAdherence: Record<string, number[]> = {};
  for (const e of history) {
    const day = new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayAdherence[day]) dayAdherence[day] = [];
    dayAdherence[day].push(e.medicationTaken ? 1 : 0);
  }
  const bestDays = Object.entries(dayAdherence)
    .map(([day, vals]) => ({ day, rate: vals.reduce((s, v) => s + v, 0) / vals.length }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .filter((d) => d.rate > 0)
    .map((d) => `${d.day}: ${Math.round(d.rate * 100)}% adherence`);

  const suggestions: string[] = [];
  if (adherenceRate < 80) suggestions.push('Try setting medication reminders for the same time each day to build consistency.');
  if (avgMood < 5) suggestions.push('Your mood has been lower than usual. Consider talking to your care team or trying a relaxation technique.');
  if (avgSteps < 3000) suggestions.push('Your step count is below target. Even a 15-minute walk can make a difference.');
  if (currentStreak >= 7) suggestions.push('Great streak! You\'ve been consistent for a week. Keep it up!');
  if (moodTrend > 0.5) suggestions.push('Your mood is trending upward — whatever you\'re doing is working.');
  if (suggestions.length === 0) suggestions.push('You\'re on track! Keep maintaining your current health habits.');

  return { healthScore, scoreTrend, adherenceRate, avgMood, moodTrend, avgSteps, currentStreak, bestDays, suggestions };
}

function computeRiskAlerts(
  history: HistoryEntry[],
  analytics: Analytics
): Array<{ title: string; description: string; severity: 'info' | 'warning' | 'critical' }> {
  const alerts: Array<{ title: string; description: string; severity: 'info' | 'warning' | 'critical' }> = [];

  if (analytics.adherenceRate < 50) {
    alerts.push({
      title: 'Critical: Low Medication Adherence',
      description: `Your medication adherence is at ${analytics.adherenceRate}%. Missing medications regularly can lead to worsening conditions. Please consult your care team.`,
      severity: 'critical',
    });
  } else if (analytics.adherenceRate < 80) {
    alerts.push({
      title: 'Medication Adherence Below Target',
      description: `Your adherence is ${analytics.adherenceRate}%, below the recommended 80%. Consider using reminders to stay on track.`,
      severity: 'warning',
    });
  }

  const recent3 = [...history]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);
  const allMissed = recent3.length >= 3 && recent3.every((e) => !e.medicationTaken);
  if (allMissed) {
    alerts.push({
      title: 'Consecutive Missed Doses',
      description: 'You have missed your last 3 consecutive medication doses. This pattern needs immediate attention.',
      severity: 'critical',
    });
  }

  if (analytics.avgMood < 4 && history.length >= 5) {
    alerts.push({
      title: 'Low Mood Detected',
      description: `Your average mood score is ${analytics.avgMood}/10 over recent entries. Consider reaching out to your emotional support network.`,
      severity: 'warning',
    });
  }

  if (analytics.moodTrend < -2) {
    alerts.push({
      title: 'Declining Mood Trend',
      description: 'Your mood has been declining compared to previous weeks. A check-in with your care team is recommended.',
      severity: 'warning',
    });
  }

  if (analytics.avgSteps < 2000 && history.length >= 5) {
    alerts.push({
      title: 'Very Low Activity Level',
      description: `Average daily steps of ${analytics.avgSteps.toLocaleString()} is well below recommended levels. Gradual increases can improve outcomes.`,
      severity: 'warning',
    });
  }

  return alerts;
}

function computeDailySummary(
  history: HistoryEntry[],
  analytics: Analytics
): Array<{ message: string; positive: boolean }> {
  const items: Array<{ message: string; positive: boolean }> = [];
  if (history.length === 0) return items;

  if (analytics.adherenceRate >= 80) {
    items.push({ message: `Strong medication adherence at ${analytics.adherenceRate}% — keep it up!`, positive: true });
  } else {
    items.push({ message: `Medication adherence at ${analytics.adherenceRate}% — aim for 80%+ for best outcomes.`, positive: false });
  }

  if (analytics.moodTrend > 0) {
    items.push({ message: `Mood is trending upward (+${analytics.moodTrend}) compared to last period.`, positive: true });
  } else if (analytics.moodTrend < 0) {
    items.push({ message: `Mood has dipped (${analytics.moodTrend}) — consider activities that boost your wellbeing.`, positive: false });
  }

  if (analytics.avgSteps >= 5000) {
    items.push({ message: `Great activity level with ${analytics.avgSteps.toLocaleString()} avg steps.`, positive: true });
  } else {
    items.push({ message: `Activity is below target (${analytics.avgSteps.toLocaleString()} steps). Try adding short walks.`, positive: false });
  }

  if (analytics.currentStreak >= 3) {
    items.push({ message: `${analytics.currentStreak}-day adherence streak — excellent consistency!`, positive: true });
  }

  return items;
}
