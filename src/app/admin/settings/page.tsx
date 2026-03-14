import { KeyRound, ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';

import { AdminSettingsForm } from '@/components/settings/admin-settings-form';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'admin') redirect('/login');

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Admin Console</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Settings</h1>
          <p className="max-w-2xl text-sm text-blue-100">Manage admin account profile and security controls.</p>
          <p className="text-xs text-blue-200">{APP_TITLE}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-blue-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Account Email</p>
              <p className="text-sm font-medium">{user.email ?? 'N/A'}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Security</p>
              <p className="text-sm font-medium">Password rotation supported</p>
            </div>
            <div className="rounded-full bg-violet-50 p-2">
              <KeyRound className="h-5 w-5 text-violet-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminSettingsForm
        defaults={{
          fullName: String(metadata.full_name ?? ''),
          phone: String(metadata.phone ?? '')
        }}
      />
    </div>
  );
}
