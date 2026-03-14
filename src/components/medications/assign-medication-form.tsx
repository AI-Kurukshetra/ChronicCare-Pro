'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { assignMedication, type AssignMedicationState } from '@/app/doctor/patients/[id]/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

const initialState: AssignMedicationState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Assigning...' : 'Assign Medication'}
    </Button>
  );
}

export function AssignMedicationForm({
  patientRecordId,
  patientUserId
}: {
  patientRecordId: string;
  patientUserId: string;
}) {
  const [state, formAction] = useFormState(assignMedication, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById(`assign-medication-${patientRecordId}`) as HTMLFormElement | null;
      form?.reset();
      toast({ title: 'Medication assigned', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Assignment failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, patientRecordId, toast]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Assign Medication</CardTitle>
        <CardDescription>Create a medication plan and reminder time for this patient.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id={`assign-medication-${patientRecordId}`} action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="patientRecordId" value={patientRecordId} />
          <input type="hidden" name="patientUserId" value={patientUserId} />

          <div className="space-y-2">
            <Label htmlFor="medicineName">Medicine</Label>
            <Input id="medicineName" name="medicineName" placeholder="Metformin" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dosage">Dosage</Label>
            <Input id="dosage" name="dosage" placeholder="500mg" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule</Label>
            <Input id="schedule" name="schedule" placeholder="Twice daily after meals" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminderTime">Reminder Time</Label>
            <Input id="reminderTime" name="reminderTime" type="time" required />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
