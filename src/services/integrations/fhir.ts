import { type VitalType, vitalTypes } from '@/lib/vitals';

export type FhirObservationInput = {
  patientId: string;
  type: string;
  value: string;
  timestamp?: string;
};

export type NormalizedObservation = {
  patient_id: string;
  type: VitalType;
  value: string;
  timestamp: string;
};

export function normalizeFhirObservations(observations: FhirObservationInput[]) {
  const accepted: NormalizedObservation[] = [];
  const rejected: Array<{ item: FhirObservationInput; reason: string }> = [];

  for (const item of observations) {
    const candidateType = item.type?.trim() as VitalType;
    if (!item.patientId || !item.value) {
      rejected.push({ item, reason: 'Missing patientId or value.' });
      continue;
    }

    if (!vitalTypes.includes(candidateType)) {
      rejected.push({ item, reason: `Unsupported type: ${item.type}` });
      continue;
    }

    const timestamp = item.timestamp ? new Date(item.timestamp) : new Date();
    if (Number.isNaN(timestamp.getTime())) {
      rejected.push({ item, reason: 'Invalid timestamp.' });
      continue;
    }

    accepted.push({
      patient_id: item.patientId,
      type: candidateType,
      value: String(item.value).trim(),
      timestamp: timestamp.toISOString()
    });
  }

  return { accepted, rejected };
}

export function buildAlertFromObservation(item: NormalizedObservation): { severity: 'critical'; message: string } | null {
  if (item.type === 'glucose') {
    const glucose = Number(item.value);
    if (Number.isFinite(glucose) && glucose > 200) {
      return {
        severity: 'critical',
        message: `Critical glucose reading detected from integration: ${item.value} mg/dL (threshold > 200).`
      };
    }
  }

  if (item.type === 'oxygen') {
    const oxygen = Number(item.value);
    if (Number.isFinite(oxygen) && oxygen < 90) {
      return {
        severity: 'critical',
        message: `Critical oxygen reading detected from integration: ${item.value}% (threshold < 90).`
      };
    }
  }

  if (item.type === 'bp') {
    const systolic = Number(item.value.split('/')[0]?.trim());
    if (Number.isFinite(systolic) && systolic > 140) {
      return {
        severity: 'critical',
        message: `Critical blood pressure detected from integration: ${item.value} mmHg (systolic threshold > 140).`
      };
    }
  }

  return null;
}
