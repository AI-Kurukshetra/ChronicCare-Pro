'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { assignCarePlan, type AssignCarePlanState } from '@/app/doctor/care-plans/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

type DoctorPatientOption = {
  user_id: string;
  full_name: string;
  disease: string | null;
};

const initialState: AssignCarePlanState = {};
const conditionOptions = ['Diabetes', 'Hypertension', 'Heart Disease', 'COPD', 'Chronic Kidney Disease', 'Other'];
const goalTemplates = [
  'Maintain fasting glucose under 130 mg/dL and improve weekly control consistency.',
  'Keep systolic blood pressure under 140 mmHg and reduce BP variability.',
  'Achieve medication adherence above 90% with daily reminders.',
  'Improve oxygen saturation stability and reduce low-oxygen episodes.'
];
const instructionTemplates = [
  'Log vitals twice daily and report unusual symptoms immediately in chat.',
  'Follow prescribed medication schedule, limit salt/sugar intake, and hydrate adequately.',
  'Walk at least 30 minutes daily if clinically appropriate and track weight weekly.',
  'Request follow-up appointment within 7 days if alerts remain elevated.'
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Assign Care Plan'}</Button>;
}

export function AssignCarePlanForm({ patients }: { patients: DoctorPatientOption[] }) {
  const [state, action] = useFormState(assignCarePlan, initialState);
  const { toast } = useToast();
  const [selectedCondition, setSelectedCondition] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [goals, setGoals] = useState('');
  const [instructions, setInstructions] = useState('');

  const patientConditionOptions = useMemo(
    () =>
      [...new Set(patients.map((item) => item.disease).filter((value): value is string => Boolean(value && value.trim())))]
        .sort((a, b) => a.localeCompare(b)),
    [patients]
  );

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById('assign-care-plan-form') as HTMLFormElement | null;
      form?.reset();
      setSelectedCondition('');
      setCustomCondition('');
      setGoals('');
      setInstructions('');
      toast({ title: 'Care plan assigned', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Assignment failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  const resolvedCondition =
    selectedCondition === 'Other' ? customCondition.trim() : selectedCondition.trim();

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Assign Care Plan</CardTitle>
        <CardDescription>Use dropdown templates for faster, consistent care plan assignment.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="assign-care-plan-form" action={action} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="patientUserId">Patient</Label>
            <select id="patientUserId" name="patientUserId" className="h-9 w-full rounded-md border bg-background px-3 text-sm" required>
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.user_id} value={patient.user_id}>
                  {patient.full_name} {patient.disease ? `• ${patient.disease}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="condition">Condition</Label>
            <select
              id="condition"
              value={selectedCondition}
              onChange={(event) => setSelectedCondition(event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              required
            >
              <option value="">Select condition</option>
              {patientConditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
              {conditionOptions
                .filter((condition) => !patientConditionOptions.includes(condition))
                .map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
            </select>
            <input type="hidden" name="condition" value={resolvedCondition} />
          </div>

          {selectedCondition === 'Other' && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customCondition">Custom Condition</Label>
              <Input
                id="customCondition"
                value={customCondition}
                onChange={(event) => setCustomCondition(event.target.value)}
                placeholder="Enter specific condition"
                required
              />
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="goalTemplate">Goal Template</Label>
            <select
              id="goalTemplate"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) setGoals(event.target.value);
              }}
            >
              <option value="">Select goal template</option>
              {goalTemplates.map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="goals">Care Goals</Label>
            <textarea
              id="goals"
              name="goals"
              rows={3}
              required
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Maintain fasting glucose under 130 mg/dL and reduce BP variability."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="instructionTemplate">Instruction Template</Label>
            <select
              id="instructionTemplate"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) setInstructions(event.target.value);
              }}
            >
              <option value="">Select instruction template</option>
              {instructionTemplates.map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="instructions">Instructions</Label>
            <textarea
              id="instructions"
              name="instructions"
              rows={4}
              required
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Log vitals twice daily, follow meal plan, and report dizziness immediately."
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
