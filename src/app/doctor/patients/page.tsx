import { redirect } from 'next/navigation';
import { PlusCircle, UserRound, UserRoundCheck } from 'lucide-react';

import { CreatePatientForm } from '@/components/doctor/create-patient-form';
import { PatientsPanel } from '@/components/doctor/patients-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

export default async function DoctorPatientsPage() {
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

  const { data: patients, error } = await supabase
    .from('patients')
    .select('id,user_id,full_name,email,age,disease,created_at')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false });

  const safePatients = patients ?? [];
  const stats = {
    total: safePatients.length,
    withEmail: safePatients.filter((patient) => Boolean(patient.email)).length
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-800/70 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Doctor Workspace</p>
            <h1 className="text-2xl font-semibold md:text-3xl">My Patients</h1>
            <p className="max-w-2xl text-sm text-blue-100">
              Build and monitor your panel with fast access to patient records and chronic condition summaries.
            </p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
          <Button className="bg-white text-blue-900 hover:bg-blue-50">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-blue-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Patients</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <UserRound className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Accounts</p>
              <p className="text-2xl font-semibold">{stats.withEmail}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <UserRoundCheck className="h-5 w-5 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <CreatePatientForm />

      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {!error && <PatientsPanel patients={safePatients} />}
    </div>
  );
}
