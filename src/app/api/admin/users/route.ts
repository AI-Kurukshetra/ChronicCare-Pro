import { NextResponse } from 'next/server';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = data.users.map((item) => ({
    id: item.id,
    email: item.email,
    role: item.app_metadata?.role ?? null,
    created_at: item.created_at
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: 'User creation and invites are disabled. Ask users to sign up from the public signup page.' },
    { status: 405 }
  );
}
