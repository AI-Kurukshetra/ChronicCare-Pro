import { NextResponse } from 'next/server';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type CreateConfigBody = {
  organizationId?: number | null;
  provider?: 'fhir' | 'epic' | 'cerner' | 'custom';
  environment?: 'sandbox' | 'production';
  status?: 'active' | 'inactive';
  authType?: 'oauth2' | 'api_key';
  baseUrl?: string;
  scopes?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
};

function isProvider(value: unknown): value is 'fhir' | 'epic' | 'cerner' | 'custom' {
  return value === 'fhir' || value === 'epic' || value === 'cerner' || value === 'custom';
}

function isEnvironment(value: unknown): value is 'sandbox' | 'production' {
  return value === 'sandbox' || value === 'production';
}

function isStatus(value: unknown): value is 'active' | 'inactive' {
  return value === 'active' || value === 'inactive';
}

function isAuthType(value: unknown): value is 'oauth2' | 'api_key' {
  return value === 'oauth2' || value === 'api_key';
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const [configsRes, orgsRes] = await Promise.all([
    admin
      .from('integration_configs')
      .select('id,organization_id,provider,environment,status,auth_type,base_url,scopes,last_synced_at,created_at,updated_at')
      .order('created_at', { ascending: false }),
    admin.from('organizations').select('id,name,slug').order('created_at', { ascending: false })
  ]);

  if (configsRes.error) {
    return NextResponse.json({ error: configsRes.error.message }, { status: 500 });
  }
  if (orgsRes.error) {
    return NextResponse.json({ error: orgsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    configs: configsRes.data ?? [],
    organizations: orgsRes.data ?? []
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateConfigBody;

  if (!isProvider(body.provider)) {
    return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 });
  }
  if (!isEnvironment(body.environment)) {
    return NextResponse.json({ error: 'Invalid environment.' }, { status: 400 });
  }
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }
  if (!isAuthType(body.authType)) {
    return NextResponse.json({ error: 'Invalid auth type.' }, { status: 400 });
  }

  const baseUrl = String(body.baseUrl ?? '').trim();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Base URL is required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('integration_configs')
    .insert({
      organization_id: typeof body.organizationId === 'number' ? body.organizationId : null,
      provider: body.provider,
      environment: body.environment,
      status: body.status,
      auth_type: body.authType,
      base_url: baseUrl,
      scopes: body.scopes?.trim() || null,
      encrypted_access_token: body.accessToken?.trim() || null,
      encrypted_refresh_token: body.refreshToken?.trim() || null,
      created_by: user.id,
      updated_at: new Date().toISOString()
    })
    .select('id,organization_id,provider,environment,status,auth_type,base_url,scopes,last_synced_at,created_at,updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'integration_config_created',
    target_type: 'integration_configs',
    target_id: String(data.id),
    metadata: {
      provider: data.provider,
      environment: data.environment,
      status: data.status
    }
  });

  return NextResponse.json({ config: data, message: 'Integration config created.' });
}
