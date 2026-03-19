'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ className = '', variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-slate-200 dark:bg-slate-700/50 rounded';
  const variantClass = variant === 'circular' ? 'rounded-full' : variant === 'rectangular' ? 'rounded-lg' : 'rounded';

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClass} ${variantClass} h-4`}
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return <div className={`${baseClass} ${variantClass} ${className}`} style={style} />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`carehive-card p-5 ${className}`}>
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="carehive-card p-4 flex items-center gap-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
