import { redirect } from 'next/navigation';
import { CalendarCheck, Clock, PlusCircle } from 'lucide-react';

import { AppointmentBookingForm } from '@/components/patient/appointment-booking-form';
import { AppointmentsCalendar } from '@/components/patient/appointments-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

export default async function PatientAppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  const { data: appointmentsData, error } = await supabase
    .from('appointments')
    .select('id,date,type,status,meeting_link')
    .eq('patient_id', user.id)
    .order('date', { ascending: true })
    .limit(100);
  const appointments = appointmentsData ?? [];

  const stats = {
    total: appointments.length,
    pending: appointments.filter((item) => item.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Patient Portal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Appointments</h1>
            <p className="max-w-2xl text-sm text-cyan-100">Request video/clinic visits and track approval status.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
          <Button className="bg-white text-blue-900 hover:bg-blue-50">
            <PlusCircle className="mr-2 h-4 w-4" />
            Request Appointment
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <AppointmentBookingForm />
        <AppointmentsCalendar appointments={appointments} />
      </div>
    </div>
  );
}
