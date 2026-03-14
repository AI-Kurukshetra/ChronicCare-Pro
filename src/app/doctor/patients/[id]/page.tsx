import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FileText, Link2, MessageSquarePlus, Pill, PlusCircle } from 'lucide-react';

import { AddClinicalNoteForm } from '@/components/doctor/add-clinical-note-form';
import { LinkPatientAccountForm } from '@/components/doctor/link-patient-account-form';
import { RealtimeChat } from '@/components/chat/realtime-chat';
import { AssignMedicationForm } from '@/components/medications/assign-medication-form';
import { MedicationList } from '@/components/medications/medication-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VitalsHistory } from '@/components/vitals/vitals-history';
import { VitalsTrendsChart } from '@/components/vitals/vitals-trends-chart';
import { getUserRole } from '@/lib/auth/roles';
import { formatUtcDateTime } from '@/lib/date-format';
import { createClient } from '@/lib/supabase/server';
import { type VitalReading } from '@/lib/vitals';

type Params = {
  params: { id: string };
};

export default async function DoctorPatientDetailsPage({ params }: Params) {
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

  const { data: patient, error } = await supabase
    .from('patients')
    .select('id,full_name,email,age,disease,notes,created_at,doctor_id,user_id')
    .eq('id', params.id)
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (error || !patient) {
    notFound();
  }

  let vitals: VitalReading[] = [];
  let vitalsError: string | null = null;
  let messages: Array<{
    id: number;
    sender_id: string;
    receiver_id: string;
    message: string;
    timestamp: string;
  }> = [];
  let medications: Array<{
    id: number;
    medicine_name: string;
    dosage: string;
    schedule: string;
    reminder_time: string;
    created_at: string;
  }> = [];
  let alerts: Array<{
    id: number;
    type: string;
    severity: string;
    message: string;
    status: string;
    created_at: string;
  }> = [];
  let clinicalNotes: Array<{
    id: number;
    note: string;
    is_patient_visible: boolean;
    created_at: string;
  }> = [];
  let adherenceLogs: Array<{
    id: number;
    medication_id: number;
    status: 'taken' | 'missed' | 'skipped';
    logged_at: string;
  }> = [];

  if (patient.user_id) {
    const { data: vitalsData, error: queryError } = await supabase
      .from('vitals')
      .select('id,patient_id,type,value,timestamp')
      .eq('patient_id', patient.user_id)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (queryError) {
      vitalsError = queryError.message;
    } else {
      vitals = (vitalsData as VitalReading[] | null) ?? [];
    }

    const { data: messagesData } = await supabase
      .from('messages')
      .select('id,sender_id,receiver_id,message,timestamp')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${patient.user_id}),and(sender_id.eq.${patient.user_id},receiver_id.eq.${user.id})`)
      .order('timestamp', { ascending: true })
      .limit(100);
    messages = messagesData ?? [];

    const { data: medicationsData } = await supabase
      .from('medications')
      .select('id,medicine_name,dosage,schedule,reminder_time,created_at')
      .eq('patient_id', patient.user_id)
      .order('created_at', { ascending: false });
    medications = medicationsData ?? [];

    const { data: alertsData } = await supabase
      .from('alerts')
      .select('id,type,severity,message,status,created_at')
      .eq('patient_id', patient.user_id)
      .order('created_at', { ascending: false })
      .limit(40);
    alerts = alertsData ?? [];

    const { data: notesData } = await supabase
      .from('clinical_notes')
      .select('id,note,is_patient_visible,created_at')
      .eq('patient_id', patient.user_id)
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80);
    clinicalNotes = notesData ?? [];

    const medicationIds = medications.map((item) => item.id);
    const { data: adherenceData } = medicationIds.length
      ? await supabase
          .from('medication_adherence_logs')
          .select('id,medication_id,status,logged_at')
          .eq('patient_id', patient.user_id)
          .in('medication_id', medicationIds)
          .order('logged_at', { ascending: false })
          .limit(80)
      : { data: [] };
    adherenceLogs =
      (adherenceData as Array<{
        id: number;
        medication_id: number;
        status: 'taken' | 'missed' | 'skipped';
        logged_at: string;
      }> | null) ?? [];
  }

  return (
    <div className="space-y-6">
      <Link href="/doctor/dashboard" className="text-sm font-medium text-blue-700 underline">
        Back to dashboard
      </Link>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
              {patient.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{patient.full_name}</h1>
              <p className="text-sm text-slate-600">Patient overview and monitoring profile</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              Age: {typeof patient.age === 'number' ? patient.age : 'N/A'}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
              {patient.disease ?? 'Condition N/A'}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Info title="Email" value={patient.email ?? 'Not provided'} />
          <Info title="Assigned Doctor" value={user.email ?? 'Current doctor'} />
          <Info title="Linked Account" value={patient.user_id ?? 'Not linked'} />
          <Info title="Profile Created" value={new Date(patient.created_at).toLocaleString()} />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Actions</CardTitle>
          <CardDescription>Fast clinical actions from patient profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium"><Pill className="h-4 w-4 text-blue-600" /> Add Medication</p>
            <p className="mt-1 text-xs text-muted-foreground">Prescribe medicine with schedule and reminders.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium"><MessageSquarePlus className="h-4 w-4 text-blue-600" /> Send Message</p>
            <p className="mt-1 text-xs text-muted-foreground">Notify patient and follow up on symptoms.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium"><PlusCircle className="h-4 w-4 text-blue-600" /> Create Care Plan</p>
            <p className="mt-1 text-xs text-muted-foreground">Set measurable health goals and care tasks.</p>
          </div>
        </CardContent>
      </Card>

      {vitalsError && <p className="text-sm text-red-600">{vitalsError}</p>}

      {!patient.user_id && (
        <Card>
          <CardHeader>
            <CardTitle>Vitals Monitoring</CardTitle>
            <CardDescription>Link this patient to a patient account to unlock trends and live monitoring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-blue-50/60 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Link2 className="h-4 w-4" />
                Patient account not linked
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Link the patient email to connect login account, doctor assignment visibility, vitals, and medication tracking.
              </p>
            </div>
            <LinkPatientAccountForm patientRecordId={patient.id} email={patient.email ?? null} />
          </CardContent>
        </Card>
      )}

      {patient.user_id && (
        <div className="grid gap-4 xl:grid-cols-2">
          <VitalsTrendsChart vitals={vitals} title="Health Metrics" />
          <VitalsHistory vitals={vitals.slice(0, 20)} title="Recent Activity" />
        </div>
      )}

      {patient.user_id && (
        <div className="grid gap-4 xl:grid-cols-2">
          <AssignMedicationForm patientRecordId={String(patient.id)} patientUserId={patient.user_id} />
          <MedicationList
            medications={medications}
            title="Medication Panel"
            description="Current medications and schedules."
          />
        </div>
      )}

      {patient.user_id && (
        <RealtimeChat
          title="Messages"
          description="Secure doctor-patient communication channel."
          currentUserId={user.id}
          peerUserId={patient.user_id}
          initialMessages={messages}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Clinical Notes Timeline
          </CardTitle>
          <CardDescription>Structured doctor notes with patient activity context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddClinicalNoteForm patientRecordId={patient.id} />
          {clinicalNotes.length === 0 && !patient.notes && (
            <p className="text-sm text-muted-foreground">No clinical notes available yet.</p>
          )}

          {patient.notes && (
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Legacy patient notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{patient.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            {clinicalNotes.slice(0, 12).map((note) => (
              <div key={note.id} className="rounded-lg border bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Doctor Note</span>
                  {note.is_patient_visible && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Visible to patient</span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatUtcDateTime(note.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{note.note}</p>
              </div>
            ))}
            {alerts.slice(0, 4).map((alert) => (
              <div key={`alert-${alert.id}`} className="rounded-lg border bg-orange-50/40 p-3">
                <p className="text-xs uppercase tracking-wide text-orange-700">Alert Event</p>
                <p className="mt-1 text-sm font-medium">{alert.type.toUpperCase()} • {alert.severity}</p>
                <p className="text-sm text-slate-700">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{formatUtcDateTime(alert.created_at)}</p>
              </div>
            ))}
            {adherenceLogs.slice(0, 4).map((log) => {
              const medication = medications.find((item) => item.id === log.medication_id);
              return (
                <div key={`adherence-${log.id}`} className="rounded-lg border bg-emerald-50/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Medication Adherence</p>
                  <p className="mt-1 text-sm">
                    {medication?.medicine_name ?? `Medication #${log.medication_id}`} marked as{' '}
                    <span className="font-medium capitalize">{log.status}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatUtcDateTime(log.logged_at)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
