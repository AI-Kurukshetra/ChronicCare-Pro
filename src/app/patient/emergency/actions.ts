'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type EmergencyContactState = {
  error?: string;
  success?: string;
};

export type EmergencyTriggerState = {
  error?: string;
  success?: string;
};

export async function addEmergencyContact(
  _prevState: EmergencyContactState,
  formData: FormData
): Promise<EmergencyContactState> {
  const contactName = String(formData.get('contactName') ?? '').trim();
  const relation = String(formData.get('relation') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();

  if (!contactName || !phone) {
    return { error: 'Contact name and phone are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can add emergency contacts.' };
  }

  const { data: inserted, error } = await supabase
    .from('emergency_contacts')
    .insert({
      patient_id: user.id,
      contact_name: contactName,
      relation: relation || null,
      phone
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'patient',
    action: 'emergency_contact_added',
    target_type: 'emergency_contacts',
    target_id: String(inserted.id),
    metadata: { contact_name: contactName }
  });

  revalidatePath('/patient/emergency');
  return { success: 'Emergency contact added.' };
}

export async function triggerEmergency(
  _prevState: EmergencyTriggerState,
  formData: FormData
): Promise<EmergencyTriggerState> {
  const reason = String(formData.get('reason') ?? '').trim();

  if (!reason) {
    return { error: 'Please describe your emergency.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can trigger emergency escalation.' };
  }

  const { data: patientRecord } = await supabase
    .from('patients')
    .select('doctor_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from('emergency_events')
    .insert({
      patient_id: user.id,
      doctor_id: patientRecord?.doctor_id ?? null,
      triggered_by: user.id,
      reason,
      status: 'open'
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'patient',
    action: 'emergency_triggered',
    target_type: 'emergency_events',
    target_id: String(inserted.id),
    metadata: { reason }
  });

  revalidatePath('/patient/emergency');
  revalidatePath('/doctor/dashboard');
  return { success: 'Emergency escalation submitted. Your care team will be notified.' };
}
