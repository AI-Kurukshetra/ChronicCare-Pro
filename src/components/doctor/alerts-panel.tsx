import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DoctorAlert = {
  id: number;
  patient_id: string;
  type: string;
  severity: string;
  message: string;
  created_at: string;
  status: string;
};

export function AlertsPanel({
  alerts,
  patientNameByUserId,
  patientRouteByUserId,
  patientIdByUserId
}: {
  alerts: DoctorAlert[];
  patientNameByUserId: Record<string, string>;
  patientRouteByUserId: Record<string, string>;
  patientIdByUserId: Record<string, number>;
}) {
  function severityClasses(severity: string) {
    if (severity === 'critical') return 'border-red-200 bg-red-50';
    if (severity === 'high') return 'border-orange-200 bg-orange-50';
    if (severity === 'medium') return 'border-amber-200 bg-amber-50';
    return 'border-emerald-200 bg-emerald-50';
  }

  function severityText(severity: string) {
    if (severity === 'critical') return 'text-red-700';
    if (severity === 'high') return 'text-orange-700';
    if (severity === 'medium') return 'text-amber-700';
    return 'text-emerald-700';
  }

  return (
    <Card className="border-red-100/70 bg-red-50/40 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Critical Alerts
        </CardTitle>
        <CardDescription>Auto-generated when vitals cross threshold values.</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts right now.</p>}

        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded-lg border p-4 ${severityClasses(alert.severity)}`}>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p className="font-medium">
                  {patientNameByUserId[alert.patient_id] ?? 'Unknown Patient'} - {alert.type.toUpperCase()}
                </p>
                <p className={`text-xs ${severityText(alert.severity)}`}>{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              <p className={`mt-1 text-sm ${severityText(alert.severity)}`}>{alert.message}</p>
              <p className={`mt-1 text-xs uppercase tracking-wide ${severityText(alert.severity)}`}>
                Severity: {alert.severity} - Status: {alert.status}
              </p>
              {alert.patient_id in patientRouteByUserId && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href={patientRouteByUserId[alert.patient_id]}
                    className={`inline-block text-xs font-medium underline ${severityText(alert.severity)}`}
                  >
                    View Patient
                  </Link>
                  <Link
                    href={`/doctor/messages?patient=${alert.patient_id}`}
                    className={`inline-block text-xs font-medium underline ${severityText(alert.severity)}`}
                  >
                    Send Message
                  </Link>
                  <Link
                    href={`/doctor/appointments${patientIdByUserId[alert.patient_id] ? `?patient=${patientIdByUserId[alert.patient_id]}` : ''}`}
                    className={`inline-block text-xs font-medium underline ${severityText(alert.severity)}`}
                  >
                    Schedule Appointment
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
