'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type AssignCarePlanState = {
  error?: string;
  success?: string;
};

export async function assignCarePlan(
  _prevState: AssignCarePlanState,
  formData: FormData
): Promise<AssignCarePlanState> {
  const patientUserId = String(formData.get('patientUserId') ?? '').trim();
  const condition = String(formData.get('condition') ?? '').trim();
  const goals = String(formData.get('goals') ?? '').trim();
  const instructions = String(formData.get('instructions') ?? '').trim();

  if (!patientUserId || !condition || !goals || !instructions) {
    return { error: 'Patient, condition, goals, and instructions are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can assign care plans.' };
  }

  const { data: patient } = await supabase
    .from('patients')
    .select('id,user_id,doctor_id')
    .eq('doctor_id', user.id)
    .eq('user_id', patientUserId)
    .maybeSingle();

  if (!patient) {
    return { error: 'Patient is not assigned to your doctor account.' };
  }

  const { data: inserted, error } = await supabase
    .from('care_plans')
    .insert({
      patient_id: patientUserId,
      doctor_id: user.id,
      condition,
      goals,
      instructions,
      status: 'active'
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'care_plan_created',
    target_type: 'care_plans',
    target_id: String(inserted.id),
    metadata: {
      patient_id: patientUserId,
      condition
    }
  });

  revalidatePath('/doctor/care-plans');
  revalidatePath('/patient/care-plan');
  return { success: 'Care plan assigned successfully.' };
}

export async function updateCarePlanStatus(formData: FormData) {
  const id = String(formData.get('carePlanId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();

  if (!id || (status !== 'active' && status !== 'completed')) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return;
  }

  await supabase
    .from('care_plans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('doctor_id', user.id);

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'care_plan_status_updated',
    target_type: 'care_plans',
    target_id: id,
    metadata: { status }
  });

  revalidatePath('/doctor/care-plans');
  revalidatePath('/patient/care-plan');
}
