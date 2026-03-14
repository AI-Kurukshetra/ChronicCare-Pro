import { NextResponse } from 'next/server';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { buildAlertFromObservation, normalizeFhirObservations, type FhirObservationInput } from '@/services/integrations/fhir';

type SyncRequestBody = {
  integrationConfigId?: number;
  organizationId?: number;
  operation?: 'pull_observations' | 'pull_patients' | 'push_appointments';
  observations?: FhirObservationInput[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as SyncRequestBody;
  const admin = createAdminClient();

  const operation = body.operation ?? 'pull_observations';
  const { data: job, error: jobError } = await admin
    .from('sync_jobs')
    .insert({
      integration_config_id: body.integrationConfigId ?? null,
      organization_id: body.organizationId ?? null,
      initiated_by: user.id,
      source: 'fhir',
      operation,
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? 'Unable to create sync job.' }, { status: 500 });
  }

  const jobId = job.id as number;
  const observations = Array.isArray(body.observations) ? body.observations : [];

  try {
    const { accepted, rejected } = normalizeFhirObservations(observations);

    if (accepted.length > 0) {
      const { error: vitalsError } = await admin.from('vitals').insert(
        accepted.map((item) => ({
          patient_id: item.patient_id,
          type: item.type,
          value: item.value,
          timestamp: item.timestamp
        }))
      );

      if (vitalsError) {
        throw new Error(vitalsError.message);
      }

      const alertsToInsert = accepted
        .map((item) => {
          const alert = buildAlertFromObservation(item);
          if (!alert) return null;
          return {
            patient_id: item.patient_id,
            type: item.type,
            severity: alert.severity,
            message: alert.message,
            status: 'open'
          };
        })
        .filter(Boolean);

      if (alertsToInsert.length > 0) {
        const { error: alertsError } = await admin.from('alerts').insert(alertsToInsert);
        if (alertsError) {
          throw new Error(alertsError.message);
        }
      }
    }

    await admin.from('integration_logs').insert([
      {
        sync_job_id: jobId,
        level: 'info',
        message: 'FHIR sync completed.',
        payload: {
          operation,
          accepted: accepted.length,
          rejected: rejected.length
        }
      },
      ...rejected.slice(0, 25).map((item) => ({
        sync_job_id: jobId,
        level: 'warning' as const,
        message: 'Observation rejected during normalization.',
        payload: item
      }))
    ]);

    await admin
      .from('sync_jobs')
      .update({
        status: 'completed',
        processed_count: accepted.length,
        failed_count: rejected.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (body.integrationConfigId) {
      await admin
        .from('integration_configs')
        .update({
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', body.integrationConfigId);
    }

    return NextResponse.json({
      message: 'FHIR sync completed.',
      jobId,
      processed: accepted.length,
      failed: rejected.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FHIR sync failed.';

    await admin.from('integration_logs').insert({
      sync_job_id: jobId,
      level: 'error',
      message: 'FHIR sync failed.',
      payload: { message }
    });

    await admin
      .from('sync_jobs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return NextResponse.json({ error: message, jobId }, { status: 500 });
  }
}
