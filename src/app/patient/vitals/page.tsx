import { redirect } from 'next/navigation';
import { Activity, HeartPulse, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VitalForm } from '@/components/vitals/vital-form';
import { VitalsHistory } from '@/components/vitals/vitals-history';
import { VitalsTrendsChart } from '@/components/vitals/vitals-trends-chart';
import { formatUtcDate } from '@/lib/date-format';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';
import { type VitalReading } from '@/lib/vitals';

export default async function PatientVitalsPage() {
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
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Patient Portal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Vitals</h1>
            <p className="max-w-2xl text-sm text-cyan-100">
              Log daily readings and track your health trends to keep your care team updated in real time.
            </p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
          <Button className="bg-white text-blue-900 hover:bg-blue-50">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Reading
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-blue-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Readings</p>
              <p className="text-2xl font-semibold">{vitals.length}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <Activity className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest Reading</p>
              <p className="text-2xl font-semibold">{vitals[0] ? formatUtcDate(vitals[0].timestamp) : 'N/A'}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <HeartPulse className="h-5 w-5 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <VitalForm />
      <div className="grid gap-4 xl:grid-cols-2">
        <VitalsTrendsChart vitals={vitals} />
        <VitalsHistory vitals={vitals.slice(0, 20)} />
      </div>
    </div>
  );
}
