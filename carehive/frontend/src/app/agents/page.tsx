'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AuthGate } from '@/components/AuthGate';
import { motion } from 'framer-motion';

const AGENT_META: Record<string, { label: string; description: string; barClass: string }> = {
  care: {
    label: 'Care Agent',
    description: 'Medication adherence, missed doses, reminders',
    barClass: 'bg-teal-500',
  },
  lifestyle: {
    label: 'Lifestyle Agent',
    description: 'Diet & exercise suggestions (Singapore context)',
    barClass: 'bg-emerald-500',
  },
  emotional: {
    label: 'Emotional Agent',
    description: 'Mood and stress pattern detection',
    barClass: 'bg-violet-500',
  },
  clinician: {
    label: 'Clinician Agent',
    description: 'Weekly summaries and structured reports',
    barClass: 'bg-slate-500',
  },
};

export default function AgentsPage() {
  const { userId } = useStore();
  const [activity, setActivity] = useState<Array<{ agentType: string; message: string; priority: string; timestamp: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    api.getAgentActivity(userId)
      .then(({ activity: a }) => setActivity(a))
      .catch(() => setError('Failed to load activity'))
      .finally(() => setLoading(false));
  }, [userId]);

  const byAgent = activity.reduce((acc, item) => {
    if (!acc[item.agentType]) acc[item.agentType] = [];
    acc[item.agentType].push(item);
    return acc;
  }, {} as Record<string, typeof activity>);

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-5xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Agent Activity Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">What each AI agent is doing for this patient</p>
        </div>

        {error ? (
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
        ) : loading ? (
          <p className="text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(Object.keys(AGENT_META) as Array<keyof typeof AGENT_META>).map((type) => {
              const meta = AGENT_META[type];
              const items = byAgent[type] || [];
              return (
                <motion.div key={type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Card className="overflow-hidden">
                    <div className={`h-1 ${meta.barClass}`} />
                    <CardHeader>
                      <CardTitle className="text-base">{meta.label}</CardTitle>
                      <p className="text-xs text-slate-500 font-normal dark:text-slate-400">{meta.description}</p>
                    </CardHeader>
                    <CardContent>
                      {items.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500">No recent activity</p>
                      ) : (
                        <ul className="space-y-2">
                          {items.slice(0, 5).map((a, i) => (
                            <li
                              key={i}
                              className="text-sm text-slate-600 dark:text-slate-300 border-l-2 border-slate-200 dark:border-slate-800 pl-3 py-0.5"
                            >
                              <span className="text-slate-400 dark:text-slate-500 text-xs">{new Date(a.timestamp).toLocaleString()}</span>
                              <p className="mt-0.5">{a.message}</p>
                            </li>
                          ))}
                          {items.length > 5 && (
                            <li className="text-xs text-slate-400 dark:text-slate-500">+{items.length - 5} more</li>
                          )}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </AuthGate>
  );
}
