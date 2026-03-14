'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { askVirtualHealthCoach, type HealthCoachState } from '@/app/patient/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const initialState: HealthCoachState = {};

function AskButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Thinking...' : 'Ask Coach'}</Button>;
}

export function VirtualHealthCoach() {
  const [state, action] = useFormState(askVirtualHealthCoach, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Virtual Health Coach</CardTitle>
        <CardDescription>
          Share how you feel and get immediate guidance for what to check next.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="message">Your symptom or question</Label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Example: I feel dizzy and weak after lunch."
            />
          </div>
          <AskButton />
        </form>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        {state.response && (
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Coach Response</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{state.response}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          This assistant provides guidance only and does not replace medical diagnosis.
        </p>
      </CardContent>
    </Card>
  );
}
