'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { escalateAlert, type EscalateAlertState } from '@/app/doctor/alerts/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';

const initialState: EscalateAlertState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending} className="text-black hover:text-black">
      {pending ? 'Escalating...' : 'Escalate'}
    </Button>
  );
}

export function EscalateAlertForm({ alertId }: { alertId: number }) {
  const [state, action] = useFormState(escalateAlert, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Escalation created', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Escalation failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="alertId" value={alertId} />
      <input type="hidden" name="dueHours" value="4" />
      <SubmitButton />
    </form>
  );
}
