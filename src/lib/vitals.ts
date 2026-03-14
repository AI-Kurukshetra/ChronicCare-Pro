export const vitalTypes = ['bp', 'glucose', 'weight', 'heart_rate', 'oxygen'] as const;

export type VitalType = (typeof vitalTypes)[number];

export type VitalReading = {
  id: number;
  patient_id: string;
  type: VitalType;
  value: string;
  timestamp: string;
};

export const vitalLabels: Record<VitalType, string> = {
  bp: 'Blood Pressure',
  glucose: 'Glucose',
  weight: 'Weight',
  heart_rate: 'Heart Rate',
  oxygen: 'Oxygen Saturation'
};

export const vitalUnits: Record<VitalType, string> = {
  bp: 'mmHg',
  glucose: 'mg/dL',
  weight: 'kg',
  heart_rate: 'bpm',
  oxygen: '%'
};

export function parseVitalNumericValue(type: VitalType, value: string) {
  if (type === 'bp') {
    const [systolic] = value.split('/');
    const parsed = Number(systolic?.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
