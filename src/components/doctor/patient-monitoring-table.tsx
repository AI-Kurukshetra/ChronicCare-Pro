import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtcDateTime } from '@/lib/date-format';

type MonitoringRow = {
  id: number;
  patientUserId: string | null;
  full_name: string;
  disease: string | null;
  latestVital: string;
  riskScore: number;
  riskLevel: 'critical' | 'warning' | 'normal';
  statusIndicator: 'stable' | 'warning' | 'critical';
  lastUpdate: string | null;
};

export function PatientMonitoringTable({ rows }: { rows: MonitoringRow[] }) {
  return (
    <Card className="border-blue-100/70 bg-cyan-50/60 shadow-sm">
      <CardHeader>
        <CardTitle>Patient Monitoring</CardTitle>
        <CardDescription>Prioritize high-risk patients with latest vitals and activity updates.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-3 pr-4">Patient Name</th>
              <th className="py-3 pr-4">Condition</th>
              <th className="py-3 pr-4">Latest Vitals</th>
              <th className="py-3 pr-4">Risk Score</th>
              <th className="py-3 pr-4">Last Update</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={7}>
                  No patients available yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-blue-100/60 last:border-0">
                <td className="py-3 pr-4 font-medium">{row.full_name}</td>
                <td className="py-3 pr-4">{row.disease ?? 'Not specified'}</td>
                <td className="py-3 pr-4">{row.latestVital}</td>
                <td className="py-3 pr-4">
                  <span
                    className={
                      row.riskLevel === 'critical'
                        ? 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700'
                        : row.riskLevel === 'warning'
                          ? 'rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700'
                          : 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                    }
                  >
                    {row.riskScore}%
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {row.lastUpdate ? formatUtcDateTime(row.lastUpdate) : 'No updates'}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={
                      row.statusIndicator === 'critical'
                        ? 'inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
                        : row.statusIndicator === 'warning'
                          ? 'inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700'
                          : 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                    }
                  >
                    {row.statusIndicator}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Link href={`/doctor/patients/${row.id}`} className="font-medium text-blue-700 underline">
                      View Profile
                    </Link>
                    {row.patientUserId ? (
                      <Link href={`/doctor/messages?patient=${row.patientUserId}`} className="font-medium text-blue-700 underline">
                        Send Message
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Send Message</span>
                    )}
                    <Link href={`/doctor/patients/${row.id}`} className="font-medium text-blue-700 underline">
                      View Charts
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
