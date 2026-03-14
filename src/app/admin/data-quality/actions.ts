'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole, type AppRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type PlatformUser = {
  id: string;
  role: AppRole;
};

export type RunDataQualityCheckState = {
  error?: string;
  success?: string;
};

async function loadAllAuthUsers() {
  const admin = createAdminClient();
  const users: PlatformUser[] = [];
  const perPage = 200;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) break;

    users.push(
      ...data.users.map((item) => {
        const roleValue = item.app_metadata?.role ?? item.user_metadata?.role;
        const role: AppRole = roleValue === 'doctor' || roleValue === 'admin' ? roleValue : 'patient';
        return { id: item.id, role };
      })
    );

    if (data.users.length < perPage) break;
  }

  return users;
}

export async function runDataQualityCheck(
  _prevState: RunDataQualityCheckState
): Promise<RunDataQualityCheckState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return { error: 'Only admins can run this check.' };
  }

  const admin = createAdminClient();
  const [users, patientsRes, vitalsRes, alertsRes, appointmentsRes, medicationsRes, messagesRes] = await Promise.all([
    loadAllAuthUsers(),
    admin.from('patients').select('id,user_id,doctor_id'),
    admin.from('vitals').select('id,patient_id'),
    admin.from('alerts').select('id,patient_id'),
    admin.from('appointments').select('id,patient_id,doctor_id'),
    admin.from('medications').select('id,patient_id'),
    admin.from('messages').select('id,sender_id,receiver_id')
  ]);

  const patients = patientsRes.data ?? [];
  const vitals = vitalsRes.data ?? [];
  const alerts = alertsRes.data ?? [];
  const appointments = appointmentsRes.data ?? [];
  const medications = medicationsRes.data ?? [];
  const messages = messagesRes.data ?? [];

  const userIds = new Set(users.map((u) => u.id));
  const patientRoleUserIds = new Set(users.filter((u) => u.role === 'patient').map((u) => u.id));
  const doctorRoleUserIds = new Set(users.filter((u) => u.role === 'doctor').map((u) => u.id));
  const patientLinkedUserIds = new Set(
    patients.map((p) => p.user_id).filter((value): value is string => typeof value === 'string' && value.length > 0)
  );

  const orphanVitals = vitals.filter((row) => !patientRoleUserIds.has(row.patient_id)).length;
  const orphanAlerts = alerts.filter((row) => !patientRoleUserIds.has(row.patient_id)).length;
  const orphanMedications = medications.filter((row) => !patientRoleUserIds.has(row.patient_id)).length;
  const orphanAppointments = appointments.filter(
    (row) => !patientRoleUserIds.has(row.patient_id) || !doctorRoleUserIds.has(row.doctor_id)
  ).length;
  const orphanMessages = messages.filter(
    (row) => !userIds.has(row.sender_id) || !userIds.has(row.receiver_id)
  ).length;

  const patientsWithoutDoctor = patients.filter((row) => !doctorRoleUserIds.has(row.doctor_id)).length;
  const linkedPatientsWithoutAuthUser = [...patientLinkedUserIds].filter((id) => !patientRoleUserIds.has(id)).length;
  const roleTotal =
    users.filter((u) => u.role === 'patient').length +
    users.filter((u) => u.role === 'doctor').length +
    users.filter((u) => u.role === 'admin').length;

  const checks = {
    auth_role_partition: roleTotal === users.length,
    patients_without_doctor: patientsWithoutDoctor,
    linked_patients_without_auth_user: linkedPatientsWithoutAuthUser,
    orphan_vitals: orphanVitals,
    orphan_alerts: orphanAlerts,
    orphan_appointments: orphanAppointments,
    orphan_medications: orphanMedications,
    orphan_messages: orphanMessages
  };

  const failCount = [orphanVitals, orphanAlerts, orphanAppointments, orphanMedications].filter((v) => v > 0).length +
    (roleTotal === users.length ? 0 : 1);
  const warnCount = [patientsWithoutDoctor, linkedPatientsWithoutAuthUser, orphanMessages].filter((v) => v > 0).length;
  const passCount = 8 - failCount - warnCount;

  const { error: auditError } = await admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'data_quality_check_run',
    target_type: 'system',
    target_id: null,
    metadata: {
      summary: {
        pass: passCount,
        warn: warnCount,
        fail: failCount
      },
      checks,
      counts: {
        users: users.length,
        patients: patients.length,
        vitals: vitals.length,
        alerts: alerts.length,
        appointments: appointments.length,
        medications: medications.length,
        messages: messages.length
      },
      checked_at: new Date().toISOString()
    }
  });

  if (auditError) {
    return { error: auditError.message };
  }

  revalidatePath('/admin/data-quality');
  return { success: 'Data quality checks refreshed and logged.' };
}
