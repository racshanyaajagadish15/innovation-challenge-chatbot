'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AuthGate } from '@/components/AuthGate';
import { EmptyState } from '@/components/ui/EmptyState';
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
  return (
    <AuthGate>
      <AgentsInner />
    </AuthGate>
  );
}

function AgentsInner() {
  const { userId, userRole, viewingPatientId, viewingPatientName } = useStore();
  const [activity, setActivity] = useState<Array<{ agentType: string; message: string; priority: string; timestamp: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMultiPatientRole = userRole === 'clinician' || userRole === 'family';
  const targetUserId = isMultiPatientRole ? viewingPatientId : userId;

  useEffect(() => {
    if (!targetUserId) {
      setActivity([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getAgentActivity(targetUserId)
      .then(({ activity: a }) => setActivity(a))
      .catch(() => setError('Failed to load activity'))
      .finally(() => setLoading(false));
  }, [targetUserId]);

  if (isMultiPatientRole && !viewingPatientId) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-5xl mx-auto">
        <EmptyState
          title="No patient selected"
          description="Use the sidebar to add and select a patient to view their agent activity."
        />
      </motion.div>
    );
  }

  const byAgent = activity.reduce((acc, item) => {
    if (!acc[item.agentType]) acc[item.agentType] = [];
    acc[item.agentType].push(item);
    return acc;
  }, {} as Record<string, typeof activity>);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="p-8 max-w-5xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>Agent Activity Panel</h1>
        <p style={{ color: 'var(--muted)' }} className="mt-1">
          {isMultiPatientRole
            ? `AI agent activity for ${viewingPatientName || 'selected patient'}`
            : 'What each AI agent is doing for this patient'}
        </p>
      </div>

      {error ? (
        <p style={{ color: 'var(--muted)' }}>{error}</p>
      ) : loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
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
                    <p className="text-xs font-normal" style={{ color: 'var(--muted)' }}>{meta.description}</p>
                  </CardHeader>
                  <CardContent>
                    {items.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>No recent activity</p>
                    ) : (
                      <ul className="space-y-2">
                        {items.slice(0, 5).map((a, i) => (
                          <li
                            key={i}
                            className="text-sm border-l-2 border-slate-200 dark:border-slate-800 pl-3 py-0.5"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(a.timestamp).toLocaleString()}</span>
                            <p className="mt-0.5">{a.message}</p>
                          </li>
                        ))}
                        {items.length > 5 && (
                          <li className="text-xs" style={{ color: 'var(--muted)' }}>+{items.length - 5} more</li>
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
  );
}
