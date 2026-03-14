'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type UpdatePatientProfileState = {
  error?: string;
  success?: string;
};

export async function updatePatientProfile(
  _prevState: UpdatePatientProfileState,
  formData: FormData
): Promise<UpdatePatientProfileState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const ageInput = String(formData.get('age') ?? '').trim();
  const condition = String(formData.get('condition') ?? '').trim();
  const gender = String(formData.get('gender') ?? '').trim();
  const diagnosisYearsInput = String(formData.get('diagnosisYears') ?? '').trim();
  const emergencyContactName = String(formData.get('emergencyContactName') ?? '').trim();
  const emergencyContactPhone = String(formData.get('emergencyContactPhone') ?? '').trim();

  const age = ageInput ? Number(ageInput) : null;
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) {
    return { error: 'Age must be an integer between 0 and 130.' };
  }

  const diagnosisYears = diagnosisYearsInput ? Number(diagnosisYearsInput) : null;
  if (diagnosisYears !== null && (!Number.isInteger(diagnosisYears) || diagnosisYears < 0 || diagnosisYears > 80)) {
    return { error: 'Years since diagnosis must be an integer between 0 and 80.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can update this profile.' };
  }

  const currentData = (user.user_metadata ?? {}) as Record<string, unknown>;
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      ...currentData,
      full_name: fullName || null,
      phone: phone || null,
      patient_age: age,
      patient_condition: condition || null,
      patient_gender: gender || null,
      diagnosis_years: diagnosisYears,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null
    }
  });

  if (authError) {
    return { error: authError.message };
  }

  const { error: patientUpdateError } = await supabase
    .from('patients')
    .update({
      full_name: fullName || null,
      age,
      disease: condition || null,
      email: user.email ?? null
    })
    .eq('user_id', user.id);

  if (patientUpdateError) {
    return { error: patientUpdateError.message };
  }

  revalidatePath('/patient/settings');
  revalidatePath('/patient/dashboard');
  return { success: 'Patient profile updated.' };
}
