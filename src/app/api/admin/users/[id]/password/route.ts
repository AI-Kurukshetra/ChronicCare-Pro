import { NextResponse, type NextRequest } from 'next/server';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

type Params = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  void request;
  void params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(
    { error: 'Password updates are disabled in admin. Users should manage credentials via auth flows.' },
    { status: 405 }
  );
}
