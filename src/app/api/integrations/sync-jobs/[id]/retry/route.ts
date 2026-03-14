import { NextResponse } from 'next/server';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type Params = {
  params: { id: string };
};

export async function POST(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const jobId = Number(params.id);
  if (!Number.isFinite(jobId)) {
    return NextResponse.json({ error: 'Invalid sync job id.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('sync_jobs')
    .update({
      status: 'queued',
      started_at: null,
      completed_at: null,
      error_message: null
    })
    .eq('id', jobId)
    .eq('status', 'failed');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('integration_logs').insert({
    sync_job_id: jobId,
    level: 'info',
    message: 'Sync job moved to queued for retry.',
    payload: { retried_by: user.id }
  });

  return NextResponse.json({ message: 'Sync job queued for retry.' });
}
