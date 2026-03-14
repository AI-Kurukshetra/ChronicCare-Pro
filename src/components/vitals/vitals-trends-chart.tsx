'use client';

import { useMemo } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtcDate } from '@/lib/date-format';
import { parseVitalNumericValue, type VitalReading, type VitalType, vitalLabels } from '@/lib/vitals';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const vitalColors: Record<VitalType, string> = {
  bp: '#1d4ed8',
  glucose: '#b91c1c',
  weight: '#0f766e',
  heart_rate: '#7c3aed',
  oxygen: '#0ea5e9'
};

export function VitalsTrendsChart({ vitals, title = 'Vital Trends' }: { vitals: VitalReading[]; title?: string }) {
  const chartConfig = useMemo(() => {
    const sorted = [...vitals]
      .map((item) => ({
        ...item,
        numeric: parseVitalNumericValue(item.type, item.value)
      }))
      .filter((item) => item.numeric !== null)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const labels = sorted.map((item) => formatUtcDate(item.timestamp));
    const datasets = (['bp', 'glucose', 'weight', 'heart_rate', 'oxygen'] as VitalType[]).reduce<
      Array<{
        label: string;
        data: Array<number | null>;
        borderColor: string;
        backgroundColor: string;
        tension: number;
        fill: boolean;
        pointRadius: number;
        pointHoverRadius: number;
        pointBackgroundColor: string;
      }>
    >((acc, type) => {
        const points = sorted.map((item) => (item.type === type ? item.numeric : null));
        const hasAnyPoint = points.some((point) => point !== null);
        if (!hasAnyPoint) {
          return acc;
        }

        acc.push({
          label: vitalLabels[type],
          data: points,
          borderColor: vitalColors[type],
          backgroundColor: `${vitalColors[type]}33`,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: vitalColors[type]
        });

        return acc;
      }, []);

    return {
      labels,
      datasets
    };
  }, [vitals]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Chart.js visualization across vital types.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          {chartConfig.datasets.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Add numeric vitals to see trends.</div>
          ) : (
            <Line
              data={chartConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0'
                  }
                },
                scales: {
                  y: {
                    grid: { color: 'rgba(148, 163, 184, 0.2)' },
                    ticks: { color: '#475569' }
                  },
                  x: {
                    grid: { color: 'rgba(148, 163, 184, 0.12)' },
                    ticks: { color: '#475569', maxTicksLimit: 8 }
                  }
                }
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
