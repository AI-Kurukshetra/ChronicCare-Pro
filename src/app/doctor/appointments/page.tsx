import { redirect } from 'next/navigation';
import { CalendarCheck, Clock, PlusCircle } from 'lucide-react';

import { DoctorAppointmentsPanel } from '@/components/doctor/appointments-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

export default async function DoctorAppointmentsPage() {
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

  const { data: patients } = await supabase
    .from('patients')
    .select('id,user_id,full_name')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false });
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id,patient_id,date,type,status,meeting_link')
    .eq('doctor_id', user.id)
    .order('date', { ascending: true })
    .limit(100);

  const safePatients = patients ?? [];
  const safeAppointments = appointments ?? [];
  const patientNameByUserId = Object.fromEntries(
    safePatients.filter((patient) => patient.user_id).map((patient) => [patient.user_id as string, patient.full_name])
  ) as Record<string, string>;

  const stats = {
    total: safeAppointments.length,
    pending: safeAppointments.filter((item) => item.status === 'pending').length,
    approved: safeAppointments.filter((item) => item.status === 'approved').length
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-800/60 bg-gradient-to-r from-indigo-950 via-blue-900 to-cyan-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-indigo-200">Doctor Workspace</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Appointment Requests</h1>
            <p className="max-w-2xl text-sm text-indigo-100">
              Review patient appointment requests and approve or reject in one place.
            </p>
            <p className="text-xs text-indigo-200">{APP_TITLE}</p>
          </div>
          <Button className="bg-white text-indigo-900 hover:bg-indigo-50">
            <PlusCircle className="mr-2 h-4 w-4" />
            Schedule Follow-up
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-blue-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <CalendarCheck className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold">{stats.pending}</p>
            </div>
            <div className="rounded-full bg-orange-50 p-2">
              <Clock className="h-5 w-5 text-orange-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved</p>
              <p className="text-2xl font-semibold">{stats.approved}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <CalendarCheck className="h-5 w-5 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {!error && (
        <DoctorAppointmentsPanel appointments={safeAppointments} patientNameByUserId={patientNameByUserId} />
      )}
    </div>
  );
}
