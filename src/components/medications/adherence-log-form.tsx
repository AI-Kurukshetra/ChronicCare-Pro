'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { logMedicationAdherence, type MedicationAdherenceState } from '@/app/patient/medications/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';

const initialState: MedicationAdherenceState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending} className="text-black hover:text-black">
      {pending ? 'Saving...' : label}
    </Button>
  );
}

export function AdherenceLogForm({ medicationId, status }: { medicationId: number; status: 'taken' | 'missed' | 'skipped' }) {
  const [state, action] = useFormState(logMedicationAdherence, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Adherence logged', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Unable to log adherence', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <form action={action}>
      <input type="hidden" name="medicationId" value={medicationId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton label={status === 'taken' ? 'Mark Taken' : status === 'missed' ? 'Mark Missed' : 'Mark Skipped'} />
    </form>
  );
}
