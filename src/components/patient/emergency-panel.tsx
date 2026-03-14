'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import {
  addEmergencyContact,
  triggerEmergency,
  type EmergencyContactState,
  type EmergencyTriggerState
} from '@/app/patient/emergency/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialContactState: EmergencyContactState = {};
const initialTriggerState: EmergencyTriggerState = {};

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Submitting...' : text}</Button>;
}

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

export function EmergencyPanel({
  contacts,
  events
}: {
  contacts: EmergencyContact[];
  events: EmergencyEvent[];
}) {
  const [contactState, contactAction] = useFormState(addEmergencyContact, initialContactState);
  const [triggerState, triggerAction] = useFormState(triggerEmergency, initialTriggerState);

  useEffect(() => {
    if (contactState.success) {
      const form = document.getElementById('emergency-contact-form') as HTMLFormElement | null;
      form?.reset();
    }
  }, [contactState.success]);

  useEffect(() => {
    if (triggerState.success) {
      const form = document.getElementById('emergency-trigger-form') as HTMLFormElement | null;
      form?.reset();
    }
  }, [triggerState.success]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Emergency Escalation</CardTitle>
          <CardDescription>Use this for urgent symptoms so your doctor team is alerted quickly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form id="emergency-trigger-form" action={triggerAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <textarea
                id="reason"
                name="reason"
                rows={4}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Example: Dizziness with low sugar readings and weakness for 20 minutes."
              />
            </div>
            <SubmitButton text="Trigger Emergency" />
          </form>
          {triggerState.error && <p className="text-sm text-red-600">{triggerState.error}</p>}
          {triggerState.success && <p className="text-sm text-emerald-700">{triggerState.success}</p>}

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Emergency Events</p>
            {events.length === 0 && <p className="text-sm text-muted-foreground">No emergency events submitted.</p>}
            {events.map((item) => (
              <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Event #{item.id}</p>
                  <span
                    className={
                      item.status === 'open'
                        ? 'text-xs text-red-700'
                        : item.status === 'acknowledged'
                          ? 'text-xs text-amber-700'
                          : 'text-xs text-emerald-700'
                    }
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contacts</CardTitle>
          <CardDescription>Add trusted contacts for rapid coordination during incidents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form id="emergency-contact-form" action={contactAction} className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" placeholder="Jane Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relation">Relation</Label>
              <Input id="relation" name="relation" placeholder="Spouse / Daughter / Friend" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+91 98XXXXXXXX" required />
            </div>
            <SubmitButton text="Add Contact" />
          </form>
          {contactState.error && <p className="text-sm text-red-600">{contactState.error}</p>}
          {contactState.success && <p className="text-sm text-emerald-700">{contactState.success}</p>}

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saved Contacts</p>
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">No emergency contacts added yet.</p>}
            {contacts.map((item) => (
              <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                <p className="font-medium">{item.contact_name}</p>
                <p className="text-sm text-muted-foreground">{item.relation ?? 'N/A'} • {item.phone}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
