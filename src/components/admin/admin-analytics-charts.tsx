'use client';

import { useMemo } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type AdminAnalyticsChartsProps = {
  signupsByDay: Array<{ label: string; value: number }>;
  roleDistribution: { patient: number; doctor: number; admin: number };
  alertSeverity: { low: number; medium: number; high: number; critical: number };
};

export function AdminAnalyticsCharts({
  signupsByDay,
  roleDistribution,
  alertSeverity
}: AdminAnalyticsChartsProps) {
  const signupsData = useMemo(
    () => ({
      labels: signupsByDay.map((item) => item.label),
      datasets: [
        {
          label: 'New Users',
          data: signupsByDay.map((item) => item.value),
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          borderRadius: 8
        }
      ]
    }),
    [signupsByDay]
  );

  const rolesData = useMemo(
    () => ({
      labels: ['Patient', 'Doctor', 'Admin'],
      datasets: [
        {
          label: 'Users',
          data: [roleDistribution.patient, roleDistribution.doctor, roleDistribution.admin],
          backgroundColor: ['rgba(37,99,235,0.85)', 'rgba(5,150,105,0.85)', 'rgba(249,115,22,0.85)']
        }
      ]
    }),
    [roleDistribution]
  );

  const severityData = useMemo(
    () => ({
      labels: ['Low', 'Medium', 'High', 'Critical'],
      datasets: [
        {
          label: 'Alerts',
          data: [alertSeverity.low, alertSeverity.medium, alertSeverity.high, alertSeverity.critical],
          backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(249,115,22,0.85)', 'rgba(245,158,11,0.85)', 'rgba(220,38,38,0.9)'],
          borderRadius: 8
        }
      ]
    }),
    [alertSeverity]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>User Growth (7 Days)</CardTitle>
          <CardDescription>Daily signups across all roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Bar
              data={signupsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { color: '#475569' }, grid: { color: 'rgba(148,163,184,0.2)' } },
                  x: { ticks: { color: '#475569', maxTicksLimit: 7 }, grid: { color: 'rgba(148,163,184,0.12)' } }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Distribution</CardTitle>
          <CardDescription>Current platform user composition.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Doughnut
              data={rolesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Severity Mix</CardTitle>
          <CardDescription>Open and resolved alerts by severity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Bar
              data={severityData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { color: '#475569' }, grid: { color: 'rgba(148,163,184,0.2)' } },
                  x: { ticks: { color: '#475569', maxTicksLimit: 6 }, grid: { color: 'rgba(148,163,184,0.12)' } }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
