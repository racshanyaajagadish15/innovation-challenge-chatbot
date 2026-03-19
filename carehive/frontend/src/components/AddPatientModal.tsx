'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useStore, type PatientSummary } from '@/store/useStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: (patient: PatientSummary) => void;
}

export function AddPatientModal({ open, onClose, onAdded }: Props) {
  const { userRole } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = userRole === 'clinician' ? 'Patient' : 'Family Member';

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchUsers(query);
        setResults(res.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleAdd(user: PatientSummary) {
    setAddingId(user.id);
    setError(null);
    try {
      await api.addRelationship(user.id);
      onAdded(user);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-2xl"
            style={{ background: 'var(--card, white)', borderColor: 'var(--card-border)' }}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Add {label}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: 'var(--muted)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative mb-3">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--muted)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search by name...`}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'var(--background2, #f1f5f9)',
                  color: 'var(--foreground)',
                }}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-2">{error}</p>
            )}

            <div className="min-h-[120px] max-h-64 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--card-border)' }}>
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)' }} />
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                  {query.length < 2 ? 'Type at least 2 characters to search' : 'No users found'}
                </div>
              ) : (
                results.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: 'var(--primary)' }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{user.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        Age {user.age} · {user.condition?.replace('_', ' ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdd(user)}
                      disabled={addingId === user.id}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-60"
                      style={{ background: 'var(--primary)' }}
                    >
                      {addingId === user.id ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              Search for registered CareHive users to add them to your {label.toLowerCase()} list.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
