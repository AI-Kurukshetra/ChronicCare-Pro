'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { addVital, type AddVitalState } from '@/app/patient/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { vitalTypes } from '@/lib/vitals';

const initialState: AddVitalState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Add Reading'}
    </Button>
  );
}

export function VitalForm() {
  const [state, formAction] = useFormState(addVital, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById('add-vital-form') as HTMLFormElement | null;
      form?.reset();
      toast({ title: 'Vital added', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Unable to add vital', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Add Vitals</CardTitle>
        <CardDescription>Log your latest health readings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="add-vital-form" action={formAction} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" className="h-9 w-full rounded-md border bg-background px-3 text-sm" defaultValue="bp" required>
              {vitalTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="value">Value</Label>
            <Input id="value" name="value" placeholder="120/80 (bp) or 92 (oxygen)" required />
          </div>

          <div className="md:col-span-3 flex items-center gap-3">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
