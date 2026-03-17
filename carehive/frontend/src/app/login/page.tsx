'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('Auth not configured. Set NEXT_PUBLIC_SUPABASE_* in .env.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        router.push('/profile?new=1');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!supabase) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card className="overflow-hidden">
          <div className="h-1 bg-teal-500" />
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-300">
              Auth is disabled. Set{' '}
              <code className="text-sm bg-slate-100 px-1 rounded dark:bg-slate-900/50">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{' '}
              and{' '}
              <code className="text-sm bg-slate-100 px-1 rounded dark:bg-slate-900/50">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{' '}
              in <code className="text-sm bg-slate-100 px-1 rounded dark:bg-slate-900/50">.env.local</code>.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="text-teal-600 hover:underline dark:text-teal-300">
                Back to landing
              </Link>
              <Link href="/dashboard" className="text-teal-600 hover:underline dark:text-teal-300">
                Enter dashboard (demo)
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="p-8 max-w-md mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">
            {isSignUp ? 'Create account' : 'Sign in'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                !isSignUp
                  ? 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/30 dark:border-teal-900/60 dark:text-teal-200'
                  : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900/40'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                isSignUp
                  ? 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/30 dark:border-teal-900/60 dark:text-teal-200'
                  : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900/40'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-100"
              >
                {error}
              </motion.p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/30 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/30 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link href="/" className="text-sm text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300">
              Back to landing
            </Link>
            <Link href="/check-in" className="text-sm text-teal-600 hover:underline dark:text-teal-300">
              Try video check-in
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
