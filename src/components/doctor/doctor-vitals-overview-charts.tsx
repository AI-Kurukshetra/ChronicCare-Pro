'use client';

import { useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  RadialLinearScale,
  Tooltip
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseVitalNumericValue, type VitalType } from '@/lib/vitals';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, ArcElement, Tooltip, Legend);

type VitalPoint = {
  patient_id: string;
  type: VitalType;
  value: string;
  timestamp: string;
};

type RangeMode = 'daily' | 'weekly' | 'monthly';

const rangeLabel: Record<RangeMode, string> = {
  daily: 'Last 24 Hours',
  weekly: 'Last 7 Days',
  monthly: 'Last 30 Days'
};

export function DoctorVitalsOverviewCharts({
  vitals,
  riskDistribution
}: {
  vitals: VitalPoint[];
  riskDistribution: { stable: number; warning: number; critical: number };
}) {
  const [range, setRange] = useState<RangeMode>('weekly');

  const filteredVitals = useMemo(() => {
    const now = Date.now();
    const threshold =
      range === 'daily'
        ? now - 24 * 60 * 60 * 1000
        : range === 'weekly'
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000;

    return vitals
      .filter((item) => new Date(item.timestamp).getTime() >= threshold)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [vitals, range]);

  const chartGroups = useMemo(() => {
    function build(type: VitalType) {
      const pointsByDay = filteredVitals
        .filter((item) => item.type === type)
        .map((item) => ({
          x: new Date(item.timestamp).toISOString().slice(0, 10),
          y: parseVitalNumericValue(type, item.value)
        }))
        .filter((item) => item.y !== null) as Array<{ x: string; y: number }>;

      const daily = new Map<string, { total: number; count: number }>();
      for (const point of pointsByDay) {
        const current = daily.get(point.x) ?? { total: 0, count: 0 };
        daily.set(point.x, { total: current.total + point.y, count: current.count + 1 });
      }

      const labels = [...daily.keys()].sort().map((value) => new Date(value).toLocaleDateString());
      const values = [...daily.entries()]
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([, value]) => Number((value.total / value.count).toFixed(2)));
      return { labels, values };
    }

    return {
      bp: build('bp'),
      glucose: build('glucose'),
      heartRate: build('heart_rate')
    };
  }, [filteredVitals]);

  return (
    <Card className="border-blue-100/70 bg-blue-50/60 shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Vitals Trend Analytics</CardTitle>
          <CardDescription>Blood pressure, glucose, and heart rate trends for quick clinical review.</CardDescription>
        </div>
        <div className="inline-flex rounded-md border border-blue-200 bg-white/90 p-1">
          {(['daily', 'weekly', 'monthly'] as RangeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`rounded px-3 py-1 text-xs font-medium ${range === mode ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setRange(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">Showing: {rangeLabel[range]}</p>
        <div className="grid gap-4 xl:grid-cols-4">
          <ChartBlock title="Blood Pressure Trends" color="#2563EB" labels={chartGroups.bp.labels} data={chartGroups.bp.values} />
          <ChartBlock title="Glucose Trends" color="#DC2626" labels={chartGroups.glucose.labels} data={chartGroups.glucose.values} />
          <ChartBlock title="Heart Rate Trends" color="#F59E0B" labels={chartGroups.heartRate.labels} data={chartGroups.heartRate.values} />
          <RiskDistributionBlock distribution={riskDistribution} />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartBlock({ title, color, labels, data }: { title: string; color: string; labels: string[]; data: number[] }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white/90 p-3">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="h-[220px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data in selected range.</div>
        ) : (
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: title,
                  data,
                  backgroundColor: `${color}CC`,
                  borderRadius: 8,
                  maxBarThickness: 18
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#64748b', maxTicksLimit: 6 }, grid: { display: false } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.2)' } }
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function RiskDistributionBlock({
  distribution
}: {
  distribution: { stable: number; warning: number; critical: number };
}) {
  const total = distribution.stable + distribution.warning + distribution.critical;

  return (
    <div className="rounded-xl border border-blue-100 bg-white/90 p-3">
      <p className="mb-2 text-sm font-medium">Patient Health Risk Distribution</p>
      <div className="h-[220px]">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No patient risk data available.</div>
        ) : (
          <Doughnut
            data={{
              labels: ['Stable', 'Warning', 'Critical'],
              datasets: [
                {
                  label: 'Patients',
                  data: [distribution.stable, distribution.warning, distribution.critical],
                  backgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
                  borderColor: '#ffffff',
                  borderWidth: 2,
                  hoverOffset: 4
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: {
                legend: { display: false }
              }
            }}
          />
        )}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-700"><span className="h-2 w-2 rounded-full bg-green-600" />Stable</span>
        <span className="inline-flex items-center gap-1 text-slate-700"><span className="h-2 w-2 rounded-full bg-amber-500" />Warning</span>
        <span className="inline-flex items-center gap-1 text-slate-700"><span className="h-2 w-2 rounded-full bg-red-600" />Critical</span>
      </div>
    </div>
  );
}
