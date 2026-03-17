'use client';

import { forwardRef } from 'react';

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50';
  const variants = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    ghost:
      'hover:bg-slate-100 text-slate-700 focus:ring-slate-300 dark:hover:bg-slate-900/60 dark:text-slate-200 dark:focus:ring-slate-700',
    outline:
      'border border-slate-300 hover:bg-slate-50 focus:ring-slate-400 dark:border-slate-700 dark:hover:bg-slate-900/40',
  };
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
});
Button.displayName = 'Button';
