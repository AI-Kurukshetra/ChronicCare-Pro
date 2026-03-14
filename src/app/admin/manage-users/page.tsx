import { redirect } from 'next/navigation';

import { RoleManager } from '@/components/admin/role-manager';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

export default async function ManageUsersPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = getUserRole(user);
  if (role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Admin Console</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Manage Users</h1>
          <p className="max-w-2xl text-sm text-blue-100">
            Central user directory for role governance, provider growth, and platform access oversight.
          </p>
          <p className="text-xs text-blue-200">{APP_TITLE}</p>
          <p className="text-xs text-blue-100">Signed in as {user.email}</p>
        </div>
      </section>

      <RoleManager />
    </div>
  );
}
