'use client';

import { useEffect, useState } from 'react';
import { useStore, type PatientSummary } from '@/store/useStore';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { AddPatientModal } from '@/components/AddPatientModal';

export function PatientSelector() {
  const { userRole, patientList, setPatientList, viewingPatientId, setViewingPatient } = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isMultiPatientRole = userRole === 'clinician' || userRole === 'family';
  const label = userRole === 'clinician' ? 'Patient' : 'Family Member';

  function loadPatients() {
    setLoading(true);
    api.getLinkedPatients()
      .then((res) => {
        const list = res?.patients ?? [];
        setPatientList(list);
        if (list.length > 0 && !viewingPatientId) {
          setViewingPatient(list[0].id, list[0].name);
        }
        if (viewingPatientId && !list.find((p) => p.id === viewingPatientId)) {
          setViewingPatient(list[0]?.id ?? null, list[0]?.name ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isMultiPatientRole) return;
    loadPatients();
  }, [isMultiPatientRole]);

  const current = patientList.find((p) => p.id === viewingPatientId);

  function handleSelect(p: PatientSummary) {
    setViewingPatient(p.id, p.name);
    setOpen(false);
  }

  function handleAdded(patient: PatientSummary) {
    const updated = [...patientList, patient];
    setPatientList(updated);
    setViewingPatient(patient.id, patient.name);
  }

  async function handleRemove(e: React.MouseEvent, patientId: string) {
    e.stopPropagation();
    setRemovingId(patientId);
    try {
      await api.removeRelationship(patientId);
      const updated = patientList.filter((p) => p.id !== patientId);
      setPatientList(updated);
      if (viewingPatientId === patientId) {
        setViewingPatient(updated[0]?.id ?? null, updated[0]?.name ?? null);
      }
    } catch {
      // silent
    } finally {
      setRemovingId(null);
    }
  }

  if (!isMultiPatientRole) return null;

  return (
    <>
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
          <svg
            className={`w-4 h-4 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div
              className="absolute left-0 right-0 top-full mt-1 z-40 rounded-lg border overflow-hidden shadow-lg"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card, white)' }}
            >
              {/* Add button at the top */}
              <button
                type="button"
                onClick={() => { setOpen(false); setAddModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--card-border)',
                  color: 'var(--primary)',
                  background: 'var(--primary-light)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add {label}
              </button>

              <div className="max-h-56 overflow-y-auto">
                {patientList.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
                    No {userRole === 'clinician' ? 'patients' : 'family members'} added yet
                  </p>
                ) : (
                  patientList.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 pr-2 border-b last:border-b-0"
                      style={{ borderColor: 'var(--card-border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(p)}
                        className="flex items-center gap-3 flex-1 px-3 py-2.5 text-left text-sm transition-colors hover:opacity-80"
                        style={{
                          background: viewingPatientId === p.id ? 'var(--nav-active-bg)' : 'transparent',
                          color: viewingPatientId === p.id ? 'var(--nav-active-text)' : 'var(--foreground)',
                          fontWeight: viewingPatientId === p.id ? 600 : 400,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
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
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemove(e, p.id)}
                        disabled={removingId === p.id}
                        title={`Remove ${p.name}`}
                        className="p-1.5 rounded-md transition-opacity hover:opacity-70 disabled:opacity-30 shrink-0"
                        style={{ color: 'var(--muted)' }}
                      >
                        {removingId === p.id ? (
                          <div className="w-4 h-4 border border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--muted)' }} />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <AddPatientModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={handleAdded}
      />
    </>
  );
}
