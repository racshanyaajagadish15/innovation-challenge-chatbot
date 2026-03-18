'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

export default function LoginPage() {
  const router = useRouter();
  const { accessToken, authReady } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (!authReady || !accessToken) return;
    router.replace('/dashboard');
  }, [accessToken, authReady, router]);

  async function handleGoogleSignIn() {
    if (!supabase) {
      setError('Auth not configured.');
      return;
    }
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (err) throw err;
    } catch (err: unknown) {
      const raw = err && typeof err === 'object'
        ? String((err as { message?: string; msg?: string }).message ?? (err as { msg?: string }).msg ?? '')
        : err instanceof Error ? err.message : '';
      const msg = raw || 'Could not sign in with Google';
      if (/not enabled|Unsupported provider/i.test(msg)) {
        setError('Google sign-in is not enabled. In Supabase Dashboard go to Authentication → Providers and enable Google, then add your Google OAuth client ID and secret.');
      } else {
        setError(msg);
      }
      setGoogleLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('Auth not configured.');
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#06101f]">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-white">Sign in</h1>
          <p className="mt-3 text-sm text-slate-400">
            Auth is disabled. Set <code className="text-cyan-400/90">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="text-cyan-400/90">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in .env.local.
          </p>
          <Link href="/" className="mt-6 inline-block text-cyan-400 hover:text-cyan-300 font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (authReady && accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101f]">
        <div className="w-8 h-8 border-2 border-cyan-500/80 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#06101f]">
      <motion.div
        className="w-full max-w-[400px]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-white hover:text-cyan-200 transition-colors">
            CAREHIVE
          </Link>
          <p className="mt-3 text-slate-400 text-sm">
            Sign in to continue to your care dashboard.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
          {/* Google — primary */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl h-12 px-4 bg-white text-slate-800 font-medium hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon className="w-5 h-5" />
            )}
            <span>{googleLoading ? 'Redirecting…' : 'Continue with Google'}</span>
          </button>

          <div className="relative my-8">
            <span className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </span>
            <span className="relative flex justify-center text-xs uppercase tracking-wider text-slate-500">
              or
            </span>
          </div>

          {/* Email toggle */}
          {!showEmailForm ? (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full rounded-xl h-12 px-4 border border-white/15 text-slate-300 font-medium hover:bg-white/5 hover:border-white/20 transition-colors"
            >
              Sign in with email
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl h-12 px-4 bg-cyan-500 text-slate-900 font-semibold hover:bg-cyan-400 active:bg-cyan-600 transition-colors disabled:opacity-60"
              >
                {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in with email'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "No account? Sign up"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEmailForm(false); setError(null); }}
                  className="text-slate-500 hover:text-slate-400"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-400 transition-colors">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
