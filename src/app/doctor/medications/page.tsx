import { CheckCircle2, Pill, Search } from 'lucide-react';
import { redirect } from 'next/navigation';

import { MedicationManagerForm } from '@/components/doctor/medication-manager-form';
import { MedicationList } from '@/components/medications/medication-list';
import { Card, CardContent } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

const starterMedicineOptions = [
  'Metformin',
  'Insulin Glargine',
  'Amlodipine',
  'Losartan',
  'Atorvastatin',
  'Aspirin',
  'Bisoprolol',
  'Empagliflozin',
  'Sitagliptin'
];

export default async function DoctorMedicationsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'doctor') redirect('/login');

  const { data: patientsData } = await supabase
    .from('patients')
    .select('id,user_id,full_name,disease')
    .eq('doctor_id', user.id)
    .not('user_id', 'is', null)
    .order('full_name', { ascending: true });

  const patients = (patientsData ?? []) as Array<{
    id: number;
    user_id: string;
    full_name: string;
    disease: string | null;
  }>;
  const patientUserIds = patients.map((patient) => patient.user_id);

  const { data: medicationsData, error } = patientUserIds.length
    ? await supabase
        .from('medications')
        .select('id,patient_id,medicine_name,dosage,schedule,reminder_time,created_at')
        .in('patient_id', patientUserIds)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [], error: null };

  const medications = medicationsData ?? [];
  const medicationIds = medications.map((item) => item.id);
  const { data: adherenceData } = medicationIds.length
    ? await supabase
        .from('medication_adherence_logs')
        .select('id,medication_id,status,logged_at')
        .in('medication_id', medicationIds)
        .order('logged_at', { ascending: false })
        .limit(500)
    : { data: [] };
  const adherenceLogs =
    (adherenceData as Array<{
      id: number;
      medication_id: number;
      status: 'taken' | 'missed' | 'skipped';
      logged_at: string;
    }> | null) ?? [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentAdherence = adherenceLogs.filter((item) => new Date(item.logged_at).getTime() >= sevenDaysAgo);
  const adherenceRate = recentAdherence.length
    ? Math.round((recentAdherence.filter((item) => item.status === 'taken').length / recentAdherence.length) * 100)
    : 0;

  const uniqueNames = [...new Set(medications.map((item) => item.medicine_name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const medicineOptions = [...new Set([...uniqueNames, ...starterMedicineOptions])];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-800/60 bg-gradient-to-r from-blue-950 via-indigo-900 to-cyan-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Doctor Workspace</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Medication Manager</h1>
          <p className="max-w-2xl text-sm text-blue-100">Search medicines and assign prescription schedules to your patients.</p>
          <p className="text-xs text-blue-200">{APP_TITLE}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-blue-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Patients</p>
              <p className="text-2xl font-semibold">{patients.length}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <Pill className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-cyan-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Catalog Medicines</p>
              <p className="text-2xl font-semibold">{medicineOptions.length}</p>
            </div>
            <div className="rounded-full bg-cyan-50 p-2">
              <Search className="h-5 w-5 text-cyan-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Prescriptions</p>
              <p className="text-2xl font-semibold">{medications.length}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <Pill className="h-5 w-5 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">7d Adherence Rate</p>
              <p className="text-2xl font-semibold">{adherenceRate}%</p>
            </div>
            <div className="rounded-full bg-violet-50 p-2">
              <CheckCircle2 className="h-5 w-5 text-violet-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <MedicationManagerForm patients={patients} medicineOptions={medicineOptions} />

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <MedicationList
        medications={medications}
        title="Recent Assignments"
        description="Latest medicine assignments across your patient panel."
      />
    </div>
  );
}
