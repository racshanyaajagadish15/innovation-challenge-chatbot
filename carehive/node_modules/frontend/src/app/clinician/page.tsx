'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertBanner } from '@/components/AlertBanner';
import { AuthGate } from '@/components/AuthGate';
import { motion } from 'framer-motion';

export default function ClinicianPage() {
  const { userId } = useStore();
  const [summary, setSummary] = useState<{
    userName: string;
    condition: string;
    periodStart: string;
    periodEnd: string;
    adherenceRate: number;
    riskFlags: string[];
    trends: string[];
    agentHighlights: string[];
    generatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    api.getClinicianSummary(userId)
      .then(setSummary)
      .catch(() => setError('Failed to load summary'))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Clinician View</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">Weekly summary for care team</p>
        </div>

        {loading && (
          <p className="text-slate-500 dark:text-slate-400">Loading clinician summary…</p>
        )}

        {!loading && error && (
          <AlertBanner title="Could not load summary" description={error} severity="warning" />
        )}

        {!loading && !error && !summary && (
          <AlertBanner
            title="Could not load summary"
            description="Ensure the API is running."
            severity="warning"
          />
        )}

        {!loading && summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Patient</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{summary.userName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{summary.condition}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {new Date(summary.periodStart).toLocaleDateString()} – {new Date(summary.periodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Generated {new Date(summary.generatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Adherence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-teal-700 dark:text-teal-300">{summary.adherenceRate}%</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Medication adherence this period</p>
              </CardContent>
            </Card>

            {summary.riskFlags.length > 0 && (
              <div className="mb-6 space-y-2">
                <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Risk flags</h2>
                {summary.riskFlags.map((flag, i) => (
                  <AlertBanner key={i} title={flag} severity="warning" />
                ))}
              </div>
            )}

            {summary.trends.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 text-sm space-y-1">
                    {summary.trends.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {summary.agentHighlights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap">
                    {summary.agentHighlights.join('\n\n')}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>
    </AuthGate>
  );
}
