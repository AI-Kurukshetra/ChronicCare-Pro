import { redirect } from 'next/navigation';

import { getDashboardPathByRole, getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = getUserRole(user);
  if (!role) {
    redirect('/login');
  }

  redirect(getDashboardPathByRole(role));
}
