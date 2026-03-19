/* React 19 + Recharts compatibility */
declare module 'recharts' {
  import type { ComponentType } from 'react';
  export const LineChart: ComponentType<Record<string, unknown>>;
  export const Line: ComponentType<Record<string, unknown>>;
  export const XAxis: ComponentType<Record<string, unknown>>;
  export const YAxis: ComponentType<Record<string, unknown>>;
  export const CartesianGrid: ComponentType<Record<string, unknown>>;
  export const Tooltip: ComponentType<Record<string, unknown>>;
  export const ResponsiveContainer: ComponentType<Record<string, unknown>>;
  export const Area: ComponentType<Record<string, unknown>>;
  export const AreaChart: ComponentType<Record<string, unknown>>;
}
