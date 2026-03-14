import { Siren } from 'lucide-react';
import { redirect } from 'next/navigation';

import { EmergencyPanel } from '@/components/patient/emergency-panel';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

type EmergencyContact = {
  id: number;
  contact_name: string;
  relation: string | null;
  phone: string;
};

type EmergencyEvent = {
  id: number;
  reason: string;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
};

export default async function PatientEmergencyPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  const { data: contactsData } = await supabase
    .from('emergency_contacts')
    .select('id,contact_name,relation,phone')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false });

  const { data: eventsData } = await supabase
    .from('emergency_events')
    .select('id,reason,status,created_at')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const contacts = (contactsData as EmergencyContact[] | null) ?? [];
  const events = (eventsData as EmergencyEvent[] | null) ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-rose-200">Emergency Workflow</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Rapid Care Escalation</h1>
            <p className="max-w-2xl text-sm text-rose-100">Trigger urgent incidents, keep emergency contacts ready, and notify care teams quickly.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Emergency Events</p>
            <p className="text-2xl font-semibold">{events.filter((item) => item.status === 'open').length}</p>
          </div>
          <Siren className="h-5 w-5 text-red-700" />
        </CardContent>
      </Card>

      <EmergencyPanel contacts={contacts} events={events} />
    </div>
  );
}
