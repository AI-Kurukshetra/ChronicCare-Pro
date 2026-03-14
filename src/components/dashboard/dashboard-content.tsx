import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_TITLE } from '@/lib/branding';
import { AppRole } from '@/lib/auth/roles';
import { RealtimeEvents } from './realtime-events';
import { SignOutButton } from './sign-out-button';

const roleTitle: Record<AppRole, string> = {
  patient: 'Patient Dashboard',
  doctor: 'Doctor Dashboard',
  admin: 'Admin Dashboard'
};

export function DashboardContent({ role, email }: { role: AppRole; email: string | undefined }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{roleTitle[role]}</CardTitle>
          <SignOutButton />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Signed in as {email}</p>
          <p className="mt-2 text-sm text-muted-foreground">Role: {role}</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{APP_TITLE}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an <code>events</code> table in Supabase Postgres and enable realtime for it.
          </p>
        </CardContent>
      </Card>

      <RealtimeEvents />
    </div>
  );
}
