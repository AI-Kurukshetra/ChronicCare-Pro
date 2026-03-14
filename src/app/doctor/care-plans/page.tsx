import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { redirect } from 'next/navigation';

import { updateCarePlanStatus } from '@/app/doctor/care-plans/actions';
import { AssignCarePlanForm } from '@/components/care-plans/assign-care-plan-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDateTime } from '@/lib/date-format';
import { createClient } from '@/lib/supabase/server';

type PatientRow = {
  user_id: string | null;
  full_name: string;
  disease: string | null;
};

type CarePlanRow = {
  id: number;
  patient_id: string;
  condition: string;
  goals: string;
  instructions: string;
  status: 'active' | 'completed';
  created_at: string;
};

export default async function DoctorCarePlansPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'doctor') redirect('/login');

  const { data: patientsData } = await supabase
    .from('patients')
    .select('user_id,full_name,disease')
    .eq('doctor_id', user.id)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false });

  const { data: carePlansData } = await supabase
    .from('care_plans')
    .select('id,patient_id,condition,goals,instructions,status,created_at')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const patients = (patientsData as PatientRow[] | null) ?? [];
  const carePlans = (carePlansData as CarePlanRow[] | null) ?? [];
  const patientNameByUserId = Object.fromEntries(
    patients.filter((p) => p.user_id).map((p) => [p.user_id as string, p.full_name])
  ) as Record<string, string>;

  const stats = {
    total: carePlans.length,
    active: carePlans.filter((item) => item.status === 'active').length,
    completed: carePlans.filter((item) => item.status === 'completed').length
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-indigo-800/60 bg-gradient-to-r from-indigo-950 via-blue-900 to-cyan-900 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Doctor Workspace</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Care Plan Management</h1>
            <p className="max-w-2xl text-sm text-blue-100">Assign structured goals and track progress for chronic care patients.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Plans</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
            <ClipboardList className="h-5 w-5 text-slate-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{stats.active}</p>
            </div>
            <ClipboardList className="h-5 w-5 text-blue-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold">{stats.completed}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </CardContent>
        </Card>
      </div>

      {patients.length > 0 ? (
        <AssignCarePlanForm
          patients={patients
            .filter((item) => item.user_id)
            .map((item) => ({ user_id: item.user_id as string, full_name: item.full_name, disease: item.disease }))}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Linked Patients</CardTitle>
            <CardDescription>Link patient user accounts in My Patients to start assigning care plans.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assigned Plans</CardTitle>
          <CardDescription>Review, monitor, and mark plans as completed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {carePlans.length === 0 && <p className="text-sm text-muted-foreground">No care plans created yet.</p>}
          {carePlans.map((plan) => (
            <div key={plan.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{plan.condition}</p>
                  <p className="text-xs text-muted-foreground">
                    {patientNameByUserId[plan.patient_id] ?? 'Patient'} • {formatUtcDateTime(plan.created_at)}
                  </p>
                </div>
                <span
                  className={plan.status === 'active' ? 'rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700' : 'rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700'}
                >
                  {plan.status}
                </span>
              </div>
              <p className="mt-3 text-sm"><span className="font-medium">Goals:</span> {plan.goals}</p>
              <p className="mt-1 text-sm"><span className="font-medium">Instructions:</span> {plan.instructions}</p>
              <form action={updateCarePlanStatus} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="carePlanId" value={plan.id} />
                <select
                  name="status"
                  defaultValue={plan.status}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                </select>
                <Button size="sm" variant="outline" type="submit">Update Status</Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
