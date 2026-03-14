'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type MedicationAdherenceState = {
  error?: string;
  success?: string;
};

export async function logMedicationAdherence(
  _prevState: MedicationAdherenceState,
  formData: FormData
): Promise<MedicationAdherenceState> {
  const medicationId = Number(formData.get('medicationId'));
  const status = String(formData.get('status') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();

  if (!Number.isFinite(medicationId) || medicationId <= 0) {
    return { error: 'Invalid medication selection.' };
  }
  if (!['taken', 'missed', 'skipped'].includes(status)) {
    return { error: 'Invalid adherence status.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can log adherence.' };
  }

  const { data: medication, error: medicationError } = await supabase
    .from('medications')
    .select('id,patient_id')
    .eq('id', medicationId)
    .eq('patient_id', user.id)
    .maybeSingle();

  if (medicationError || !medication) {
    return { error: 'Medication not found for this account.' };
  }

  const { error } = await supabase.from('medication_adherence_logs').insert({
    medication_id: medication.id,
    patient_id: user.id,
    status,
    note: note || null
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/patient/medications');
  revalidatePath('/patient/dashboard');
  revalidatePath('/doctor/medications');
  revalidatePath('/doctor/dashboard');

  return { success: `Medication marked as ${status}.` };
}
