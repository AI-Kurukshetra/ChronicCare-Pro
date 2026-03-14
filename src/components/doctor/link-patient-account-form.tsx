'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { linkPatientAccount, type LinkPatientAccountState } from '@/app/doctor/patients/[id]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

const initialState: LinkPatientAccountState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Linking...' : 'Link Account'}
    </Button>
  );
}

export function LinkPatientAccountForm({ patientRecordId, email }: { patientRecordId: number; email: string | null }) {
  const [state, action] = useFormState(linkPatientAccount, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Account linked', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Link failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-white p-4">
      <input type="hidden" name="patientRecordId" value={patientRecordId} />
      <p className="text-sm font-medium">Link Existing Patient Login</p>
      <div className="space-y-2">
        <Label htmlFor="patientLinkEmail">Patient Email</Label>
        <Input id="patientLinkEmail" name="email" type="email" defaultValue={email ?? ''} placeholder="patient@email.com" required />
      </div>
      <p className="text-xs text-muted-foreground">
        This links the profile to an existing patient account created from signup.
      </p>
      <SubmitButton />
    </form>
  );
}
