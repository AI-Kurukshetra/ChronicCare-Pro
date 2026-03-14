'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type AssignMedicationFromManagerState = {
  error?: string;
  success?: string;
};

export async function assignMedicationFromManager(
  _prevState: AssignMedicationFromManagerState,
  formData: FormData
): Promise<AssignMedicationFromManagerState> {
  const patientRecordId = String(formData.get('patientRecordId') ?? '').trim();
  const medicineName = String(formData.get('medicineName') ?? '').trim();
  const dosage = String(formData.get('dosage') ?? '').trim();
  const schedule = String(formData.get('schedule') ?? '').trim();
  const reminderTime = String(formData.get('reminderTime') ?? '').trim();

  if (!patientRecordId || !medicineName || !dosage || !schedule || !reminderTime) {
    return { error: 'All fields are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can assign medications.' };
  }

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id,user_id,doctor_id')
    .eq('id', patientRecordId)
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (patientError || !patient || !patient.user_id) {
    return { error: 'Invalid patient. Ensure patient account is linked.' };
  }

  const { error } = await supabase.from('medications').insert({
    patient_id: patient.user_id,
    medicine_name: medicineName,
    dosage,
    schedule,
    reminder_time: reminderTime
  });

  if (error) {
    return { error: error.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'medication_assigned',
    target_type: 'medications',
    target_id: patient.user_id,
    metadata: {
      patient_record_id: patient.id,
      medicine_name: medicineName,
      dosage,
      schedule,
      reminder_time: reminderTime
    }
  });

  revalidatePath('/doctor/medications');
  revalidatePath(`/doctor/patients/${patient.id}`);
  revalidatePath('/patient/medications');
  revalidatePath('/patient/dashboard');
  return { success: 'Medication assigned successfully.' };
}
