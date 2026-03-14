'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { type VitalType, vitalTypes } from '@/lib/vitals';

export type AddVitalState = {
  error?: string;
  success?: string;
};

export type RequestAppointmentState = {
  error?: string;
  success?: string;
};

export type AiHealthState = {
  error?: string;
  result?: {
    riskScore: number;
    observation: string;
    recommendation: string;
    anomalyDetection: string;
  };
};

export type HealthCoachState = {
  error?: string;
  response?: string;
};

function isValidVitalType(value: string): value is VitalType {
  return vitalTypes.includes(value as VitalType);
}

function validateVitalValue(type: VitalType, value: string) {
  if (type === 'bp') {
    if (!/^\d{2,3}\s*\/\s*\d{2,3}$/.test(value)) {
      return 'Blood pressure must be in format 120/80.';
    }
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 'Value must be numeric.';
  }
  if (numericValue < 0) {
    return 'Value cannot be negative.';
  }

  return null;
}

function buildAlertForVital(type: VitalType, value: string): { message: string; severity: 'critical' } | null {
  if (type === 'glucose') {
    const glucose = Number(value);
    if (Number.isFinite(glucose) && glucose > 200) {
      return {
        severity: 'critical',
        message: `Critical glucose reading detected: ${value} mg/dL (threshold > 200).`
      };
    }
  }

  if (type === 'oxygen') {
    const oxygen = Number(value);
    if (Number.isFinite(oxygen) && oxygen < 90) {
      return {
        severity: 'critical',
        message: `Critical oxygen reading detected: ${value}% (threshold < 90).`
      };
    }
  }

  if (type === 'bp') {
    const systolic = Number(value.split('/')[0]?.trim());
    if (Number.isFinite(systolic) && systolic > 140) {
      return {
        severity: 'critical',
        message: `Critical blood pressure detected: ${value} mmHg (systolic threshold > 140).`
      };
    }
  }

  return null;
}

export async function addVital(
  _prevState: AddVitalState,
  formData: FormData
): Promise<AddVitalState> {
  const typeInput = String(formData.get('type') ?? '').trim();
  const valueInput = String(formData.get('value') ?? '').trim();

  if (!isValidVitalType(typeInput)) {
    return { error: 'Invalid vital type.' };
  }

  if (!valueInput) {
    return { error: 'Vital value is required.' };
  }

  const validationError = validateVitalValue(typeInput, valueInput);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can add vitals.' };
  }

  const { error } = await supabase.from('vitals').insert({
    patient_id: user.id,
    type: typeInput,
    value: valueInput
  });

  if (error) {
    return { error: error.message };
  }

  const alert = buildAlertForVital(typeInput, valueInput);
  if (alert) {
    await supabase.from('alerts').insert({
      patient_id: user.id,
      type: typeInput,
      severity: alert.severity,
      message: alert.message,
      status: 'open'
    });
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'patient',
    action: 'vital_added',
    target_type: 'vitals',
    metadata: { type: typeInput, value: valueInput }
  });

  revalidatePath('/patient/dashboard');
  revalidatePath('/doctor/dashboard');
  return { success: 'Vital reading added.' };
}

export async function requestAppointment(
  _prevState: RequestAppointmentState,
  formData: FormData
): Promise<RequestAppointmentState> {
  const typeInput = String(formData.get('type') ?? '').trim();
  const dateInput = String(formData.get('date') ?? '').trim();

  if (typeInput !== 'video' && typeInput !== 'clinic') {
    return { error: 'Invalid appointment type.' };
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { error: 'Please provide a valid date/time.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can request appointments.' };
  }

  const { data: patientRecord } = await supabase
    .from('patients')
    .select('doctor_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!patientRecord?.doctor_id) {
    return { error: 'No doctor assigned yet.' };
  }

  const { error } = await supabase.from('appointments').insert({
    patient_id: user.id,
    doctor_id: patientRecord.doctor_id,
    date: date.toISOString(),
    type: typeInput,
    status: 'pending'
  });

  if (error) {
    return { error: error.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'patient',
    action: 'appointment_requested',
    target_type: 'appointments',
    metadata: { type: typeInput, date: date.toISOString() }
  });

  revalidatePath('/patient/dashboard');
  revalidatePath('/doctor/dashboard');
  return { success: 'Appointment request submitted.' };
}

function buildHeuristicAi(vitals: Array<{ type: VitalType; value: string; timestamp: string }>) {
  const glucoseValues = vitals
    .filter((v) => v.type === 'glucose')
    .map((v) => Number(v.value))
    .filter((v) => Number.isFinite(v));
  const oxygenValues = vitals
    .filter((v) => v.type === 'oxygen')
    .map((v) => Number(v.value))
    .filter((v) => Number.isFinite(v));
  const bpSysValues = vitals
    .filter((v) => v.type === 'bp')
    .map((v) => Number(v.value.split('/')[0]?.trim()))
    .filter((v) => Number.isFinite(v));

  let riskScore = 20;
  if (glucoseValues.some((v) => v > 200)) riskScore += 30;
  if (bpSysValues.some((v) => v > 140)) riskScore += 25;
  if (oxygenValues.some((v) => v < 90)) riskScore += 30;
  riskScore = Math.min(riskScore, 95);

  return {
    riskScore,
    observation:
      glucoseValues.length > 0
        ? 'Glucose readings show variability in recent history.'
        : 'Insufficient glucose data; continue logging vitals.',
    recommendation: 'Maintain healthy diet, hydration, and discuss trends with your doctor.',
    anomalyDetection:
      riskScore >= 70
        ? 'Potential anomalies detected in recent vitals (glucose/bp/oxygen thresholds breached).'
        : 'No major anomaly pattern detected based on current vitals.'
  };
}

export async function analyzeHealthWithAI(_prevState: AiHealthState): Promise<AiHealthState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can run AI health analysis.' };
  }

  const { data: vitalsData, error } = await supabase
    .from('vitals')
    .select('type,value,timestamp')
    .eq('patient_id', user.id)
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    return { error: error.message };
  }

  const vitals = (vitalsData as Array<{ type: VitalType; value: string; timestamp: string }> | null) ?? [];
  if (vitals.length === 0) {
    return { error: 'No vitals available for analysis yet.' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      result: buildHeuristicAi(vitals)
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'You are a healthcare analytics assistant. Return strict JSON with keys: riskScore (0-100 integer), observation, recommendation, anomalyDetection.'
          },
          {
            role: 'user',
            content: `Analyze this vitals history and produce risk/advice/anomaly summary:\n${JSON.stringify(vitals)}`
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'health_analysis',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                riskScore: { type: 'integer', minimum: 0, maximum: 100 },
                observation: { type: 'string' },
                recommendation: { type: 'string' },
                anomalyDetection: { type: 'string' }
              },
              required: ['riskScore', 'observation', 'recommendation', 'anomalyDetection']
            }
          }
        }
      })
    });

    if (!response.ok) {
      return { result: buildHeuristicAi(vitals) };
    }

    const payload = await response.json();
    const text = payload.output?.[0]?.content?.[0]?.text;
    if (!text) {
      return { result: buildHeuristicAi(vitals) };
    }

    const parsed = JSON.parse(text) as {
      riskScore: number;
      observation: string;
      recommendation: string;
      anomalyDetection: string;
    };

    return {
      result: {
        riskScore: Math.max(0, Math.min(100, Math.round(parsed.riskScore))),
        observation: parsed.observation,
        recommendation: parsed.recommendation,
        anomalyDetection: parsed.anomalyDetection
      }
    };
  } catch {
    return { result: buildHeuristicAi(vitals) };
  }
}

function buildCoachFallback(message: string) {
  const input = message.toLowerCase();
  if (input.includes('dizzy') || input.includes('lightheaded')) {
    return 'Possible low blood sugar or blood pressure fluctuation. Please check glucose and blood pressure now, hydrate, and contact your doctor if symptoms continue.';
  }
  if (input.includes('chest pain')) {
    return 'Chest pain can be serious. Seek urgent medical care immediately and do not wait for remote assessment.';
  }
  if (input.includes('breath') || input.includes('oxygen')) {
    return 'Check oxygen saturation if available. If oxygen is below 90% or breathing is worsening, seek emergency care.';
  }
  if (input.includes('headache')) {
    return 'Please check blood pressure and hydration status. If headache is severe, sudden, or persistent, contact your doctor promptly.';
  }
  return 'Log current vitals (glucose, blood pressure, oxygen, heart rate), monitor symptoms, and share this update with your doctor through chat or an appointment request.';
}

export async function askVirtualHealthCoach(
  _prevState: HealthCoachState,
  formData: FormData
): Promise<HealthCoachState> {
  const message = String(formData.get('message') ?? '').trim();
  if (!message) {
    return { error: 'Please describe your symptoms or concern.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'patient') {
    return { error: 'Only patients can use the virtual health coach.' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { response: buildCoachFallback(message) };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'You are a brief virtual health coach for chronic care patients. Provide safe non-diagnostic guidance in 3-5 lines, suggest which vitals to check, and add when to contact doctor/emergency.'
          },
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      return { response: buildCoachFallback(message) };
    }

    const payload = await response.json();
    const answer = payload.output_text as string | undefined;
    if (!answer || !answer.trim()) {
      return { response: buildCoachFallback(message) };
    }

    return { response: answer.trim() };
  } catch {
    return { response: buildCoachFallback(message) };
  }
}
