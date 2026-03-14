'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { updateDoctorProfile, type UpdateDoctorProfileState } from '@/app/doctor/settings/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

const initialState: UpdateDoctorProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

export function DoctorSettingsForm({
  defaults
}: {
  defaults: {
    fullName: string;
    phone: string;
    specialty: string;
    experienceYears: string;
    clinicName: string;
    licenseNumber: string;
  };
}) {
  const [state, action] = useFormState(updateDoctorProfile, initialState);
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
        <CardDescription>Update your doctor profile used across the care platform.</CardDescription>
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
            <Label htmlFor="specialty">Specialty</Label>
            <Input id="specialty" name="specialty" defaultValue={defaults.specialty} placeholder="Cardiology" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experienceYears">Years of Experience</Label>
            <Input id="experienceYears" name="experienceYears" type="number" min={0} max={60} defaultValue={defaults.experienceYears} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicName">Clinic/Hospital</Label>
            <Input id="clinicName" name="clinicName" defaultValue={defaults.clinicName} placeholder="City Care Clinic" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input id="licenseNumber" name="licenseNumber" defaultValue={defaults.licenseNumber} placeholder="License ID" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
