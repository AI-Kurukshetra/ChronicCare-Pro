'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { resolveAlert, type ResolveAlertState } from '@/app/doctor/alerts/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';

const initialState: ResolveAlertState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? 'Saving...' : 'Mark Resolved'}
    </Button>
  );
}

export function ResolveAlertForm({ alertId }: { alertId: number }) {
  const [state, action] = useFormState(resolveAlert, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Alert updated', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Action failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <form action={action}>
      <input type="hidden" name="alertId" value={alertId} />
      <SubmitButton />
    </form>
  );
}
