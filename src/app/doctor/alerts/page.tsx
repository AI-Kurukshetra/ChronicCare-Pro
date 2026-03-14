import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, Siren } from 'lucide-react';
import { redirect } from 'next/navigation';

import { EscalateAlertForm } from '@/components/doctor/escalate-alert-form';
import { ResolveAlertForm } from '@/components/doctor/resolve-alert-form';
import { ResolveEscalationForm } from '@/components/doctor/resolve-escalation-form';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDateTime } from '@/lib/date-format';
import { createClient } from '@/lib/supabase/server';

type AlertRow = {
  id: number;
  patient_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'open' | 'resolved';
  created_at: string;
};

type EscalationRow = {
  id: number;
  alert_id: number;
  patient_id: string;
  priority: 'high' | 'critical';
  reason: string;
  status: 'open' | 'acknowledged' | 'resolved';
  due_at: string | null;
  created_at: string;
};

export default async function DoctorAlertsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'doctor') redirect('/login');

  const { data: patientsData } = await supabase
    .from('patients')
    .select('id,user_id,full_name')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false });

  const patientByUserId = Object.fromEntries(
    (patientsData ?? []).filter((p) => p.user_id).map((p) => [p.user_id as string, { id: p.id, name: p.full_name }])
  ) as Record<string, { id: number; name: string }>;

  const patientUserIds = Object.keys(patientByUserId);

  const { data: alertsData, error } = patientUserIds.length
    ? await supabase
        .from('alerts')
        .select('id,patient_id,type,severity,message,status,created_at')
        .in('patient_id', patientUserIds)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [], error: null };
  const { data: escalationsData } = patientUserIds.length
    ? await supabase
        .from('alert_escalations')
        .select('id,alert_id,patient_id,priority,reason,status,due_at,created_at')
        .in('patient_id', patientUserIds)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [] };

  const alerts = (alertsData as AlertRow[] | null) ?? [];
  const escalations = (escalationsData as EscalationRow[] | null) ?? [];
  const openCount = alerts.filter((a) => a.status === 'open').length;
  const criticalCount = alerts.filter((a) => a.status === 'open' && a.severity === 'critical').length;
  const openEscalations = escalations.filter((item) => item.status !== 'resolved');
  const escalationByAlertId = new Map<number, EscalationRow>();
  for (const escalation of escalations) {
    if (!escalationByAlertId.has(escalation.alert_id) && escalation.status !== 'resolved') {
      escalationByAlertId.set(escalation.alert_id, escalation);
    }
  }

  function severityClasses(severity: AlertRow['severity']) {
    if (severity === 'critical') return 'border-red-200 bg-red-50';
    if (severity === 'high') return 'border-orange-200 bg-orange-50';
    if (severity === 'medium') return 'border-amber-200 bg-amber-50';
    return 'border-emerald-200 bg-emerald-50';
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-red-800/60 bg-gradient-to-r from-slate-950 via-blue-900 to-red-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-red-200">Doctor Workspace</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Alerts</h1>
          <p className="max-w-2xl text-sm text-red-100">Track and resolve abnormal vitals across your assigned patients.</p>
          <p className="text-xs text-red-200">{APP_TITLE}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-red-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Alerts</p>
              <p className="text-2xl font-semibold">{openCount}</p>
            </div>
            <div className="rounded-full bg-red-50 p-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Critical</p>
              <p className="text-2xl font-semibold">{criticalCount}</p>
            </div>
            <div className="rounded-full bg-orange-50 p-2">
              <Clock3 className="h-5 w-5 text-orange-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolved</p>
              <p className="text-2xl font-semibold">{alerts.length - openCount}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalation Queue</p>
              <p className="text-2xl font-semibold">{openEscalations.length}</p>
            </div>
            <div className="rounded-full bg-violet-50 p-2">
              <Siren className="h-5 w-5 text-violet-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-violet-100/80 shadow-sm">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">Escalation Queue</p>
          {openEscalations.length === 0 && <p className="text-sm text-muted-foreground">No open escalations.</p>}
          {openEscalations.slice(0, 8).map((item) => (
            <div key={item.id} className="rounded-lg border bg-violet-50/40 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {patientByUserId[item.patient_id]?.name ?? 'Unknown patient'} • {item.priority.toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Due: {item.due_at ? formatUtcDateTime(item.due_at) : 'Not set'} • Created {formatUtcDateTime(item.created_at)}
                  </p>
                </div>
                <ResolveEscalationForm escalationId={item.id} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {!error && alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts available yet.</p>}

      <div className="space-y-3">
        {alerts.map((alert) => {
          const patient = patientByUserId[alert.patient_id];
          const patientDetailsRoute = patient ? `/doctor/patients/${patient.id}` : null;

          return (
            <Card key={alert.id} className={`shadow-sm ${severityClasses(alert.severity)}`}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{patient?.name ?? 'Unknown patient'} - {alert.type.toUpperCase()}</p>
                    <p className="text-sm text-slate-700">{alert.message}</p>
                  </div>
                  <div className="text-xs text-slate-600">{formatUtcDateTime(alert.created_at)}</div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium capitalize">{alert.severity}</span>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium capitalize">{alert.status}</span>
                  {escalationByAlertId.has(alert.id) && (
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">
                      Escalated
                    </span>
                  )}
                  {patientDetailsRoute && (
                    <Link href={patientDetailsRoute} className="text-xs font-medium text-blue-700 underline">
                      Open patient details
                    </Link>
                  )}
                  {alert.status === 'open' && <ResolveAlertForm alertId={alert.id} />}
                  {alert.status === 'open' && !escalationByAlertId.has(alert.id) && <EscalateAlertForm alertId={alert.id} />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
