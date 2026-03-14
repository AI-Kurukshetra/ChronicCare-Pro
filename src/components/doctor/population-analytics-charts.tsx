'use client';

import { useMemo } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type PopulationAnalyticsChartsProps = {
  averageGlucoseByDay: Array<{ label: string; value: number }>;
  highRiskPatients: Array<{ label: string; value: number }>;
  engagement: {
    active: number;
    inactive: number;
  };
};

export function PopulationAnalyticsCharts({
  averageGlucoseByDay,
  highRiskPatients,
  engagement
}: PopulationAnalyticsChartsProps) {
  const glucoseChartData = useMemo(
    () => ({
      labels: averageGlucoseByDay.map((item) => item.label),
      datasets: [
        {
          label: 'Average Glucose (mg/dL)',
          data: averageGlucoseByDay.map((item) => item.value),
          backgroundColor: 'rgba(14, 116, 144, 0.85)',
          borderRadius: 8
        }
      ]
    }),
    [averageGlucoseByDay]
  );

  const highRiskChartData = useMemo(
    () => ({
      labels: highRiskPatients.map((item) => item.label),
      datasets: [
        {
          label: 'Risk Score',
          data: highRiskPatients.map((item) => item.value),
          backgroundColor: 'rgba(185, 28, 28, 0.85)',
          borderRadius: 8
        }
      ]
    }),
    [highRiskPatients]
  );

  const engagementData = useMemo(
    () => ({
      labels: ['Active (7d)', 'Inactive'],
      datasets: [
        {
          label: 'Patients',
          data: [engagement.active, engagement.inactive],
          backgroundColor: ['rgba(5, 150, 105, 0.88)', 'rgba(148, 163, 184, 0.86)']
        }
      ]
    }),
    [engagement]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Average Glucose</CardTitle>
          <CardDescription>Daily average across assigned patient vitals.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {averageGlucoseByDay.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No glucose vitals available yet.</div>
            ) : (
              <Bar
                data={glucoseChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { color: '#475569' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
                    x: { ticks: { color: '#475569', maxTicksLimit: 7 }, grid: { color: 'rgba(148, 163, 184, 0.12)' } }
                  }
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>High Risk Patients</CardTitle>
          <CardDescription>Risk derived from open alerts and threshold breaches.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {highRiskPatients.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No high risk patient data available.</div>
            ) : (
              <Bar
                data={highRiskChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: '#475569' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
                    x: { ticks: { color: '#475569', maxTicksLimit: 7 }, grid: { color: 'rgba(148, 163, 184, 0.12)' } }
                  }
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement</CardTitle>
          <CardDescription>Patients with at least one vital in the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {engagement.active + engagement.inactive === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No assigned patients yet.</div>
            ) : (
              <Doughnut
                data={engagementData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: { legend: { position: 'bottom' } }
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
