import type { ReactNode } from 'react';
import { AlertTriangle, CalendarClock, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import { redirect } from 'next/navigation';

import { AdminAnalyticsCharts } from '@/components/admin/admin-analytics-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole, type AppRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDate, formatUtcDateTime } from '@/lib/date-format';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type PlatformUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: AppRole;
  specialty: string | null;
};

type PatientRow = {
  id: number;
  user_id: string | null;
  doctor_id: string;
  full_name: string;
  created_at: string;
};

type AlertRow = {
  id: number;
  patient_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'open' | 'resolved';
  created_at: string;
};

type AppointmentRow = {
  id: number;
  patient_id: string;
  doctor_id: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type VitalRow = {
  id: number;
  patient_id: string;
  type: string;
  value: string;
  timestamp: string;
};

type AuditLogRow = {
  id: number;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
};

async function loadAllAuthUsers() {
  const admin = createAdminClient();
  const users: PlatformUser[] = [];
  const perPage = 200;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      break;
    }

    const pageUsers = data.users.map((item) => {
      const roleValue = item.app_metadata?.role ?? item.user_metadata?.role;
      const role: AppRole = roleValue === 'doctor' || roleValue === 'admin' ? roleValue : 'patient';
      const specialtyValue = item.user_metadata?.specialty;

      return {
        id: item.id,
        email: item.email ?? null,
        created_at: item.created_at,
        last_sign_in_at: item.last_sign_in_at ?? null,
        role,
        specialty: typeof specialtyValue === 'string' && specialtyValue.trim() ? specialtyValue : null
      };
    });

    users.push(...pageUsers);
    if (data.users.length < perPage) break;
  }

  return users;
}

function dateKeyUtc(value: string | Date) {
  return formatUtcDate(value);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'admin') redirect('/login');

  const adminClient = createAdminClient();

  const [users, patientsResponse, alertsResponse, appointmentsResponse, vitalsResponse, auditLogsResponse] = await Promise.all([
    loadAllAuthUsers(),
    adminClient.from('patients').select('id,user_id,doctor_id,full_name,created_at'),
    adminClient.from('alerts').select('id,patient_id,type,severity,message,status,created_at').order('created_at', { ascending: false }).limit(200),
    adminClient.from('appointments').select('id,patient_id,doctor_id,date,status,created_at').order('created_at', { ascending: false }).limit(200),
    adminClient.from('vitals').select('id,patient_id,type,value,timestamp').order('timestamp', { ascending: false }).limit(200),
    adminClient
      .from('audit_logs')
      .select('id,actor_id,actor_role,action,target_type,target_id,created_at')
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  const patients = (patientsResponse.data as PatientRow[] | null) ?? [];
  const alerts = (alertsResponse.data as AlertRow[] | null) ?? [];
  const appointments = (appointmentsResponse.data as AppointmentRow[] | null) ?? [];
  const vitals = (vitalsResponse.data as VitalRow[] | null) ?? [];
  const auditLogs = (auditLogsResponse.data as AuditLogRow[] | null) ?? [];

  const patientNameByUserId = Object.fromEntries(
    patients.filter((p) => p.user_id).map((p) => [p.user_id as string, p.full_name])
  ) as Record<string, string>;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const roles = {
    patient: users.filter((item) => item.role === 'patient').length,
    doctor: users.filter((item) => item.role === 'doctor').length,
    admin: users.filter((item) => item.role === 'admin').length
  };

  const newUsers7d = users.filter((item) => new Date(item.created_at).getTime() >= sevenDaysAgo).length;
  const activeUsers7d = users.filter((item) => item.last_sign_in_at && new Date(item.last_sign_in_at).getTime() >= sevenDaysAgo).length;
  const openCriticalAlerts = alerts.filter((item) => item.status === 'open' && item.severity === 'critical').length;
  const pendingAppointments = appointments.filter((item) => item.status === 'pending').length;
  const newUsers30d = users.filter((item) => new Date(item.created_at).getTime() >= thirtyDaysAgo).length;

  const signupsByDayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    signupsByDayMap.set(dateKeyUtc(date), 0);
  }
  users.forEach((item) => {
    const key = dateKeyUtc(item.created_at);
    if (signupsByDayMap.has(key)) {
      signupsByDayMap.set(key, (signupsByDayMap.get(key) ?? 0) + 1);
    }
  });
  const signupsByDay = [...signupsByDayMap.entries()].map(([label, value]) => ({ label, value }));

  const alertSeverity = {
    low: alerts.filter((item) => item.severity === 'low').length,
    medium: alerts.filter((item) => item.severity === 'medium').length,
    high: alerts.filter((item) => item.severity === 'high').length,
    critical: alerts.filter((item) => item.severity === 'critical').length
  };

  const doctorWorkload = users
    .filter((item) => item.role === 'doctor')
    .map((doctor) => {
      const assignedPatients = patients.filter((p) => p.doctor_id === doctor.id);
      const assignedPatientIds = assignedPatients.map((p) => p.user_id).filter(Boolean) as string[];
      const openAlerts = alerts.filter((a) => a.status === 'open' && assignedPatientIds.includes(a.patient_id)).length;

      return {
        id: doctor.id,
        email: doctor.email ?? doctor.id,
        specialty: doctor.specialty ?? 'General Medicine',
        patientLoad: assignedPatients.length,
        openAlerts
      };
    })
    .sort((a, b) => b.patientLoad - a.patientLoad);

  const recentAlerts = alerts.filter((alert) => alert.severity === 'critical').slice(0, 6);
  const activityFeed = [
    ...vitals.slice(0, 6).map((v) => ({
      key: `vital-${v.id}`,
      when: v.timestamp,
      text: `${patientNameByUserId[v.patient_id] ?? 'Patient'} logged ${v.type.toUpperCase()} (${v.value})`
    })),
    ...appointments.slice(0, 6).map((a) => ({
      key: `appointment-${a.id}`,
      when: a.created_at,
      text: `Appointment ${a.status} for ${patientNameByUserId[a.patient_id] ?? 'patient'} (${formatUtcDateTime(a.date)})`
    }))
  ]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Admin Console</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Platform Operations Dashboard</h1>
            <p className="max-w-2xl text-sm text-blue-100">
              Monitor user growth, care operations, and critical signals across ChronicCare Pro.
            </p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Users" value={users.length} subtitle={`${newUsers7d} new in 7d`} icon={<UsersRound className="h-5 w-5 text-blue-700" />} />
        <MetricCard title="Active Users (7d)" value={activeUsers7d} subtitle={`${newUsers30d} new in 30d`} icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />} />
        <MetricCard title="Critical Alerts" value={openCriticalAlerts} subtitle="Open only" icon={<AlertTriangle className="h-5 w-5 text-red-700" />} />
        <MetricCard title="Pending Appointments" value={pendingAppointments} subtitle="Needs doctor action" icon={<CalendarClock className="h-5 w-5 text-orange-700" />} />
        <MetricCard title="Doctors" value={roles.doctor} subtitle={`${roles.patient} patients | ${roles.admin} admins`} icon={<Stethoscope className="h-5 w-5 text-cyan-700" />} />
      </div>

      <AdminAnalyticsCharts signupsByDay={signupsByDay} roleDistribution={roles} alertSeverity={alertSeverity} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-red-100/80 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Critical Alerts</CardTitle>
            <CardDescription>Most recent severe events requiring attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts available.</p>}
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-red-200 bg-red-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-red-900">
                    {(patientNameByUserId[alert.patient_id] ?? 'Patient')} - {alert.type.toUpperCase()}
                  </p>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {alert.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-red-800">{alert.message}</p>
                <p className="mt-1 text-xs text-red-700">{formatUtcDateTime(alert.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-blue-100/70 shadow-sm">
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Latest vitals and appointment activity across platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
            {activityFeed.map((item) => (
              <div key={item.key} className="rounded-lg border bg-slate-50 p-3">
                <p className="text-sm">{item.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatUtcDateTime(item.when)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle>Doctor Workload</CardTitle>
          <CardDescription>Patient load and open alerts by doctor.</CardDescription>
        </CardHeader>
        <CardContent>
          {doctorWorkload.length === 0 && <p className="text-sm text-muted-foreground">No doctors available yet.</p>}
          {doctorWorkload.length > 0 && (
            <div className="space-y-3">
              {doctorWorkload.map((doctor) => (
                <div key={doctor.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{doctor.email}</p>
                      <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Patients: {doctor.patientLoad}</span>
                      <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">Open alerts: {doctor.openAlerts}</span>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${Math.min(100, doctor.patientLoad * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Recent platform actions for governance and compliance review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLogs.length === 0 && <p className="text-sm text-muted-foreground">No audit events available.</p>}
          {auditLogs.slice(0, 12).map((log) => (
            <div key={log.id} className="rounded-lg border bg-slate-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">
                  {log.action} • {log.target_type}
                </p>
                <span className="text-xs text-muted-foreground">{formatUtcDateTime(log.created_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Actor: {log.actor_role} ({users.find((item) => item.id === log.actor_id)?.email ?? log.actor_id})
              </p>
              {log.target_id && <p className="text-xs text-muted-foreground">Target ID: {log.target_id}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-blue-100/80 shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-full bg-blue-50 p-2">{icon}</div>
      </CardContent>
    </Card>
  );
}
