import { ClipboardCheck } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDateTime } from '@/lib/date-format';
import { createClient } from '@/lib/supabase/server';

type CarePlanRow = {
  id: number;
  condition: string;
  goals: string;
  instructions: string;
  status: 'active' | 'completed';
  created_at: string;
};

export default async function PatientCarePlanPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  const { data: plansData } = await supabase
    .from('care_plans')
    .select('id,condition,goals,instructions,status,created_at')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false });

  const plans = (plansData as CarePlanRow[] | null) ?? [];
  const activeCount = plans.filter((item) => item.status === 'active').length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Patient Portal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">My Care Plan</h1>
            <p className="max-w-2xl text-sm text-emerald-100">Follow your doctor-defined goals and daily instructions for chronic disease control.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Care Plans</p>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </div>
          <ClipboardCheck className="h-5 w-5 text-slate-700" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Timeline</CardTitle>
          <CardDescription>Most recent plans from your assigned doctor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.length === 0 && <p className="text-sm text-muted-foreground">No care plan assigned yet.</p>}
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{plan.condition}</p>
                <span className={plan.status === 'active' ? 'rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700' : 'rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700'}>{plan.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatUtcDateTime(plan.created_at)}</p>
              <p className="mt-3 text-sm"><span className="font-medium">Goals:</span> {plan.goals}</p>
              <p className="mt-1 text-sm"><span className="font-medium">Instructions:</span> {plan.instructions}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
