'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type ResolveAlertState = {
  error?: string;
  success?: string;
};

export type EscalateAlertState = {
  error?: string;
  success?: string;
};

export async function resolveAlert(
  _prevState: ResolveAlertState,
  formData: FormData
): Promise<ResolveAlertState> {
  const alertId = String(formData.get('alertId') ?? '').trim();
  if (!alertId) return { error: 'Missing alert id.' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can resolve alerts.' };
  }

  const { data: assignedPatients, error: assignedPatientsError } = await supabase
    .from('patients')
    .select('user_id')
    .eq('doctor_id', user.id)
    .not('user_id', 'is', null);
  if (assignedPatientsError) {
    return { error: assignedPatientsError.message };
  }

  const patientIds = (assignedPatients ?? [])
    .map((item) => item.user_id)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  if (patientIds.length === 0) {
    return { error: 'No assigned patient found for this doctor.' };
  }

  const { data: alert, error: alertQueryError } = await supabase
    .from('alerts')
    .select('id,patient_id,status')
    .eq('id', Number(alertId))
    .maybeSingle();
  if (alertQueryError) {
    return { error: alertQueryError.message };
  }

  if (!alert || !patientIds.includes(alert.patient_id) || alert.status !== 'open') {
    return { error: 'Alert not found or already resolved.' };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin.from('alerts').update({ status: 'resolved' }).eq('id', alert.id);
  if (updateError) {
    return { error: updateError.message };
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'alert_resolved',
    target_type: 'alerts',
    target_id: String(alert.id),
    metadata: { patient_id: alert.patient_id }
  });
  if (auditError) {
    return { error: auditError.message };
  }

  revalidatePath('/doctor/alerts');
  revalidatePath('/doctor/dashboard');
  return { success: 'Alert marked as resolved.' };
}

export async function escalateAlert(
  _prevState: EscalateAlertState,
  formData: FormData
): Promise<EscalateAlertState> {
  const alertId = String(formData.get('alertId') ?? '').trim();
  if (!alertId) return { error: 'Missing alert id.' };

  const customReason = String(formData.get('reason') ?? '').trim();
  const dueHours = Number(formData.get('dueHours'));
  const normalizedDueHours = Number.isFinite(dueHours) && dueHours > 0 ? dueHours : 4;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can escalate alerts.' };
  }

  const { data: assignedPatients, error: assignedPatientsError } = await supabase
    .from('patients')
    .select('user_id')
    .eq('doctor_id', user.id)
    .not('user_id', 'is', null);
  if (assignedPatientsError) return { error: assignedPatientsError.message };

  const patientIds = (assignedPatients ?? [])
    .map((item) => item.user_id)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  const { data: alert, error: alertError } = await supabase
    .from('alerts')
    .select('id,patient_id,status,severity,message')
    .eq('id', Number(alertId))
    .maybeSingle();
  if (alertError) return { error: alertError.message };

  if (!alert || alert.status !== 'open' || !patientIds.includes(alert.patient_id)) {
    return { error: 'Alert not found or not eligible for escalation.' };
  }

  const { data: existingEscalation, error: existingError } = await supabase
    .from('alert_escalations')
    .select('id,status')
    .eq('alert_id', alert.id)
    .in('status', ['open', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return { error: existingError.message };
  if (existingEscalation) {
    return { error: 'This alert is already escalated.' };
  }

  const escalationReason =
    customReason || `Escalated due to ${alert.severity} ${alert.message ? `(${alert.message})` : 'alert'}.`;
  const dueAt = new Date(Date.now() + normalizedDueHours * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from('alert_escalations').insert({
    alert_id: alert.id,
    patient_id: alert.patient_id,
    doctor_id: user.id,
    escalated_by: user.id,
    priority: alert.severity === 'critical' ? 'critical' : 'high',
    reason: escalationReason,
    status: 'open',
    due_at: dueAt
  });
  if (insertError) return { error: insertError.message };

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'alert_escalated',
    target_type: 'alerts',
    target_id: String(alert.id),
    metadata: {
      patient_id: alert.patient_id,
      due_at: dueAt,
      priority: alert.severity === 'critical' ? 'critical' : 'high'
    }
  });

  revalidatePath('/doctor/alerts');
  revalidatePath('/doctor/dashboard');
  revalidatePath('/admin/dashboard');
  return { success: 'Alert escalated to priority queue.' };
}

export async function resolveEscalation(
  _prevState: EscalateAlertState,
  formData: FormData
): Promise<EscalateAlertState> {
  const escalationId = String(formData.get('escalationId') ?? '').trim();
  if (!escalationId) return { error: 'Missing escalation id.' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can resolve escalations.' };
  }

  const { data: escalation, error: escalationError } = await supabase
    .from('alert_escalations')
    .select('id,doctor_id,status')
    .eq('id', Number(escalationId))
    .eq('doctor_id', user.id)
    .maybeSingle();
  if (escalationError) return { error: escalationError.message };
  if (!escalation || escalation.status === 'resolved') {
    return { error: 'Escalation not found or already resolved.' };
  }

  const { error: updateError } = await supabase
    .from('alert_escalations')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', escalation.id);
  if (updateError) return { error: updateError.message };

  revalidatePath('/doctor/alerts');
  revalidatePath('/doctor/dashboard');
  return { success: 'Escalation marked as resolved.' };
}
