import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, Bot, BookOpenText, CalendarCheck, ClipboardCheck, MessageSquare, Pill, Sparkles, TriangleAlert } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { VitalsTrendsChart } from '@/components/vitals/vitals-trends-chart';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';
import { type VitalReading } from '@/lib/vitals';

export default async function PatientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = getUserRole(user);
  if (role !== 'patient') {
    redirect('/login');
  }

  const { count: vitalsCount } = await supabase
    .from('vitals')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', user.id);
  const { count: appointmentsCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', user.id);
  const { count: medicationsCount } = await supabase
    .from('medications')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', user.id);
  const { data: latestVitalsData } = await supabase
    .from('vitals')
    .select('id,patient_id,type,value,timestamp')
    .eq('patient_id', user.id)
    .order('timestamp', { ascending: false })
    .limit(40);
  const { data: nextMedication } = await supabase
    .from('medications')
    .select('medicine_name,dosage,schedule,reminder_time,created_at')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: nextAppointment } = await supabase
    .from('appointments')
    .select('date,type,status,meeting_link')
    .eq('patient_id', user.id)
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();
  const latestVitals = (latestVitalsData as VitalReading[] | null) ?? [];

  const dailyHealthScore = (() => {
    let score = 82;
    const latestGlucose = latestVitals.find((v) => v.type === 'glucose');
    const latestBp = latestVitals.find((v) => v.type === 'bp');
    const latestOxygen = latestVitals.find((v) => v.type === 'oxygen');
    if (latestGlucose && Number(latestGlucose.value) > 200) score -= 20;
    if (latestBp && Number(latestBp.value.split('/')[0]) > 140) score -= 15;
    if (latestOxygen && Number(latestOxygen.value) < 90) score -= 20;
    return Math.max(40, Math.min(98, score));
  })();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_45%)]" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Patient Portal</p>
          <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Your ChronicCare Health Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Track vitals, medication reminders, appointments, and AI health recommendations in one place.
          </p>
          <p className="mt-1 text-xs text-blue-200">{APP_TITLE}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vitals Logged</p>
              <p className="text-2xl font-semibold">{vitalsCount ?? 0}</p>
            </div>
            <Activity className="h-5 w-5 text-slate-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Appointments</p>
              <p className="text-2xl font-semibold">{appointmentsCount ?? 0}</p>
            </div>
            <CalendarCheck className="h-5 w-5 text-slate-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Medications</p>
              <p className="text-2xl font-semibold">{medicationsCount ?? 0}</p>
            </div>
            <Pill className="h-5 w-5 text-slate-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Daily Health Score</p>
              <p className="text-2xl font-semibold">{dailyHealthScore}</p>
            </div>
            <Sparkles className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <VitalsTrendsChart vitals={latestVitals} title="Vitals Chart Trends" />
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest Vitals</p>
              {latestVitals.slice(0, 3).map((item) => (
                <p key={item.id} className="mt-2 text-sm">
                  {item.type.toUpperCase()}: <span className="font-medium">{item.value}</span>
                </p>
              ))}
              {latestVitals.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No vitals logged yet.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Medication Reminder</p>
              {nextMedication ? (
                <>
                  <p className="mt-2 text-sm font-medium">{nextMedication.medicine_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {nextMedication.dosage} • {nextMedication.schedule}
                  </p>
                  <p className="text-sm text-muted-foreground">Reminder: {nextMedication.reminder_time}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No medication assigned yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Upcoming Appointment</p>
              {nextAppointment ? (
                <>
                  <p className="mt-2 text-sm font-medium capitalize">{nextAppointment.type} consultation</p>
                  <p className="text-sm text-muted-foreground">{new Date(nextAppointment.date).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground capitalize">Status: {nextAppointment.status}</p>
                  {nextAppointment.type === 'video' && nextAppointment.status === 'approved' && nextAppointment.meeting_link && (
                    <a
                      href={nextAppointment.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex rounded-md border px-3 py-1 text-xs font-medium text-black hover:bg-slate-50"
                    >
                      Join Video Call
                    </a>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No upcoming appointments.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink href="/patient/vitals" title="Vitals" desc="Add readings, view history, and chart trends." icon={<Activity className="h-5 w-5 text-slate-700" />} />
        <QuickLink
          href="/patient/appointments"
          title="Appointments"
          desc="Request and track appointment approvals."
          icon={<CalendarCheck className="h-5 w-5 text-slate-700" />}
        />
        <QuickLink
          href="/patient/medications"
          title="Medications"
          desc="View your schedule and reminder times."
          icon={<Pill className="h-5 w-5 text-slate-700" />}
        />
        <QuickLink href="/patient/chat" title="Chat" desc="Message your assigned doctor in real-time." icon={<MessageSquare className="h-5 w-5 text-slate-700" />} />
        <QuickLink href="/patient/ai" title="AI Insights" desc="Run risk, recommendation, and anomaly analysis." icon={<Sparkles className="h-5 w-5 text-slate-700" />} />
        <QuickLink href="/patient/coach" title="AI Coach" desc="Ask symptom questions and get instant guidance." icon={<Bot className="h-5 w-5 text-slate-700" />} />
        <QuickLink href="/patient/care-plan" title="Care Plan" desc="Follow goals and instructions assigned by your doctor." icon={<ClipboardCheck className="h-5 w-5 text-slate-700" />} />
        <QuickLink href="/patient/education" title="Education" desc="Access chronic disease guides and lifestyle tips." icon={<BookOpenText className="h-5 w-5 text-slate-700" />} />
        <QuickLink href="/patient/emergency" title="Emergency" desc="Trigger urgent escalation and manage emergency contacts." icon={<TriangleAlert className="h-5 w-5 text-slate-700" />} />
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: ReactNode }) {
  return (
    <Link href={href} className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-2">{icon}</div>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
