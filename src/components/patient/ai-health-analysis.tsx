'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { analyzeHealthWithAI, type AiHealthState } from '@/app/patient/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const initialState: AiHealthState = {};

function AnalyzeButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Analyzing...' : 'Run AI Analysis'}
    </Button>
  );
}

export function AiHealthAnalysis() {
  const [state, action] = useFormState(analyzeHealthWithAI, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Health Intelligence</CardTitle>
        <CardDescription>Risk score, observations, recommendations, and anomaly detection from vitals history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action}>
          <AnalyzeButton />
        </form>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        {state.result && (
          <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
            <p className="text-sm font-semibold">Risk Score: {state.result.riskScore}%</p>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Observation</p>
              <p className="text-sm">{state.result.observation}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</p>
              <p className="text-sm">{state.result.recommendation}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Anomaly Detection</p>
              <p className="text-sm">{state.result.anomalyDetection}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
