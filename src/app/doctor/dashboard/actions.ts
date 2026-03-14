'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type CreatePatientState = {
  error?: string;
  success?: string;
};

export async function createPatient(
  _prevState: CreatePatientState,
  formData: FormData
): Promise<CreatePatientState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const emailInput = String(formData.get('email') ?? '').trim();
  const ageInput = String(formData.get('age') ?? '').trim();
  const diseaseInput = String(formData.get('disease') ?? '').trim();
  const notesInput = String(formData.get('notes') ?? '').trim();

  if (!fullName) {
    return { error: 'Full name is required.' };
  }

  const age = ageInput ? Number(ageInput) : null;
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) {
    return { error: 'Age must be a valid number between 0 and 130.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return { error: 'Only doctors can add patients.' };
  }

  let linkedUserId: string | null = null;
  if (emailInput) {
    const adminClient = createAdminClient();
    const targetEmail = emailInput.toLowerCase();
    const perPage = 200;

    for (let page = 1; page <= 20; page += 1) {
      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (usersError) {
        return { error: usersError.message };
      }

      const matched = usersData.users.find((item) => {
        const role = item.app_metadata?.role ?? item.user_metadata?.role;
        return item.email?.toLowerCase() === targetEmail && role === 'patient';
      });

      if (matched) {
        linkedUserId = matched.id;
        break;
      }

      if (usersData.users.length < perPage) break;
    }
  }

  const { error } = await supabase.from('patients').insert({
    full_name: fullName,
    email: emailInput || null,
    user_id: linkedUserId,
    age,
    disease: diseaseInput || null,
    notes: notesInput || null,
    doctor_id: user.id
  });

  if (error) {
    return { error: error.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'patient_created',
    target_type: 'patients',
    target_id: linkedUserId,
    metadata: {
      full_name: fullName,
      disease: diseaseInput || null
    }
  });

  revalidatePath('/doctor/dashboard');
  return { success: 'Patient added successfully.' };
}

export async function updateAppointmentStatus(formData: FormData) {
  const appointmentId = String(formData.get('appointmentId') ?? '').trim();
  const statusInput = String(formData.get('status') ?? '').trim();
  const meetingLinkInput = String(formData.get('meetingLink') ?? '').trim();

  if (!appointmentId || (statusInput !== 'approved' && statusInput !== 'rejected')) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return;
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id,type,status')
    .eq('id', appointmentId)
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (!appointment || appointment.status !== 'pending') {
    return;
  }

  const meetingLink =
    statusInput === 'approved' && appointment.type === 'video' ? meetingLinkInput : null;

  if (statusInput === 'approved' && appointment.type === 'video') {
    const isValidVideoLink = /^https?:\/\//i.test(meetingLinkInput);
    if (!isValidVideoLink) {
      return;
    }
  }

  await supabase
    .from('appointments')
    .update({ status: statusInput, meeting_link: statusInput === 'approved' ? meetingLink : null })
    .eq('id', appointmentId)
    .eq('doctor_id', user.id)
    .eq('status', 'pending');

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'appointment_status_updated',
    target_type: 'appointments',
    target_id: appointmentId,
    metadata: { status: statusInput, has_meeting_link: Boolean(meetingLink) }
  });

  revalidatePath('/doctor/dashboard');
  revalidatePath('/patient/dashboard');
}

export async function updateEmergencyStatus(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '').trim();
  const statusInput = String(formData.get('status') ?? '').trim();

  if (!eventId || !['acknowledged', 'resolved'].includes(statusInput)) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'doctor') {
    return;
  }

  const { data: event } = await supabase
    .from('emergency_events')
    .select('id,status,doctor_id')
    .eq('id', eventId)
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (!event) {
    return;
  }

  if (event.status === 'resolved') {
    return;
  }

  await supabase
    .from('emergency_events')
    .update({ status: statusInput })
    .eq('id', eventId)
    .eq('doctor_id', user.id);

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'doctor',
    action: 'emergency_status_updated',
    target_type: 'emergency_events',
    target_id: eventId,
    metadata: { status: statusInput }
  });

  revalidatePath('/doctor/dashboard');
  revalidatePath('/patient/emergency');
}
