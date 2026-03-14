import { AppShellClient } from '@/components/layout/app-shell-client';
import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const role = getUserRole(user);
  const userName = (user?.user_metadata?.full_name as string | undefined) ?? null;
  const userEmail = user?.email ?? null;

  return (
    <AppShellClient role={role} isAuthenticated={Boolean(user)} userName={userName} userEmail={userEmail}>
      {children}
    </AppShellClient>
  );
}
