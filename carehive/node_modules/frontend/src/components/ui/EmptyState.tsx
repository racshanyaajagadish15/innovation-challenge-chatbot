'use client';

import { Card, CardContent } from './Card';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="py-12 text-center">
        {icon && <div className="mx-auto mb-4 text-slate-300 dark:text-slate-600">{icon}</div>}
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{description}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
}
