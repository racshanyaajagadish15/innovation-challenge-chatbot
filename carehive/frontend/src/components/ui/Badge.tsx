'use client';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  info: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800',
  outline: 'bg-transparent text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-600',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '', dot }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${VARIANT_STYLES[variant]} ${sizeClass} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          variant === 'success' ? 'bg-emerald-500' :
          variant === 'warning' ? 'bg-amber-500' :
          variant === 'danger' ? 'bg-red-500' :
          variant === 'info' ? 'bg-cyan-500' :
          'bg-slate-500'
        }`} />
      )}
      {children}
    </span>
  );
}
