import { redirect } from 'next/navigation';
import { AlertTriangle, Gauge, UsersRound } from 'lucide-react';

import { PopulationAnalyticsCharts } from '@/components/doctor/population-analytics-charts';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDate } from '@/lib/date-format';
import { createClient } from '@/lib/supabase/server';
import { parseVitalNumericValue, type VitalType } from '@/lib/vitals';

type VitalRow = {
  patient_id: string;
  type: VitalType;
  value: string;
  timestamp: string;
};

type AlertRow = {
  patient_id: string;
  status: 'open' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
};

export default async function DoctorAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (getUserRole(user) !== 'doctor') {
    redirect('/login');
  }

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id,user_id,full_name')
    .eq('doctor_id', user.id);

  if (patientsError) {
    return <p className="text-sm text-red-600">{patientsError.message}</p>;
  }

  const safePatients = patients ?? [];
  const totalPatients = safePatients.length;
  const patientUserIds = safePatients.map((p) => p.user_id).filter(Boolean) as string[];
  const patientNameByUserId = Object.fromEntries(
    safePatients.filter((p) => p.user_id).map((p) => [p.user_id as string, p.full_name])
  ) as Record<string, string>;

  let vitals: VitalRow[] = [];
  let alerts: AlertRow[] = [];

  if (patientUserIds.length > 0) {
    const [vitalsResponse, alertsResponse] = await Promise.all([
      supabase
        .from('vitals')
        .select('patient_id,type,value,timestamp')
        .in('patient_id', patientUserIds)
        .order('timestamp', { ascending: false })
        .limit(3000),
      supabase
        .from('alerts')
        .select('patient_id,status,severity')
        .in('patient_id', patientUserIds)
        .order('created_at', { ascending: false })
        .limit(3000)
    ]);

    vitals = (vitalsResponse.data as VitalRow[] | null) ?? [];
    alerts = (alertsResponse.data as AlertRow[] | null) ?? [];
  }

  const openCriticalAlerts = alerts.filter((item) => item.status === 'open' && item.severity === 'critical').length;

  const averages = (() => {
    const glucose = vitals
      .filter((item) => item.type === 'glucose')
      .map((item) => parseVitalNumericValue('glucose', item.value))
      .filter((value): value is number => value !== null);
    const bp = vitals
      .filter((item) => item.type === 'bp')
      .map((item) => parseVitalNumericValue('bp', item.value))
      .filter((value): value is number => value !== null);
    const oxygen = vitals
      .filter((item) => item.type === 'oxygen')
      .map((item) => parseVitalNumericValue('oxygen', item.value))
      .filter((value): value is number => value !== null);

    const avg = (values: number[]) => (values.length > 0 ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 0);
    return {
      glucose: avg(glucose),
      bpSystolic: avg(bp),
      oxygen: avg(oxygen)
    };
  })();

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const engagedSet = new Set(
    vitals.filter((item) => new Date(item.timestamp).getTime() >= sevenDaysAgo).map((item) => item.patient_id)
  );
  const engagement = {
    active: engagedSet.size,
    inactive: Math.max(0, totalPatients - engagedSet.size)
  };

  const glucoseByDayMap = new Map<string, { total: number; count: number }>();
  vitals
    .filter((item) => item.type === 'glucose')
    .forEach((item) => {
      const numeric = parseVitalNumericValue('glucose', item.value);
      if (numeric === null) {
        return;
      }
      const key = formatUtcDate(item.timestamp);
      const current = glucoseByDayMap.get(key) ?? { total: 0, count: 0 };
      glucoseByDayMap.set(key, { total: current.total + numeric, count: current.count + 1 });
    });

  const averageGlucoseByDay = [...glucoseByDayMap.entries()]
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-7)
    .map(([label, bucket]) => ({ label, value: Math.round(bucket.total / bucket.count) }));

  const riskBuckets = new Map<string, number>();
  for (const alert of alerts) {
    if (alert.status === 'open') {
      riskBuckets.set(alert.patient_id, (riskBuckets.get(alert.patient_id) ?? 0) + 25);
    }
  }

  for (const vital of vitals) {
    const value = parseVitalNumericValue(vital.type, vital.value);
    if (value === null) continue;

    if (vital.type === 'glucose' && value > 200) {
      riskBuckets.set(vital.patient_id, (riskBuckets.get(vital.patient_id) ?? 0) + 12);
    }
    if (vital.type === 'bp' && value > 140) {
      riskBuckets.set(vital.patient_id, (riskBuckets.get(vital.patient_id) ?? 0) + 10);
    }
    if (vital.type === 'oxygen' && value < 90) {
      riskBuckets.set(vital.patient_id, (riskBuckets.get(vital.patient_id) ?? 0) + 14);
    }
  }

  const highRiskPatients = [...riskBuckets.entries()]
    .map(([patientId, score]) => ({
      patientId,
      score: Math.min(100, score)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => ({
      label: patientNameByUserId[item.patientId] ?? `${item.patientId.slice(0, 8)}...`,
      value: item.score
    }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-r from-slate-950 via-blue-900 to-cyan-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Doctor Analytics</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Population Health Dashboard</h1>
            <p className="max-w-2xl text-sm text-cyan-100">
              Track population trends, high-risk groups, and engagement across your assigned patients.
            </p>
            <p className="text-xs text-cyan-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-blue-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Patients</p>
              <p className="text-2xl font-semibold">{totalPatients}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <UsersRound className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Critical Alerts</p>
              <p className="text-2xl font-semibold">{openCriticalAlerts}</p>
            </div>
            <div className="rounded-full bg-red-50 p-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-cyan-100/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Average Vitals</p>
            <p className="mt-2 text-sm">Glucose: <span className="font-semibold">{averages.glucose} mg/dL</span></p>
            <p className="text-sm">Systolic BP: <span className="font-semibold">{averages.bpSystolic} mmHg</span></p>
            <p className="text-sm">Oxygen: <span className="font-semibold">{averages.oxygen}%</span></p>
          </CardContent>
        </Card>
        <Card className="border-orange-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">High Risk Patients</p>
              <p className="text-2xl font-semibold">{highRiskPatients.length}</p>
            </div>
            <div className="rounded-full bg-orange-50 p-2">
              <Gauge className="h-5 w-5 text-orange-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <PopulationAnalyticsCharts
        averageGlucoseByDay={averageGlucoseByDay}
        highRiskPatients={highRiskPatients}
        engagement={engagement}
      />

      <Card className="border-blue-100/70 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Engagement is calculated using vital submissions in the last 7 days. Risk score is a derived indicator from
            open alerts and threshold breaches.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
