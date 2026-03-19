'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { AuthGate } from '@/components/AuthGate';
import { motion } from 'framer-motion';

const AGENT_COLORS: Record<string, string> = {
  care: 'bg-teal-100 text-teal-800 border-teal-200',
  lifestyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  emotional: 'bg-violet-100 text-violet-800 border-violet-200',
  clinician: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function TimelinePage() {
  const { userId, interventions, setInterventions } = useStore();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    api.getAgentActivity(userId).then(({ activity }) => {
      setInterventions(
        activity.map((a) => ({
          id: `act-${a.timestamp}-${a.agentType}`,
          userId,
          agentType: a.agentType,
          message: a.message,
          priority: a.priority,
          createdAt: a.timestamp,
        }))
      );
    }).catch(() => setError('Failed to load activity')).finally(() => setLoading(false));
  }, [userId, setInterventions]);

  const runOrchestrator = () => {
    if (!userId) return;
    setRunning(true);
    api.runOrchestrator(userId).then(() => {
      api.getAgentActivity(userId).then(({ activity }) => {
        setInterventions(
          activity.map((a) => ({
            id: `act-${a.timestamp}-${a.agentType}`,
            userId,
            agentType: a.agentType,
            message: a.message,
            priority: a.priority,
            createdAt: a.timestamp,
          }))
        );
      });
    }).finally(() => setRunning(false));
  };

  const list = [...interventions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-3xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">AI Care Timeline</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Chronological interventions from your care agents
            </p>
          </div>
          <Button onClick={runOrchestrator} disabled={running || !userId}>
            {running ? 'Running…' : 'Run agents'}
          </Button>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-600 dark:text-slate-300">{error}</CardContent>
          </Card>
        ) : loading ? (
          <p className="text-slate-500 dark:text-slate-400">Loading timeline…</p>
        ) : (
          <div className="space-y-4">
            {list.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No interventions yet. Click “Run agents” to trigger the AI care pipeline.
                </CardContent>
              </Card>
            ) : (
              list.map((item) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Card className="overflow-hidden">
                    <div className={`h-1 ${AGENT_COLORS[item.agentType]?.split(' ')[0] || 'bg-slate-200'} `} />
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded border ${
                            AGENT_COLORS[item.agentType] || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {item.agentType}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200">{item.message}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </AuthGate>
  );
}
