import { redirect } from 'next/navigation';
import { CheckCircle2, Pill, XCircle } from 'lucide-react';

import { AdherenceLogForm } from '@/components/medications/adherence-log-form';
import { MedicationList } from '@/components/medications/medication-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDateTime } from '@/lib/date-format';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export default async function PatientMedicationsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  const { data: medicationsData, error } = await supabase
    .from('medications')
    .select('id,medicine_name,dosage,schedule,reminder_time,created_at')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false });
  const medications = medicationsData ?? [];
  const medicationIds = medications.map((item) => item.id);

  const { data: adherenceLogsData } = medicationIds.length
    ? await supabase
        .from('medication_adherence_logs')
        .select('id,medication_id,status,note,logged_at')
        .eq('patient_id', user.id)
        .in('medication_id', medicationIds)
        .order('logged_at', { ascending: false })
        .limit(200)
    : { data: [] };
  const adherenceLogs =
    (adherenceLogsData as Array<{
      id: number;
      medication_id: number;
      status: 'taken' | 'missed' | 'skipped';
      note: string | null;
      logged_at: string;
    }> | null) ?? [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const latestAdherenceByMedication = new Map<number, (typeof adherenceLogs)[number]>();
  for (const log of adherenceLogs) {
    if (!latestAdherenceByMedication.has(log.medication_id)) {
      latestAdherenceByMedication.set(log.medication_id, log);
    }
  }
  const todaysTaken = adherenceLogs.filter((log) => log.status === 'taken' && log.logged_at.slice(0, 10) === todayKey).length;
  const todaysMissed = adherenceLogs.filter((log) => log.status === 'missed' && log.logged_at.slice(0, 10) === todayKey).length;

  const { data: patientRecord } = await supabase
    .from('patients')
    .select('doctor_id')
    .eq('user_id', user.id)
    .maybeSingle();
  let doctorEmail: string | null = null;
  if (patientRecord?.doctor_id) {
    try {
      const adminClient = createAdminClient();
      const { data: doctorData } = await adminClient.auth.admin.getUserById(patientRecord.doctor_id);
      doctorEmail = doctorData.user?.email ?? null;
    } catch {
      doctorEmail = null;
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-indigo-200">Patient Portal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Medications</h1>
            <p className="max-w-2xl text-sm text-indigo-100">Check your medicine schedule and reminder times.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Medications</p>
            <p className="text-2xl font-semibold">{medications.length}</p>
          </div>
          <Pill className="h-5 w-5 text-slate-700" />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Taken Today</p>
              <p className="text-2xl font-semibold">{todaysTaken}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Missed Today</p>
              <p className="text-2xl font-semibold">{todaysMissed}</p>
            </div>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <MedicationList medications={medications} />

      <Card>
        <CardHeader>
          <CardTitle>Log Medication Adherence</CardTitle>
          <CardDescription>Mark each prescription as taken or missed to keep your care team updated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {medications.length === 0 && <p className="text-sm text-muted-foreground">No medications to log yet.</p>}
          {medications.map((item) => {
            const latest = latestAdherenceByMedication.get(item.id);
            return (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{item.medicine_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.dosage} • {item.schedule} • Reminder {item.reminder_time}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest: {latest ? `${latest.status} at ${formatUtcDateTime(latest.logged_at)}` : 'No adherence logs yet'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdherenceLogForm medicationId={item.id} status="taken" />
                    <AdherenceLogForm medicationId={item.id} status="missed" />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Adherence Timeline</CardTitle>
          <CardDescription>Latest adherence updates shared with your doctor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {adherenceLogs.length === 0 && <p className="text-sm text-muted-foreground">No adherence activity yet.</p>}
          {adherenceLogs.slice(0, 12).map((item) => {
            const medication = medications.find((m) => m.id === item.medication_id);
            return (
              <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                <p className="text-sm">
                  <span className="font-medium">{medication?.medicine_name ?? `Medication #${item.medication_id}`}</span> marked as{' '}
                  <span className="font-medium capitalize">{item.status}</span>
                </p>
                <p className="text-xs text-muted-foreground">{formatUtcDateTime(item.logged_at)}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Doctor</CardTitle>
          <CardDescription>Your medication plan is managed by your assigned doctor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {patientRecord?.doctor_id ? (
            <>
              <p className="text-sm">
                <span className="text-muted-foreground">Doctor Email: </span>
                {doctorEmail ?? 'Not available'}
              </p>
              <p className="text-xs text-muted-foreground">Doctor ID: {patientRecord.doctor_id}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No doctor assigned yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
