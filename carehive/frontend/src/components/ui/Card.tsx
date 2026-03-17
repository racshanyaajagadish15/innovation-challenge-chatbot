'use client';

import { forwardRef } from 'react';

export const Card = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }
>(({ className = '', hover, ...props }, ref) => (
  <div
    ref={ref}
    className={`carehive-card p-5 transition-shadow ${hover ? 'carehive-card-hover' : ''} ${className}`}
    {...props}
  />
));

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`mb-3 ${className}`} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg font-semibold text-slate-800 dark:text-slate-100 ${className}`}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`text-slate-600 dark:text-slate-300 ${className}`} {...props} />
  )
);
CardContent.displayName = 'CardContent';
