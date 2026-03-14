'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Search } from 'lucide-react';

import {
  assignMedicationFromManager,
  type AssignMedicationFromManagerState
} from '@/app/doctor/medications/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

type PatientOption = {
  id: number;
  full_name: string;
  disease: string | null;
  user_id: string;
};

const initialState: AssignMedicationFromManagerState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Assigning...' : 'Assign Medication'}
    </Button>
  );
}

export function MedicationManagerForm({
  patients,
  medicineOptions
}: {
  patients: PatientOption[];
  medicineOptions: string[];
}) {
  const [state, action] = useFormState(assignMedicationFromManager, initialState);
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return medicineOptions.slice(0, 10);
    return medicineOptions.filter((item) => item.toLowerCase().includes(q)).slice(0, 10);
  }, [medicineOptions, query]);

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById('doctor-medication-manager-form') as HTMLFormElement | null;
      form?.reset();
      toast({ title: 'Medication assigned', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Assignment failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Assign Medication to Patient</CardTitle>
        <CardDescription>Search existing medicines or type a new one, then assign with schedule.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form id="doctor-medication-manager-form" action={action} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="patientRecordId">Patient</Label>
            <select id="patientRecordId" name="patientRecordId" className="h-9 w-full rounded-md border bg-background px-3 text-sm" required>
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name}{patient.disease ? ` • ${patient.disease}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicineName">Medicine Name</Label>
            <Input
              id="medicineName"
              name="medicineName"
              list="doctor-medicine-options"
              placeholder="e.g. Metformin"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              required
            />
            <datalist id="doctor-medicine-options">
              {filtered.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
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
