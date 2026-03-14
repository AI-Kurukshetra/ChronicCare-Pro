import Link from 'next/link';
import { MessageSquare, UserRound } from 'lucide-react';
import { redirect } from 'next/navigation';

import { RealtimeChat } from '@/components/chat/realtime-chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

type DoctorMessagesPageProps = {
  searchParams?: {
    patient?: string;
  };
};

export default async function DoctorMessagesPage({ searchParams }: DoctorMessagesPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'doctor') redirect('/login');

  const { data: patientsData, error: patientsError } = await supabase
    .from('patients')
    .select('id,user_id,full_name,email')
    .eq('doctor_id', user.id)
    .order('full_name', { ascending: true });

  if (patientsError) {
    return <p className="text-sm text-red-600">{patientsError.message}</p>;
  }

  const linkedPatients = (patientsData ?? []).filter((patient) => Boolean(patient.user_id));
  const selectedPatientUserId =
    searchParams?.patient && linkedPatients.some((patient) => patient.user_id === searchParams.patient)
      ? searchParams.patient
      : linkedPatients[0]?.user_id;
  const selectedPatient = linkedPatients.find((patient) => patient.user_id === selectedPatientUserId) ?? null;

  const { data: messagesData } = selectedPatientUserId
    ? await supabase
        .from('messages')
        .select('id,sender_id,receiver_id,message,timestamp')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedPatientUserId}),and(sender_id.eq.${selectedPatientUserId},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true })
        .limit(100)
    : { data: [] };

  const messages = messagesData ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-800/60 bg-gradient-to-r from-blue-950 via-indigo-900 to-cyan-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Doctor Workspace</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Messages</h1>
          <p className="max-w-2xl text-sm text-blue-100">Select a patient conversation and respond in real time.</p>
          <p className="text-xs text-blue-200">{APP_TITLE}</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-blue-100/70 shadow-sm">
          <CardHeader>
            <CardTitle>My Patients</CardTitle>
            <CardDescription>Choose a patient to open chat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedPatients.length === 0 && (
              <p className="text-sm text-muted-foreground">No linked patient accounts yet. Assign patients with registered accounts first.</p>
            )}

            {linkedPatients.map((patient) => {
              const active = patient.user_id === selectedPatientUserId;
              return (
                <Link
                  key={patient.id}
                  href={`/doctor/messages?patient=${patient.user_id}`}
                  className={`block rounded-xl border px-3 py-2 transition ${
                    active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-medium">{patient.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{patient.email ?? patient.user_id}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {selectedPatientUserId && selectedPatient ? (
          <RealtimeChat
            title={`Chat with ${selectedPatient.full_name}`}
            description="Secure doctor-patient communication channel."
            currentUserId={user.id}
            peerUserId={selectedPatientUserId}
            initialMessages={messages}
          />
        ) : (
          <Card className="border-dashed border-blue-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                No conversation selected
              </CardTitle>
              <CardDescription>Select a patient from the left panel to start messaging.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card className="border-blue-100/70 shadow-sm">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <UserRound className="h-4 w-4 text-blue-600" />
          Messaging is available only for patients assigned to you with linked accounts.
        </CardContent>
      </Card>
    </div>
  );
}
