'use client';

import { useEffect, useState } from 'react';
import { useStore, type PatientSummary } from '@/store/useStore';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

export function PatientSelector() {
  const { userRole, patientList, setPatientList, viewingPatientId, setViewingPatient } = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMultiPatientRole = userRole === 'clinician' || userRole === 'family';
  if (!isMultiPatientRole) return null;

  useEffect(() => {
    if (!isMultiPatientRole) return;
    if (patientList.length > 0) return;
    setLoading(true);
    api.getPatients()
      .then((res) => {
        const list = res?.patients ?? [];
        setPatientList(list);
        if (list.length > 0 && !viewingPatientId) {
          setViewingPatient(list[0].id, list[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isMultiPatientRole, patientList.length, setPatientList, viewingPatientId, setViewingPatient]);

  const current = patientList.find((p) => p.id === viewingPatientId);
  const label = userRole === 'clinician' ? 'Patient' : 'Family Member';

  function handleSelect(p: PatientSummary) {
    setViewingPatient(p.id, p.name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium w-full"
        style={{
          borderColor: 'var(--card-border)',
          background: 'var(--nav-active-bg)',
          color: 'var(--nav-active-text)',
        }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--role-dot)' }} />
        <span className="flex-1 text-left truncate">
          {loading ? 'Loading...' : current ? current.name : `Select ${label}`}
        </span>
        {current && (
          <Badge variant="outline" size="sm">{current.condition?.replace('_', ' ') || 'N/A'}</Badge>
        )}
        <svg className={`w-4 h-4 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-1 z-40 rounded-lg border overflow-hidden max-h-64 overflow-y-auto"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card, white)' }}
          >
            {patientList.length === 0 ? (
              <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
                No {userRole === 'clinician' ? 'patients' : 'family members'} found
              </p>
            ) : (
              patientList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:opacity-80 ${
                    viewingPatientId === p.id ? 'font-semibold' : ''
                  }`}
                  style={{
                    background: viewingPatientId === p.id ? 'var(--nav-active-bg)' : 'transparent',
                    color: viewingPatientId === p.id ? 'var(--nav-active-text)' : 'var(--foreground)',
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'var(--primary)' }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{p.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                      Age {p.age} · {p.condition?.replace('_', ' ')}
                    </p>
                  </div>
                  {viewingPatientId === p.id && (
                    <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
