'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { signOut } from '@/lib/auth';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/log', label: 'Health log' },
  { href: '/history', label: 'History' },
  { href: '/medications', label: 'Medications' },
  { href: '/ehr', label: 'EHR import' },
  { href: '/timeline', label: 'Care Timeline' },
  { href: '/check-in', label: 'Video check-in' },
  { href: '/chat', label: 'Chat' },
  { href: '/clinician', label: 'Clinician View' },
  { href: '/agents', label: 'Agent Activity' },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { userName } = useStore();

  async function handleSignOut() {
    await signOut(router);
  }

  return (
    <nav className="w-56 shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur flex flex-col dark:border-slate-800 dark:bg-slate-950/60">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="font-semibold text-teal-700 text-lg tracking-tight dark:text-teal-300">
          CAREHIVE
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Chronic Care Assistant</p>
      </div>
      <ul className="p-3 flex-1">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {userName && (
          <p className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 truncate" title={userName}>
            {userName}
          </p>
        )}
        <Link
          href="/profile"
          className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Profile
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
      <div className="p-3 border-t border-slate-100 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Not medical advice.
      </div>
    </nav>
  );
}
