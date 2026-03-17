'use client';

/**
 * Recharts wrappers to avoid React 19 / recharts type conflicts
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface ChartDataPoint {
  day: string;
  steps: number;
  mood: number;
  meds: number;
}

export function StepsMoodChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
        <XAxis dataKey="day" />
        <YAxis yAxisId="steps" />
        <YAxis yAxisId="mood" orientation="right" domain={[0, 10]} />
        <Tooltip />
        <Area
          yAxisId="steps"
          type="monotone"
          dataKey="steps"
          stroke="#0d9488"
          fill="#0d9488"
          fillOpacity={0.2}
          name="Steps"
        />
        <Line
          yAxisId="mood"
          type="monotone"
          dataKey="mood"
          stroke="#06b6d4"
          name="Mood"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AdherenceChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
        <XAxis dataKey="day" />
        <YAxis domain={[0, 1]} tickFormatter={(v: number) => (v ? 'Yes' : 'No')} />
        <Tooltip formatter={(v: number) => (v ? 'Taken' : 'Missed')} />
        <Line
          type="monotone"
          dataKey="meds"
          stroke="#0d9488"
          name="Taken"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
