import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { AiHealthAnalysis } from '@/components/patient/ai-health-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VitalsTrendsChart } from '@/components/vitals/vitals-trends-chart';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';
import { type VitalReading } from '@/lib/vitals';

export default async function PatientAiPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  const { data: vitalsData, error } = await supabase
    .from('vitals')
    .select('id,patient_id,type,value,timestamp')
    .eq('patient_id', user.id)
    .order('timestamp', { ascending: false })
    .limit(100);
  const vitals = (vitalsData as VitalReading[] | null) ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-200">Patient Portal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">AI Health Insights</h1>
            <p className="max-w-2xl text-sm text-fuchsia-100">
              Generate risk score, observations, recommendations, and anomaly detection from your vitals history.
            </p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Vitals Available For AI</p>
            <p className="text-2xl font-semibold">{vitals.length}</p>
          </div>
          <Sparkles className="h-5 w-5 text-slate-700" />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <AiHealthAnalysis />
        <VitalsTrendsChart vitals={vitals} title="Vitals Trend Context" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How To Use AI Output</CardTitle>
          <CardDescription>Use this analysis as guidance and discuss decisions with your doctor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Run analysis after adding recent vitals.</p>
          <p>2. Track if risk score is rising over time.</p>
          <p>3. Share recommendations with your doctor during chat or appointment.</p>
        </CardContent>
      </Card>
    </div>
  );
}
