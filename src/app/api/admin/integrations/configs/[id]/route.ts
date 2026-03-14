import { NextResponse } from 'next/server';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type UpdateConfigBody = {
  organizationId?: number | null;
  environment?: 'sandbox' | 'production';
  status?: 'active' | 'inactive';
  authType?: 'oauth2' | 'api_key';
  baseUrl?: string;
  scopes?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
};

function isEnvironment(value: unknown): value is 'sandbox' | 'production' {
  return value === 'sandbox' || value === 'production';
}

function isStatus(value: unknown): value is 'active' | 'inactive' {
  return value === 'active' || value === 'inactive';
}

function isAuthType(value: unknown): value is 'oauth2' | 'api_key' {
  return value === 'oauth2' || value === 'api_key';
}

type Params = {
  params: { id: string };
};

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const configId = Number(params.id);
  if (!Number.isFinite(configId)) {
    return NextResponse.json({ error: 'Invalid config id.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as UpdateConfigBody;

  if (body.environment !== undefined && !isEnvironment(body.environment)) {
    return NextResponse.json({ error: 'Invalid environment.' }, { status: 400 });
  }
  if (body.status !== undefined && !isStatus(body.status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }
  if (body.authType !== undefined && !isAuthType(body.authType)) {
    return NextResponse.json({ error: 'Invalid auth type.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (body.organizationId !== undefined) updates.organization_id = body.organizationId;
  if (body.environment !== undefined) updates.environment = body.environment;
  if (body.status !== undefined) updates.status = body.status;
  if (body.authType !== undefined) updates.auth_type = body.authType;
  if (body.baseUrl !== undefined) {
    const trimmed = body.baseUrl.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Base URL cannot be empty.' }, { status: 400 });
    }
    updates.base_url = trimmed;
  }
  if (body.scopes !== undefined) updates.scopes = body.scopes?.trim() || null;
  if (body.accessToken !== undefined) updates.encrypted_access_token = body.accessToken?.trim() || null;
  if (body.refreshToken !== undefined) updates.encrypted_refresh_token = body.refreshToken?.trim() || null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('integration_configs')
    .update(updates)
    .eq('id', configId)
    .select('id,organization_id,provider,environment,status,auth_type,base_url,scopes,last_synced_at,created_at,updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'integration_config_updated',
    target_type: 'integration_configs',
    target_id: String(data.id),
    metadata: {
      environment: data.environment,
      status: data.status,
      auth_type: data.auth_type
    }
  });

  return NextResponse.json({ config: data, message: 'Integration config updated.' });
}
