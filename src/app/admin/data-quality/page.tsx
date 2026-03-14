import { AlertTriangle, CheckCircle2, DatabaseZap, ShieldAlert } from 'lucide-react';
import { redirect } from 'next/navigation';

import { RunDataQualityCheckButton } from '@/components/admin/run-data-quality-check-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole, type AppRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDateTime } from '@/lib/date-format';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type PlatformUser = {
  id: string;
  role: AppRole;
};

type CheckResult = {
  title: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
};

type AuditLogRow = {
  id: number;
  created_at: string;
  actor_id: string;
  metadata: {
    summary?: {
      pass?: number;
      warn?: number;
      fail?: number;
    };
    checked_at?: string;
  } | null;
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

    users.push(
      ...data.users.map((item) => {
        const roleValue = item.app_metadata?.role ?? item.user_metadata?.role;
        const role: AppRole = roleValue === 'doctor' || roleValue === 'admin' ? roleValue : 'patient';
        return { id: item.id, role };
      })
    );

    if (data.users.length < perPage) break;
  }

  return users;
}

export default async function AdminDataQualityPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'admin') redirect('/login');

  const admin = createAdminClient();
  const [users, patientsRes, vitalsRes, alertsRes, appointmentsRes, medicationsRes, messagesRes, historyRes] = await Promise.all([
    loadAllAuthUsers(),
    admin.from('patients').select('id,user_id,doctor_id'),
    admin.from('vitals').select('id,patient_id'),
    admin.from('alerts').select('id,patient_id'),
    admin.from('appointments').select('id,patient_id,doctor_id'),
    admin.from('medications').select('id,patient_id'),
    admin.from('messages').select('id,sender_id,receiver_id'),
    admin
      .from('audit_logs')
      .select('id,created_at,actor_id,metadata')
      .eq('action', 'data_quality_check_run')
      .order('created_at', { ascending: false })
      .limit(12)
  ]);

  const patients = patientsRes.data ?? [];
  const vitals = vitalsRes.data ?? [];
  const alerts = alertsRes.data ?? [];
  const appointments = appointmentsRes.data ?? [];
  const medications = medicationsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const history = (historyRes.data as AuditLogRow[] | null) ?? [];

  const userIds = new Set(users.map((u) => u.id));
  const patientRoleUserIds = new Set(users.filter((u) => u.role === 'patient').map((u) => u.id));
  const doctorRoleUserIds = new Set(users.filter((u) => u.role === 'doctor').map((u) => u.id));
  const patientLinkedUserIds = new Set(
    patients.map((p) => p.user_id).filter((value): value is string => typeof value === 'string' && value.length > 0)
  );

  const orphanVitals = vitals.filter((row) => !patientRoleUserIds.has(row.patient_id)).length;
  const orphanAlerts = alerts.filter((row) => !patientRoleUserIds.has(row.patient_id)).length;
  const orphanMedications = medications.filter((row) => !patientRoleUserIds.has(row.patient_id)).length;
  const orphanAppointments = appointments.filter(
    (row) => !patientRoleUserIds.has(row.patient_id) || !doctorRoleUserIds.has(row.doctor_id)
  ).length;
  const orphanMessages = messages.filter(
    (row) => !userIds.has(row.sender_id) || !userIds.has(row.receiver_id)
  ).length;

  const patientsWithoutDoctor = patients.filter((row) => !doctorRoleUserIds.has(row.doctor_id)).length;
  const linkedPatientsWithoutAuthUser = [...patientLinkedUserIds].filter((id) => !patientRoleUserIds.has(id)).length;
  const roleTotal = users.filter((u) => u.role === 'patient').length + users.filter((u) => u.role === 'doctor').length + users.filter((u) => u.role === 'admin').length;

  const checks: CheckResult[] = [
    {
      title: 'Auth Role Partition',
      status: roleTotal === users.length ? 'pass' : 'fail',
      detail: `Role-count total ${roleTotal} vs auth users ${users.length}.`
    },
    {
      title: 'Patient Assignments',
      status: patientsWithoutDoctor === 0 ? 'pass' : 'warn',
      detail: `${patientsWithoutDoctor} patient records have missing/invalid doctor assignment.`
    },
    {
      title: 'Linked Patient Accounts',
      status: linkedPatientsWithoutAuthUser === 0 ? 'pass' : 'warn',
      detail: `${linkedPatientsWithoutAuthUser} linked patient user_ids are not valid patient auth users.`
    },
    {
      title: 'Vitals Referential Integrity',
      status: orphanVitals === 0 ? 'pass' : 'fail',
      detail: `${orphanVitals} vitals rows reference unknown/non-patient user ids.`
    },
    {
      title: 'Alerts Referential Integrity',
      status: orphanAlerts === 0 ? 'pass' : 'fail',
      detail: `${orphanAlerts} alerts rows reference unknown/non-patient user ids.`
    },
    {
      title: 'Appointments Referential Integrity',
      status: orphanAppointments === 0 ? 'pass' : 'fail',
      detail: `${orphanAppointments} appointments rows reference unknown patient/doctor ids.`
    },
    {
      title: 'Medications Referential Integrity',
      status: orphanMedications === 0 ? 'pass' : 'fail',
      detail: `${orphanMedications} medications rows reference unknown/non-patient user ids.`
    },
    {
      title: 'Messages Referential Integrity',
      status: orphanMessages === 0 ? 'pass' : 'warn',
      detail: `${orphanMessages} messages rows reference unknown sender/receiver ids.`
    }
  ];

  const summary = {
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length
  };
  const checkedAt = new Date().toISOString();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Admin Console</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Data Quality Checks</h1>
          <p className="max-w-2xl text-sm text-blue-100">
            Validate cross-table integrity so dashboard stats remain correct across admin, doctor, and patient views.
          </p>
          <p className="text-xs text-blue-200">{APP_TITLE}</p>
          <p className="text-xs text-blue-100">Checked now: {formatUtcDateTime(checkedAt)}</p>
          <div className="pt-2">
            <RunDataQualityCheckButton />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-emerald-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pass</p>
              <p className="text-2xl font-semibold">{summary.pass}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Warnings</p>
              <p className="text-2xl font-semibold">{summary.warn}</p>
            </div>
            <div className="rounded-full bg-orange-50 p-2">
              <AlertTriangle className="h-5 w-5 text-orange-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Fails</p>
              <p className="text-2xl font-semibold">{summary.fail}</p>
            </div>
            <div className="rounded-full bg-red-50 p-2">
              <ShieldAlert className="h-5 w-5 text-red-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="h-5 w-5 text-blue-700" />
            Integrity Report
          </CardTitle>
          <CardDescription>Pass/warn/fail checks for key entities used in product dashboards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.title}
              className={`rounded-xl border p-3 ${
                check.status === 'pass'
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : check.status === 'warn'
                    ? 'border-orange-200 bg-orange-50/60'
                    : 'border-red-200 bg-red-50/60'
              }`}
            >
              <p className="text-sm font-semibold">{check.title}</p>
              <p className="text-sm">{check.detail}</p>
              <p className="mt-1 text-xs uppercase tracking-wide">{check.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle>Run History</CardTitle>
          <CardDescription>Most recent manual refresh operations and their summaries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 && <p className="text-sm text-muted-foreground">No refresh history yet.</p>}
          {history.map((entry) => {
            const summaryMeta = entry.metadata?.summary ?? {};
            return (
              <div key={entry.id} className="rounded-xl border bg-slate-50 p-3">
                <p className="text-sm font-semibold">Run #{entry.id}</p>
                <p className="text-xs text-muted-foreground">
                  {formatUtcDateTime(entry.metadata?.checked_at ?? entry.created_at)}
                </p>
                <p className="mt-1 text-sm">
                  Pass: {summaryMeta.pass ?? 0} | Warn: {summaryMeta.warn ?? 0} | Fail: {summaryMeta.fail ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Actor: {entry.actor_id}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
