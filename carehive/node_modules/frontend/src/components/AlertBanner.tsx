'use client';

import { Card, CardContent } from '@/components/ui/Card';

type Severity = 'info' | 'warning' | 'critical';

const styles: Record<Severity, string> = {
  info: 'border-l-4 border-l-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/30 dark:border-l-cyan-400',
  warning: 'border-l-4 border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/25 dark:border-l-amber-400',
  critical: 'border-l-4 border-l-red-500 bg-red-50/80 dark:bg-red-950/25 dark:border-l-red-400',
};

interface AlertBannerProps {
  title: string;
  description?: string;
  severity?: Severity;
}

export function AlertBanner({ title, description, severity = 'info' }: AlertBannerProps) {
  return (
    <Card className={styles[severity]}>
      <CardContent className="py-3">
        <p className="font-medium text-slate-800 dark:text-slate-100">{title}</p>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
