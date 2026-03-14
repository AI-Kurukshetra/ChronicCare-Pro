'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type AssignMedicationState = {
  error?: string;
  success?: string;
};

export type ClinicalNoteState = {
  error?: string;
  success?: string;
};

export type LinkPatientAccountState = {
  error?: string;
  success?: string;
};

export async function assignMedication(
  _prevState: AssignMedicationState,
  formData: FormData
): Promise<AssignMedicationState> {
  const patientUserId = String(formData.get('patientUserId') ?? '').trim();
  const medicineName = String(formData.get('medicineName') ?? '').trim();
  const dosage = String(formData.get('dosage') ?? '').trim();
  const schedule = String(formData.get('schedule') ?? '').trim();
  const reminderTime = String(formData.get('reminderTime') ?? '').trim();
  const patientRecordId = String(formData.get('patientRecordId') ?? '').trim();

  if (!patientUserId) {
    return { error: 'Patient account must be linked to assign medication.' };
  }
  if (!medicineName || !dosage || !schedule || !reminderTime) {
    return { error: 'All medication fields are required.' };
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

  if (patientError || !patient || patient.user_id !== patientUserId) {
    return { error: 'Invalid patient assignment.' };
  }

  const { error } = await supabase.from('medications').insert({
    patient_id: patientUserId,
    medicine_name: medicineName,
    dosage,
    schedule,
    reminder_time: reminderTime
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/doctor/patients/${patientRecordId}`);
  revalidatePath('/patient/dashboard');

  return { success: 'Medication assigned successfully.' };
}

export async function addClinicalNote(
  _prevState: ClinicalNoteState,
  formData: FormData
): Promise<ClinicalNoteState> {
  const patientRecordId = String(formData.get('patientRecordId') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const isPatientVisible = String(formData.get('isPatientVisible') ?? 'true') === 'true';

  if (!patientRecordId) return { error: 'Missing patient record id.' };
  if (!note) return { error: 'Clinical note is required.' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can add clinical notes.' };
  }

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id,user_id,doctor_id')
    .eq('id', patientRecordId)
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (patientError || !patient || !patient.user_id) {
    return { error: 'Invalid patient or patient account not linked.' };
  }

  const { error: insertError } = await supabase.from('clinical_notes').insert({
    patient_id: patient.user_id,
    doctor_id: user.id,
    author_id: user.id,
    note,
    is_patient_visible: isPatientVisible
  });

  if (insertError) {
    return { error: insertError.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'clinical_note_created',
    target_type: 'clinical_notes',
    target_id: patient.user_id,
    metadata: { patient_record_id: patient.id, is_patient_visible: isPatientVisible }
  });

  revalidatePath(`/doctor/patients/${patientRecordId}`);
  revalidatePath('/doctor/dashboard');
  if (isPatientVisible) {
    revalidatePath('/patient/dashboard');
  }

  return { success: 'Clinical note added.' };
}

export async function linkPatientAccount(
  _prevState: LinkPatientAccountState,
  formData: FormData
): Promise<LinkPatientAccountState> {
  const patientRecordId = String(formData.get('patientRecordId') ?? '').trim();
  const emailInput = String(formData.get('email') ?? '').trim().toLowerCase();

  if (!patientRecordId) return { error: 'Missing patient record id.' };
  if (!emailInput) return { error: 'Patient email is required to link account.' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can link patient accounts.' };
  }

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id,user_id,email,doctor_id')
    .eq('id', patientRecordId)
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (patientError || !patient) {
    return { error: 'Patient not found for this doctor.' };
  }
  if (patient.user_id) {
    return { success: 'Patient account is already linked.' };
  }

  const admin = createAdminClient();
  const perPage = 200;
  let matchedUserId: string | null = null;
  let matchedRole: string | null = null;

  const { data: userRow } = await admin
    .from('users')
    .select('id,role,email')
    .ilike('email', emailInput)
    .limit(1)
    .maybeSingle();

  if (userRow?.id) {
    matchedUserId = userRow.id;
    matchedRole = userRow.role ?? null;
  }

  if (!matchedUserId) {
    for (let page = 1; page <= 20; page += 1) {
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page, perPage });
      if (usersError) {
        return { error: usersError.message };
      }

      const matched = usersData.users.find((item) => {
        return item.email?.toLowerCase() === emailInput;
      });
      if (matched) {
        matchedUserId = matched.id;
        matchedRole = (matched.app_metadata?.role ?? matched.user_metadata?.role ?? null) as string | null;
        break;
      }
      if (usersData.users.length < perPage) break;
    }
  }

  if (!matchedUserId) {
    return {
      error:
        'No auth account found for this email. Confirm patient signed up in the same Supabase project used by this app.'
    };
  }

  if (matchedRole === 'doctor' || matchedRole === 'admin') {
    return { error: `This email belongs to a ${matchedRole} account. Use a patient account email.` };
  }

  if (!matchedRole) {
    const { error: roleFixError } = await admin.auth.admin.updateUserById(matchedUserId, {
      app_metadata: { role: 'patient' }
    });
    if (roleFixError) {
      return { error: roleFixError.message };
    }
  }

  const { error: updateError } = await supabase
    .from('patients')
    .update({ user_id: matchedUserId, email: patient.email ?? emailInput })
    .eq('id', patient.id)
    .eq('doctor_id', user.id)
    .is('user_id', null);

  if (updateError) {
    if (updateError.message.toLowerCase().includes('duplicate')) {
      return { error: 'This patient account is already linked to another patient record.' };
    }
    return { error: updateError.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'patient_account_linked',
    target_type: 'patients',
    target_id: String(patient.id),
    metadata: { linked_user_id: matchedUserId, email: emailInput }
  });

  revalidatePath(`/doctor/patients/${patient.id}`);
  revalidatePath('/doctor/patients');
  revalidatePath('/doctor/dashboard');
  revalidatePath('/patient/dashboard');

  return { success: 'Patient account linked successfully.' };
}
