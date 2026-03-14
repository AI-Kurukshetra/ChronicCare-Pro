'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { updatePatientProfile, type UpdatePatientProfileState } from '@/app/patient/settings/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

const initialState: UpdatePatientProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

export function PatientSettingsForm({
  defaults
}: {
  defaults: {
    fullName: string;
    phone: string;
    age: string;
    condition: string;
    gender: string;
    diagnosisYears: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
}) {
  const [state, action] = useFormState(updatePatientProfile, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast({ title: 'Profile updated', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Update failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Keep your health profile updated for better care coordination.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" defaultValue={defaults.fullName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={defaults.phone} placeholder="+1..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input id="age" name="age" type="number" min={0} max={130} defaultValue={defaults.age} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition">Primary Condition</Label>
            <Input id="condition" name="condition" defaultValue={defaults.condition} placeholder="Diabetes" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" name="gender" defaultValue={defaults.gender} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diagnosisYears">Years Since Diagnosis</Label>
            <Input id="diagnosisYears" name="diagnosisYears" type="number" min={0} max={80} defaultValue={defaults.diagnosisYears} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={defaults.emergencyContactName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={defaults.emergencyContactPhone} placeholder="+1..." />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
