'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type EventItem = {
  id: number;
  title: string;
  category: string;
  created_at: string;
};

export function RealtimeEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadEvents = async () => {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id,title,category,created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setEvents((data as EventItem[]) ?? []);
    };

    loadEvents();

    const channel = supabase
      .channel('events-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        loadEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const chartData = useMemo(() => {
    const counts = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.category] = (acc[event.category] ?? 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(counts);

    return {
      labels,
      datasets: [
        {
          label: 'Events by category',
          data: labels.map((label) => counts[label]),
          backgroundColor: 'rgba(14, 116, 144, 0.78)',
          borderColor: 'rgba(14, 116, 144, 1)',
          borderWidth: 1,
          borderRadius: 8
        }
      ]
    };
  }, [events]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Realtime Feed</CardTitle>
          <CardDescription>Synced from Supabase Postgres with realtime updates.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-md border p-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.category}</p>
              </li>
            ))}
            {events.length === 0 && <li className="text-sm text-muted-foreground">No events yet.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Chart</CardTitle>
          <CardDescription>Rendered using Chart.js</CardDescription>
        </CardHeader>
        <CardContent>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
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
                  ticks: { color: '#475569' }
                }
              }
            }}
            className="h-[320px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}
