'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatUtcDate } from '@/lib/date-format';

type DoctorPatient = {
  id: number;
  full_name: string;
  email: string | null;
  age: number | null;
  disease: string | null;
  created_at: string;
};

export function PatientsPanel({ patients }: { patients: DoctorPatient[] }) {
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState<'all' | 'with_email' | 'without_email'>('all');

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        patient.full_name.toLowerCase().includes(q) ||
        (patient.email ?? '').toLowerCase().includes(q) ||
        String(patient.id).includes(q);
      const matchesEmail =
        emailFilter === 'all' ||
        (emailFilter === 'with_email' && Boolean(patient.email)) ||
        (emailFilter === 'without_email' && !patient.email);

      return matchesSearch && matchesEmail;
    });
  }, [patients, search, emailFilter]);

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>My Patients</CardTitle>
        <CardDescription>Search and open patient details assigned to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by patient name, email, or id"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={emailFilter}
            onChange={(event) => setEmailFilter(event.target.value as 'all' | 'with_email' | 'without_email')}
          >
            <option value="all">All patients</option>
            <option value="with_email">With email</option>
            <option value="without_email">Without email</option>
          </select>
        </div>

        {filteredPatients.length === 0 && (
          <p className="text-sm text-muted-foreground">No patients found for current filters.</p>
        )}

        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="rounded-xl border bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm transition hover:shadow"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-slate-700" />
                    <p className="truncate font-medium">{patient.full_name}</p>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {patient.email ?? 'No email'} {typeof patient.age === 'number' ? `• Age ${patient.age}` : ''}
                  </p>
                  {patient.disease && <p className="text-xs text-muted-foreground">Condition: {patient.disease}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Added {formatUtcDate(patient.created_at)}
                  </p>
                </div>
                <Link className="text-sm font-medium text-slate-900 underline" href={`/doctor/patients/${patient.id}`}>
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
