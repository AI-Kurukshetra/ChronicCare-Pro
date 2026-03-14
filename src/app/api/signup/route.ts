import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

type SignupRole = 'patient' | 'doctor';

function asNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const role = String(body.role ?? '').trim() as SignupRole;
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '').trim();
    const phone = String(body.phone ?? '').trim();

    if (role !== 'patient' && role !== 'doctor') {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (role === 'doctor') {
      const specialty = String(body.doctorSpecialty ?? '').trim();
      const experienceYears = String(body.doctorExperienceYears ?? '').trim();
      if (!specialty || !experienceYears) {
        return NextResponse.json({ error: 'Doctor specialty and experience are required.' }, { status: 400 });
      }
    }

    if (role === 'patient') {
      const patientAge = String(body.patientAge ?? '').trim();
      const patientCondition = String(body.patientCondition ?? '').trim();
      if (!patientAge || !patientCondition) {
        return NextResponse.json({ error: 'Patient age and primary condition are required.' }, { status: 400 });
      }
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: {
        role,
        full_name: fullName,
        phone: phone || null,
        patient_age: role === 'patient' ? asNumber(body.patientAge) : null,
        patient_gender: role === 'patient' ? String(body.patientGender ?? '').trim() || null : null,
        patient_condition: role === 'patient' ? String(body.patientCondition ?? '').trim() || null : null,
        diagnosis_years: role === 'patient' ? asNumber(body.diagnosisYears) : null,
        emergency_contact_name: role === 'patient' ? String(body.emergencyContactName ?? '').trim() || null : null,
        emergency_contact_phone: role === 'patient' ? String(body.emergencyContactPhone ?? '').trim() || null : null,
        specialty: role === 'doctor' ? String(body.doctorSpecialty ?? '').trim() || null : null,
        experience_years: role === 'doctor' ? asNumber(body.doctorExperienceYears) : null,
        license_number: role === 'doctor' ? String(body.doctorLicenseNumber ?? '').trim() || null : null,
        clinic_name: role === 'doctor' ? String(body.clinicName ?? '').trim() || null : null
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
  }
}
