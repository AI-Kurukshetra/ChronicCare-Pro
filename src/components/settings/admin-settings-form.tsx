'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { updateAdminSettings, type UpdateAdminSettingsState } from '@/app/admin/settings/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

const initialState: UpdateAdminSettingsState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Settings'}</Button>;
}

export function AdminSettingsForm({ defaults }: { defaults: { fullName: string; phone: string } }) {
  const [state, action] = useFormState(updateAdminSettings, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Settings saved', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Update failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Admin Profile & Security</CardTitle>
        <CardDescription>Update your profile and optionally rotate your password.</CardDescription>
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="newPassword">New Password (Optional)</Label>
            <Input id="newPassword" name="newPassword" type="password" minLength={6} placeholder="Leave blank to keep current password" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
