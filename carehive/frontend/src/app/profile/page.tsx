'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { signOut } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const CONDITIONS = ['diabetes', 'hypertension', 'copd', 'heart_failure', 'other'] as const;

export default function ProfilePage() {
  const router = useRouter();
  const { accessToken, userId, setUser } = useStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isNew = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1';

  useEffect(() => {
    if (!accessToken) return;
    api
      .getMe()
      .then((u) => {
        setName(u.name);
        setAge(String(u.age));
        setCondition(u.condition);
      })
      .catch(() => {
        // Profile not created yet
      });
  }, [accessToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) {
      router.push('/login');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!name.trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120 || !condition) {
      setError('Please enter name, valid age (1–120), and condition.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const u = await api.updateProfile({ name: name.trim(), age: ageNum, condition });
      setUser(u.id, u.name);
      setSaved(true);
      if (isNew) setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    signOut(router);
  }

  if (!supabase) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <p className="text-slate-600 dark:text-slate-300">Auth is not configured.</p>
        <Link href="/" className="mt-4 inline-block text-teal-600 hover:underline dark:text-teal-400">Back to home</Link>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600">Sign in to manage your profile.</p>
            <Link href="/login" className="mt-4 inline-block text-teal-600 hover:underline">Go to Sign in</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your profile</CardTitle>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Sign out
          </button>
        </CardHeader>
        <CardContent>
          {isNew && (
            <p className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 mb-4">
              Complete your profile so CAREHIVE can personalize your care plan.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
            {saved && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                Profile saved.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select...</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
