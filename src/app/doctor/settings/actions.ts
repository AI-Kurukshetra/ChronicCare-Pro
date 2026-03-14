'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type UpdateDoctorProfileState = {
  error?: string;
  success?: string;
};

export async function updateDoctorProfile(
  _prevState: UpdateDoctorProfileState,
  formData: FormData
): Promise<UpdateDoctorProfileState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const specialty = String(formData.get('specialty') ?? '').trim();
  const experienceYearsInput = String(formData.get('experienceYears') ?? '').trim();
  const clinicName = String(formData.get('clinicName') ?? '').trim();
  const licenseNumber = String(formData.get('licenseNumber') ?? '').trim();

  const experienceYears = experienceYearsInput ? Number(experienceYearsInput) : null;
  if (experienceYears !== null && (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60)) {
    return { error: 'Years of experience must be an integer between 0 and 60.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can update this profile.' };
  }

  const currentData = (user.user_metadata ?? {}) as Record<string, unknown>;
  const { error } = await supabase.auth.updateUser({
    data: {
      ...currentData,
      full_name: fullName || null,
      phone: phone || null,
      specialty: specialty || null,
      experience_years: experienceYears,
      clinic_name: clinicName || null,
      license_number: licenseNumber || null
    }
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/doctor/settings');
  revalidatePath('/doctor/dashboard');
  return { success: 'Doctor profile updated.' };
}
