import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarCheck, ChevronDown, Siren, Stethoscope, TriangleAlert, TrendingUp, UserRound } from 'lucide-react';

import { AlertsPanel } from '@/components/doctor/alerts-panel';
import { DoctorVitalsOverviewCharts } from '@/components/doctor/doctor-vitals-overview-charts';
import { EmergencyRealtimeAlert } from '@/components/doctor/emergency-realtime-alert';
import { PatientMonitoringTable } from '@/components/doctor/patient-monitoring-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { updateEmergencyStatus } from '@/app/doctor/dashboard/actions';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';
import { type VitalType } from '@/lib/vitals';
import { formatUtcDateTime } from '@/lib/date-format';

export default async function DoctorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = getUserRole(user);
  if (role !== 'doctor') {
    redirect('/login');
  }

  const { data: patients, error } = await supabase
    .from('patients')
    .select('id,user_id,full_name,email,age,disease,created_at')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false });
  const safePatients = patients ?? [];
  const patientUserIds = safePatients.map((patient) => patient.user_id).filter(Boolean) as string[];

  const [{ data: alerts, error: alertsError }, { data: appointments, error: appointmentsError }, { data: vitalsData, error: vitalsError }, { data: emergencies, error: emergenciesError }] = await Promise.all([
    patientUserIds.length
      ? supabase
          .from('alerts')
          .select('id,patient_id,type,severity,message,created_at,status')
          .in('patient_id', patientUserIds)
          .order('created_at', { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('appointments')
      .select('id,patient_id,date,type,status')
      .eq('doctor_id', user.id)
      .order('date', { ascending: true })
      .limit(100),
    patientUserIds.length
      ? supabase
          .from('vitals')
          .select('patient_id,type,value,timestamp')
          .in('patient_id', patientUserIds)
          .order('timestamp', { ascending: false })
          .limit(2000)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('emergency_events')
      .select('id,patient_id,reason,status,created_at')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  const safeAlerts = alerts ?? [];
  const safeAppointments = appointments ?? [];
  const safeVitals = (vitalsData as Array<{
    patient_id: string;
    type: VitalType;
    value: string;
    timestamp: string;
  }> | null) ?? [];
  const safeEmergencies = (emergencies as Array<{
    id: number;
    patient_id: string;
    reason: string;
    status: 'open' | 'acknowledged' | 'resolved';
    created_at: string;
  }> | null) ?? [];
  const patientNameByUserId = Object.fromEntries(
    safePatients.filter((patient) => patient.user_id).map((patient) => [patient.user_id as string, patient.full_name])
  ) as Record<string, string>;
  const patientIdByUserId = Object.fromEntries(
    safePatients.filter((patient) => patient.user_id).map((patient) => [patient.user_id as string, patient.id])
  ) as Record<string, number>;
  const patientRouteByUserId = Object.fromEntries(
    safePatients.filter((patient) => patient.user_id).map((patient) => [patient.user_id as string, `/doctor/patients/${patient.id}`])
  ) as Record<string, string>;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const recentPatients = safePatients.filter((item) => {
    const created = new Date(item.created_at).getTime();
    return created >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;
  const currentAlerts = safeAlerts.filter((alert) => alert.status === 'open').length;
  const previousAlerts = safeAlerts.filter((alert) => {
    const created = new Date(alert.created_at).getTime();
    return alert.status === 'resolved' && created >= Date.now() - 14 * 24 * 60 * 60 * 1000;
  }).length;
  const highRiskToday = safeAlerts.filter((alert) => {
    const createdAt = new Date(alert.created_at).getTime();
    return alert.status === 'open' && (alert.severity === 'critical' || alert.severity === 'high') && createdAt >= startOfToday.getTime();
  }).length;
  const todaysAppointments = safeAppointments.filter((item) => {
    const time = new Date(item.date).getTime();
    return time >= startOfToday.getTime() && time < endOfToday.getTime() && item.status !== 'rejected';
  }).length;

  const stats = {
    total: safePatients.length,
    openAlerts: safeAlerts.filter((alert) => alert.status === 'open').length,
    todayAppointments: todaysAppointments,
    openEmergencies: safeEmergencies.filter((item) => item.status === 'open').length,
    highRiskPatients: new Set(
      safeAlerts
        .filter((alert) => alert.status === 'open' && (alert.severity === 'critical' || alert.severity === 'high'))
        .map((alert) => alert.patient_id)
    ).size
  };

  const latestVitalByPatientId = new Map<string, { value: string; type: string; timestamp: string }>();
  for (const item of safeVitals) {
    const existing = latestVitalByPatientId.get(item.patient_id);
    if (!existing || new Date(item.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      latestVitalByPatientId.set(item.patient_id, {
        value: item.value,
        type: item.type,
        timestamp: item.timestamp
      });
    }
  }

  const monitoringRows = safePatients.map((patient) => {
    const userId = patient.user_id ?? '';
    const latest = userId ? latestVitalByPatientId.get(userId) : null;
    const patientAlerts = safeAlerts.filter((alert) => alert.patient_id === userId && alert.status === 'open');
    const riskLevel: 'critical' | 'warning' | 'normal' = patientAlerts.some(
      (alert) => alert.severity === 'critical'
    )
      ? 'critical'
      : patientAlerts.length > 0
        ? 'warning'
        : 'normal';

    return {
      id: patient.id,
      patientUserId: userId || null,
      full_name: patient.full_name,
      disease: patient.disease,
      latestVital: latest ? `${latest.type.toUpperCase()}: ${latest.value}` : 'No vitals',
      riskScore: Math.min(
        100,
        patientAlerts.reduce((total, alert) => total + (alert.severity === 'critical' ? 38 : alert.severity === 'high' ? 26 : 14), 0) +
          (latest && latest.type === 'glucose' && Number(latest.value) > 200 ? 15 : 0) +
          (latest && latest.type === 'oxygen' && Number(latest.value) < 90 ? 20 : 0)
      ),
      riskLevel,
      statusIndicator: (riskLevel === 'critical' ? 'critical' : riskLevel === 'warning' ? 'warning' : 'stable') as
        | 'stable'
        | 'warning'
        | 'critical',
      lastUpdate: latest?.timestamp ?? null
    };
  });

  const riskDistribution = monitoringRows.reduce(
    (acc, row) => {
      if (row.statusIndicator === 'critical') acc.critical += 1;
      else if (row.statusIndicator === 'warning') acc.warning += 1;
      else acc.stable += 1;
      return acc;
    },
    { stable: 0, warning: 0, critical: 0 }
  );

  const feedItems = [
    ...safeVitals.slice(0, 4).map((item) => ({
      key: `vital-${item.patient_id}-${item.timestamp}`,
      text: `${patientNameByUserId[item.patient_id] ?? 'Patient'} logged ${item.type.toUpperCase()} (${item.value}).`,
      when: item.timestamp
    })),
    ...safeAlerts
      .filter((item) => item.status === 'open')
      .slice(0, 3)
      .map((item) => ({
        key: `alert-${item.id}`,
        text: `AI detected abnormal trend for ${patientNameByUserId[item.patient_id] ?? 'patient'} (${item.type.toUpperCase()}).`,
        when: item.created_at
      })),
    ...safeAppointments.slice(0, 3).map((item) => ({
      key: `appointment-${item.id}`,
      text: `Doctor message sent / appointment ${item.status} for ${patientNameByUserId[item.patient_id] ?? 'patient'}.`,
      when: item.date
    }))
  ]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6 rounded-3xl border border-cyan-100/60 bg-gradient-to-b from-cyan-50 via-blue-50 to-slate-100 p-4 md:p-6">
      <EmergencyRealtimeAlert doctorId={user.id} />
      <section className="rounded-3xl border border-blue-800/70 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Doctor Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Doctor Monitoring Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-100">
              Monitor chronic patient populations, identify high-risk cases quickly, and intervene early.
            </p>
            <p className="mt-1 text-xs text-blue-200">{APP_TITLE}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-blue-700 bg-blue-900/70 px-3 py-2 text-xs text-blue-100">
            Today
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-blue-100/70 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Patients</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" /> +{recentPatients} this week
              </p>
            </div>
            <UserRound className="h-5 w-5 text-slate-700" />
          </CardContent>
        </Card>
        <Card className="border-red-100/70 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Alerts</p>
              <p className="text-2xl font-semibold">{stats.openAlerts}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-red-700">
                <TrendingUp className="h-3.5 w-3.5" />
                {currentAlerts >= previousAlerts ? '+' : ''}
                {currentAlerts - previousAlerts} vs previous window
              </p>
            </div>
            <TriangleAlert className="h-5 w-5 text-red-600" />
          </CardContent>
        </Card>
        <Card className="border-orange-100/70 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">High Risk Patients</p>
              <p className="text-2xl font-semibold">{stats.highRiskPatients}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-orange-700">
                <TrendingUp className="h-3.5 w-3.5" /> {highRiskToday} new today
              </p>
            </div>
            <Stethoscope className="h-5 w-5 text-orange-600" />
          </CardContent>
        </Card>
        <Card className="border-cyan-100/70 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Today&apos;s Appointments</p>
              <p className="text-2xl font-semibold">{stats.todayAppointments}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-700">
                <TrendingUp className="h-3.5 w-3.5" /> {safeAppointments.filter((a) => a.status === 'pending').length} pending
              </p>
            </div>
            <CalendarCheck className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      {!vitalsError && <DoctorVitalsOverviewCharts vitals={safeVitals} riskDistribution={riskDistribution} />}
      {vitalsError && <p className="text-sm text-red-600">{vitalsError.message}</p>}

      <PatientMonitoringTable rows={monitoringRows} />

      {alertsError && <p className="text-sm text-red-600">{alertsError.message}</p>}
      {!alertsError && (
        <AlertsPanel
          alerts={safeAlerts}
          patientNameByUserId={patientNameByUserId}
          patientRouteByUserId={patientRouteByUserId}
          patientIdByUserId={patientIdByUserId}
        />
      )}

      {appointmentsError && <p className="text-sm text-red-600">{appointmentsError.message}</p>}
      {emergenciesError && <p className="text-sm text-red-600">{emergenciesError.message}</p>}

      {!emergenciesError && safeEmergencies.length > 0 && (
        <Card className="border-red-100/70 bg-red-50/50 shadow-sm">
          <CardHeader>
            <CardTitle>Emergency Escalations</CardTitle>
            <CardDescription>Urgent patient incidents submitted from the emergency workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {safeEmergencies.map((event) => (
              <div key={event.id} className="rounded-lg border border-red-200 bg-red-50/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-red-900">
                    {patientNameByUserId[event.patient_id] ?? 'Patient'} • {event.status}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.status === 'open' && (
                      <form action={updateEmergencyStatus}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value="acknowledged" />
                        <Button type="submit" size="sm" variant="outline" className="text-black hover:text-black">
                          Acknowledge
                        </Button>
                      </form>
                    )}
                    {event.status !== 'resolved' && (
                      <form action={updateEmergencyStatus}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <Button type="submit" size="sm" variant="outline" className="text-black hover:text-black">
                          Resolve
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
                <p className="text-sm text-red-800">{event.reason}</p>
                <p className="text-xs text-red-700">{new Date(event.created_at).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.openEmergencies > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="flex items-center gap-3 p-4">
            <Siren className="h-5 w-5 text-red-700" />
            <p className="text-sm text-red-800">
              {stats.openEmergencies} emergency escalations require response.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle>Patient Activity Feed</CardTitle>
          <CardDescription>Latest monitoring and care coordination events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedItems.length === 0 && <p className="text-sm text-muted-foreground">No recent activities available.</p>}
          {feedItems.map((item) => (
            <div key={item.key} className="rounded-xl border bg-slate-50 p-3">
              <p className="text-sm">{item.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatUtcDateTime(item.when)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/doctor/patients" className="rounded-xl border border-blue-100 bg-cyan-50/80 p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Navigate</p>
          <p className="mt-1 text-lg font-semibold">My Patients</p>
          <p className="mt-1 text-sm text-muted-foreground">Manage patient profiles, vitals, medications, and chat.</p>
        </Link>
        <Link href="/doctor/appointments" className="rounded-xl border border-blue-100 bg-blue-50/80 p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Navigate</p>
          <p className="mt-1 text-lg font-semibold">Appointment Requests</p>
          <p className="mt-1 text-sm text-muted-foreground">Approve or reject incoming patient appointment bookings.</p>
        </Link>
        <Link href="/doctor/analytics" className="rounded-xl border border-blue-100 bg-sky-50/80 p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Navigate</p>
          <p className="mt-1 text-lg font-semibold">Population Analytics</p>
          <p className="mt-1 text-sm text-muted-foreground">View average vitals, high-risk patients, and engagement trends.</p>
        </Link>
        <Link href="/doctor/care-plans" className="rounded-xl border border-blue-100 bg-indigo-50/80 p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Navigate</p>
          <p className="mt-1 text-lg font-semibold">Care Plans</p>
          <p className="mt-1 text-sm text-muted-foreground">Assign chronic care goals and instructions for each patient.</p>
        </Link>
      </div>
    </div>
  );
}
