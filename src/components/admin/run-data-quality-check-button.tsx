'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { runDataQualityCheck, type RunDataQualityCheckState } from '@/app/admin/data-quality/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';

const initialState: RunDataQualityCheckState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Refreshing...' : 'Refresh Checks'}
    </Button>
  );
}

export function RunDataQualityCheckButton() {
  const [state, action] = useFormState(runDataQualityCheck, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Checks refreshed', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Refresh failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <form action={action}>
      <SubmitButton />
    </form>
  );
}
