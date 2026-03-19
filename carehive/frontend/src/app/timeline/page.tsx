'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { AuthGate } from '@/components/AuthGate';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';

const AGENT_COLORS: Record<string, string> = {
  care: 'bg-teal-100 text-teal-800 border-teal-200',
  lifestyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  emotional: 'bg-violet-100 text-violet-800 border-violet-200',
  clinician: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function TimelinePage() {
  return (
    <AuthGate>
      <TimelineInner />
    </AuthGate>
  );
}

function TimelineInner() {
  const { userId, userRole, viewingPatientId, viewingPatientName, interventions, setInterventions } = useStore();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMultiPatientRole = userRole === 'clinician' || userRole === 'family';
  const targetUserId = isMultiPatientRole ? viewingPatientId : userId;

  useEffect(() => {
    if (!targetUserId) {
      setInterventions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getAgentActivity(targetUserId).then(({ activity }) => {
      setInterventions(
        activity.map((a) => ({
          id: `act-${a.timestamp}-${a.agentType}`,
          userId: targetUserId,
          agentType: a.agentType,
          message: a.message,
          priority: a.priority,
          createdAt: a.timestamp,
        }))
      );
    }).catch(() => setError('Failed to load activity')).finally(() => setLoading(false));
  }, [targetUserId, setInterventions]);

  const runOrchestrator = () => {
    if (!targetUserId) return;
    setRunning(true);
    api.runOrchestrator(targetUserId).then(() => {
      api.getAgentActivity(targetUserId).then(({ activity }) => {
        setInterventions(
          activity.map((a) => ({
            id: `act-${a.timestamp}-${a.agentType}`,
            userId: targetUserId,
            agentType: a.agentType,
            message: a.message,
            priority: a.priority,
            createdAt: a.timestamp,
          }))
        );
      });
    }).finally(() => setRunning(false));
  };

  if (isMultiPatientRole && !viewingPatientId) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-3xl mx-auto">
        <EmptyState
          title={userRole === 'clinician' ? 'No patient selected' : 'No family member selected'}
          description="Use the sidebar to add and select a person to view their care timeline."
        />
      </motion.div>
    );
  }

  const list = [...interventions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="p-8 max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>AI Care Timeline</h1>
          <p style={{ color: 'var(--muted)' }} className="mt-1">
            {isMultiPatientRole
              ? `Interventions for ${viewingPatientName || 'selected patient'}`
              : 'Chronological interventions from your care agents'}
          </p>
        </div>
        <Button onClick={runOrchestrator} disabled={running || !targetUserId}>
          {running ? 'Running...' : 'Run agents'}
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center" style={{ color: 'var(--muted)' }}>{error}</CardContent>
        </Card>
      ) : loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading timeline...</p>
      ) : (
        <div className="space-y-4">
          {list.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center" style={{ color: 'var(--muted)' }}>
                No interventions yet. Click &quot;Run agents&quot; to trigger the AI care pipeline.
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
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--foreground)' }}>{item.message}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
