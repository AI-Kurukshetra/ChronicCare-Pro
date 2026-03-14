'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Stethoscope, UserRound } from 'lucide-react';

import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, APP_TITLE } from '@/lib/branding';
import { type AppRole } from '@/lib/auth/roles';

type SignupRole = Exclude<AppRole, 'admin'>;

export default function SignupPage() {
  const [role, setRole] = useState<SignupRole>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientCondition, setPatientCondition] = useState('');
  const [diagnosisYears, setDiagnosisYears] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [doctorExperienceYears, setDoctorExperienceYears] = useState('');
  const [doctorLicenseNumber, setDoctorLicenseNumber] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isDoctor = useMemo(() => role === 'doctor', [role]);
  const isPatient = useMemo(() => role === 'patient', [role]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (isDoctor) {
      if (!doctorSpecialty.trim()) {
        setLoading(false);
        setError('Please select doctor specialty.');
        return;
      }
      if (!doctorExperienceYears.trim()) {
        setLoading(false);
        setError('Please enter years of experience.');
        return;
      }
    }

    if (isPatient) {
      if (!patientAge.trim() || !patientCondition.trim()) {
        setLoading(false);
        setError('Please provide patient age and primary condition.');
        return;
      }
    }

    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        fullName,
        email,
        password,
        phone,
        patientAge,
        patientGender,
        patientCondition,
        diagnosisYears,
        emergencyContactName,
        emergencyContactPhone,
        doctorSpecialty,
        doctorExperienceYears,
        doctorLicenseNumber,
        clinicName
      })
    });
    const result = (await response.json()) as { error?: string };

    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? 'Signup failed.');
      return;
    }

    setMessage('Signup successful. You can sign in immediately.');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(14,165,233,0.14),transparent_40%)]" />
      <Card className="relative z-10 w-full max-w-2xl rounded-3xl border-blue-100/80 shadow-xl">
        <CardHeader>
          <div className="mb-2 inline-flex items-center gap-2">
            <BrandMark />
            <p className="text-sm font-semibold text-slate-700">{APP_NAME}</p>
          </div>
          <CardTitle>Create your {APP_NAME} account</CardTitle>
          <CardDescription>{APP_TITLE}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-1">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  role === 'patient' ? 'bg-blue-700 text-white shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <UserRound className="h-4 w-4" />
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole('doctor')}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  role === 'doctor' ? 'bg-blue-700 text-white shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Stethoscope className="h-4 w-4" />
                Doctor
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1..." />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </div>

            {isPatient && (
              <>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm font-medium text-emerald-700">
                  Patient health profile
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="patientAge">Age</Label>
                    <Input
                      id="patientAge"
                      type="number"
                      min={1}
                      max={130}
                      value={patientAge}
                      onChange={(event) => setPatientAge(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientGender">Gender</Label>
                    <select
                      id="patientGender"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={patientGender}
                      onChange={(event) => setPatientGender(event.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientCondition">Primary Condition</Label>
                  <select
                    id="patientCondition"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={patientCondition}
                    onChange={(event) => setPatientCondition(event.target.value)}
                    required
                  >
                    <option value="">Select condition</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Hypertension">Hypertension</option>
                    <option value="Heart Disease">Heart Disease</option>
                    <option value="COPD">COPD</option>
                    <option value="Chronic Kidney Disease">Chronic Kidney Disease</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosisYears">Years Since Diagnosis</Label>
                  <Input
                    id="diagnosisYears"
                    type="number"
                    min={0}
                    max={80}
                    value={diagnosisYears}
                    onChange={(event) => setDiagnosisYears(event.target.value)}
                    placeholder="e.g. 4"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={emergencyContactName}
                      onChange={(event) => setEmergencyContactName(event.target.value)}
                      placeholder="Family member"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      value={emergencyContactPhone}
                      onChange={(event) => setEmergencyContactPhone(event.target.value)}
                      placeholder="+1..."
                    />
                  </div>
                </div>
              </>
            )}

            {isDoctor && (
              <>
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-sm font-medium text-blue-700">
                  Doctor professional profile
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorSpecialty">Specialty</Label>
                  <select
                    id="doctorSpecialty"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={doctorSpecialty}
                    onChange={(event) => setDoctorSpecialty(event.target.value)}
                    required
                  >
                    <option value="">Select specialty</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Nephrology">Nephrology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Family Medicine">Family Medicine</option>
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="doctorExperienceYears">Years of Experience</Label>
                    <Input
                      id="doctorExperienceYears"
                      type="number"
                      min={0}
                      max={60}
                      value={doctorExperienceYears}
                      onChange={(event) => setDoctorExperienceYears(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctorLicenseNumber">License Number</Label>
                    <Input
                      id="doctorLicenseNumber"
                      value={doctorLicenseNumber}
                      onChange={(event) => setDoctorLicenseNumber(event.target.value)}
                      placeholder="Medical license ID"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic/Hospital</Label>
                  <Input
                    id="clinicName"
                    value={clinicName}
                    onChange={(event) => setClinicName(event.target.value)}
                    placeholder="City Care Clinic"
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-700 underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
