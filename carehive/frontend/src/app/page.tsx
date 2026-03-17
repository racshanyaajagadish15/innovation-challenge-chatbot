'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  const router = useRouter();
  const { accessToken, authReady } = useStore();

  useEffect(() => {
    if (!supabase) return; // demo-only mode
    if (!authReady) return;
    if (accessToken) router.replace('/dashboard');
  }, [accessToken, authReady, router]);

  const authEnabled = Boolean(supabase);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="p-8"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="carehive-card p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-200 bg-teal-50/60 dark:bg-teal-950/30">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-sm font-medium text-teal-800 dark:text-teal-200">Chronic care, simplified</span>
          </div>

          <h1 className="mt-6 text-4xl md:text-5xl font-semibold leading-tight text-slate-900 dark:text-white">
            CAREHIVE
            <span className="block text-teal-700 dark:text-teal-300">mood • posture • adherence</span>
          </h1>

          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
            Track your health signals and get clear, color-coded suggestions from your care team.
            You can also capture a frame to infer mood and posture.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <Button onClick={() => router.push('/login')}>Sign in</Button>
            <Link
              href="/check-in"
              className="inline-flex items-center justify-center rounded-lg border border-teal-200 bg-teal-50/50 px-4 h-10 text-sm font-medium text-teal-800 hover:bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100"
            >
              Video check-in
            </Link>
          </div>

          {!authEnabled && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60 rounded-lg px-3 py-2 max-w-2xl">
              Supabase Auth is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable real dashboards.
            </p>
          )}

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Not medical advice. Vision output is best-effort from a single frame.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            title="Health timeline"
            desc="Logs and history are tied to your user account."
          />
          <InfoCard
            title="Vision check-ins"
            desc="Capture a frame to infer mood and posture changes."
          />
          <InfoCard
            title="Proactive interventions"
            desc="Agents generate prioritized next steps based on your signals."
          />
        </div>
      </div>
    </motion.div>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="carehive-card p-5">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
    </div>
  );
}
