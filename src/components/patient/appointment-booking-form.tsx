'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { requestAppointment, type RequestAppointmentState } from '@/app/patient/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

const initialState: RequestAppointmentState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Requesting...' : 'Request Appointment'}
    </Button>
  );
}

export function AppointmentBookingForm() {
  const [state, formAction] = useFormState(requestAppointment, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById('appointment-request-form') as HTMLFormElement | null;
      form?.reset();
      toast({ title: 'Appointment requested', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Request failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Book Appointment</CardTitle>
        <CardDescription>Request a video or clinic appointment with your assigned doctor.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="appointment-request-form" action={formAction} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="date">Date & Time</Label>
            <input
              id="date"
              name="date"
              type="datetime-local"
              required
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" defaultValue="video" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="video">video</option>
              <option value="clinic">clinic</option>
            </select>
          </div>
          <div className="md:self-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
