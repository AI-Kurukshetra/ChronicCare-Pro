import { NextResponse } from 'next/server';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { buildAlertFromObservation, normalizeFhirObservations, type FhirObservationInput } from '@/services/integrations/fhir';

type DeviceIngestRequest = {
  deviceId?: number;
  patientId?: string;
  type?: string;
  value?: string;
  timestamp?: string;
};

export async function POST(request: Request) {
  const ingestKey = request.headers.get('x-device-ingest-key');
  const configuredIngestKey = process.env.DEVICE_INGEST_API_KEY;

  let authorizedUserId: string | null = null;
  let authorizedRole: 'admin' | 'doctor' | null = null;

  if (!(configuredIngestKey && ingestKey && ingestKey === configuredIngestKey)) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const role = getUserRole(user);
    if (!user || (role !== 'admin' && role !== 'doctor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    authorizedUserId = user.id;
    authorizedRole = role;
  }

  const body = (await request.json().catch(() => ({}))) as DeviceIngestRequest;
  if (!body.patientId || !body.type || !body.value) {
    return NextResponse.json({ error: 'patientId, type, and value are required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const normalized = normalizeFhirObservations([
    {
      patientId: body.patientId,
      type: body.type,
      value: body.value,
      timestamp: body.timestamp
    } satisfies FhirObservationInput
  ]);

  if (normalized.accepted.length === 0) {
    return NextResponse.json({ error: normalized.rejected[0]?.reason ?? 'Invalid observation.' }, { status: 400 });
  }

  const item = normalized.accepted[0];

  const { data: job } = await admin
    .from('sync_jobs')
    .insert({
      source: 'device',
      operation: 'device_ingest',
      status: 'running',
      started_at: new Date().toISOString(),
      initiated_by: authorizedUserId
    })
    .select('id')
    .single();

  const { error: insertError } = await admin.from('vitals').insert({
    patient_id: item.patient_id,
    type: item.type,
    value: item.value,
    timestamp: item.timestamp
  });

  if (insertError) {
    if (job?.id) {
      await admin
        .from('sync_jobs')
        .update({ status: 'failed', error_message: insertError.message, completed_at: new Date().toISOString() })
        .eq('id', job.id);
    }

    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const alert = buildAlertFromObservation(item);
  if (alert) {
    await admin.from('alerts').insert({
      patient_id: item.patient_id,
      type: item.type,
      severity: alert.severity,
      message: alert.message,
      status: 'open'
    });
  }

  if (job?.id) {
    await admin.from('integration_logs').insert({
      sync_job_id: job.id,
      level: 'info',
      message: 'Device reading ingested.',
      payload: {
        device_id: body.deviceId ?? null,
        patient_id: item.patient_id,
        type: item.type,
        actor_role: authorizedRole
      }
    });

    await admin
      .from('sync_jobs')
      .update({ status: 'completed', processed_count: 1, completed_at: new Date().toISOString() })
      .eq('id', job.id);
  }

  return NextResponse.json({ message: 'Device reading ingested.', alertCreated: Boolean(alert) });
}
