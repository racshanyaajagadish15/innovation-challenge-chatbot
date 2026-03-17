'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, trend, icon }: MetricCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-300'
      : trend === 'down'
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-slate-500 dark:text-slate-400';
  return (
    <Card hover className="min-w-[140px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{value}</p>
        {subtitle && <p className={`text-xs mt-1 ${trendColor} dark:opacity-90`}>{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
