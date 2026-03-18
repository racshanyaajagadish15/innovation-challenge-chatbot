'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import SoftAurora from '@/components/SoftAurora';

const stagger = {
  animate: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function LandingPage() {
  const router = useRouter();
  const { accessToken, authReady } = useStore();

  useEffect(() => {
    if (!supabase) return;
    if (!authReady) return;
    if (accessToken) router.replace('/dashboard');
  }, [accessToken, authReady, router]);

  const authEnabled = Boolean(supabase);
  const waitingForAuth = authEnabled && !authReady;
  const redirectingToDashboard = authEnabled && authReady && !!accessToken;

  if (waitingForAuth || redirectingToDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101f]">
        <div className="w-8 h-8 border-2 border-cyan-500/80 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-[#06101f]">
        <SoftAurora
          speed={0.6}
          scale={1.5}
          brightness={0.9}
          color1="#06b6d4"
          color2="#0d9488"
          noiseFrequency={2.5}
          noiseAmplitude={1}
          bandHeight={0.5}
          bandSpread={1}
          octaveDecay={0.1}
          layerOffset={0}
          colorSpeed={1}
          enableMouseInteraction
          mouseInfluence={0.25}
        />
      </div>

      {/* Hero — full viewport, Apple-style */}
      <motion.section
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-32"
        initial="initial"
        animate="animate"
        variants={stagger}
      >
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium tracking-[0.2em] uppercase text-cyan-400/90"
          >
            Chronic care, reimagined
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-6 text-[clamp(3.5rem,12vw,8rem)] font-semibold leading-[0.95] tracking-tight text-white"
          >
            <span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">
              CAREHIVE
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-xl md:text-2xl font-light tracking-tight text-slate-300/95 max-w-xl mx-auto"
          >
            Mood. Posture. Adherence.
            <br />
            <span className="text-slate-400/90">One place for your care journey.</span>
          </motion.p>
          <motion.div variants={fadeUp} className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={() => router.push('/login')}
              className="rounded-full bg-cyan-500 px-10 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign in
            </button>
            <Link
              href="/check-in"
              className="text-cyan-400/95 hover:text-cyan-300 font-medium text-base transition-colors"
            >
              Try video check-in →
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Features — scroll reveal */}
      <FeaturesSection />

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          {!authEnabled && (
            <p className="text-sm text-amber-400/80">
              Configure <code className="text-amber-300/90">NEXT_PUBLIC_SUPABASE_*</code> to enable sign-in.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Not medical advice. Vision output is best-effort.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const features = [
    { title: 'Health timeline', desc: 'Logs and history tied to you.', label: '01' },
    { title: 'Vision check-ins', desc: 'One frame. Mood and posture insights.', label: '02' },
    { title: 'Proactive care', desc: 'Prioritized next steps from your signals.', label: '03' },
  ];

  return (
    <section ref={ref} className="relative z-10 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm font-medium tracking-[0.2em] uppercase text-cyan-400/80 text-center mb-16"
        >
          Built for you
        </motion.p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {features.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-center md:text-left"
            >
              <span className="text-4xl font-semibold tabular-nums text-white/20">{item.label}</span>
              <h3 className="mt-4 text-xl md:text-2xl font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-slate-400/90 text-lg">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
