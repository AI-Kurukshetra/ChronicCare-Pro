'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type CreatePatientState, createPatient } from '@/app/doctor/dashboard/actions';

const initialState: CreatePatientState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Add Patient'}
    </Button>
  );
}

export function CreatePatientForm() {
  const [state, formAction] = useFormState(createPatient, initialState);

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById('create-patient-form') as HTMLFormElement | null;
      form?.reset();
    }
  }, [state.success]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Patient</CardTitle>
        <CardDescription>
          Create and assign a patient to your account. If email matches a patient login, vitals monitoring links automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="create-patient-form" action={formAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" placeholder="John Doe" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="john@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input id="age" name="age" type="number" min={0} max={130} placeholder="35" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="disease">Disease</Label>
            <Input id="disease" name="disease" placeholder="Diabetes / Hypertension / Heart Disease" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Diagnosis notes, allergies, or context"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <SubmitButton />
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
