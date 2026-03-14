import { redirect } from 'next/navigation';
import { Bot } from 'lucide-react';

import { VirtualHealthCoach } from '@/components/patient/virtual-health-coach';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

export default async function PatientCoachPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Patient AI</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Virtual Health Coach</h1>
            <p className="max-w-2xl text-sm text-cyan-100">
              Ask symptom-based questions and get immediate next-step guidance.
            </p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Hackathon Wow Feature</p>
            <p className="text-2xl font-semibold">AI Coach Enabled</p>
          </div>
          <Bot className="h-5 w-5 text-slate-700" />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <VirtualHealthCoach />
        <Card>
          <CardHeader>
            <CardTitle>Suggested Prompts</CardTitle>
            <CardDescription>Try these for demo flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. I feel dizzy after taking my medication.</p>
            <p>2. My glucose trend seems high this week.</p>
            <p>3. I feel shortness of breath while walking.</p>
            <p>4. I missed a dose, what should I monitor now?</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
