import { redirect } from 'next/navigation';
import { MessageSquare, ShieldCheck } from 'lucide-react';

import { RealtimeChat } from '@/components/chat/realtime-chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export default async function PatientChatPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  const { data: patientRecord } = await supabase
    .from('patients')
    .select('doctor_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const doctorId = patientRecord?.doctor_id ?? null;

  let doctorEmail: string | null = null;
  if (doctorId) {
    try {
      const adminClient = createAdminClient();
      const { data: doctorData } = await adminClient.auth.admin.getUserById(doctorId);
      doctorEmail = doctorData.user?.email ?? null;
    } catch {
      doctorEmail = null;
    }
  }

  const { data: messagesData } = doctorId
    ? await supabase
        .from('messages')
        .select('id,sender_id,receiver_id,message,timestamp')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${doctorId}),and(sender_id.eq.${doctorId},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true })
        .limit(100)
    : { data: [] };
  const messages = messagesData ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Patient Portal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Doctor Chat</h1>
            <p className="max-w-2xl text-sm text-blue-100">Secure real-time messaging with your assigned doctor.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <Card className="border-blue-100/80 shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Doctor</p>
            <p className="text-sm font-medium">{doctorEmail ?? 'Not assigned'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              End-to-end secure
            </span>
            <MessageSquare className="h-5 w-5 text-blue-700" />
          </div>
        </CardContent>
      </Card>

      {doctorId ? (
        <RealtimeChat
          title="Message Doctor"
          description="Ask questions and get updates from your doctor."
          currentUserId={user.id}
          peerUserId={doctorId}
          initialMessages={messages}
        />
      ) : (
        <Card className="border-dashed border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Doctor Chat
            </CardTitle>
            <CardDescription>Chat activates once a doctor is assigned to your profile.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
