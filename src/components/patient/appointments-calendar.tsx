import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtcDateTime } from '@/lib/date-format';

type AppointmentItem = {
  id: number;
  date: string;
  type: 'video' | 'clinic';
  status: 'pending' | 'approved' | 'rejected';
  meeting_link: string | null;
};

const statusStyles: Record<AppointmentItem['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800'
};

export function AppointmentsCalendar({ appointments }: { appointments: AppointmentItem[] }) {
  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Appointment Calendar</CardTitle>
        <CardDescription>Track your requested appointments and approval status.</CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 && <p className="text-sm text-muted-foreground">No appointments yet.</p>}
        <div className="space-y-3">
          {appointments.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{formatUtcDateTime(item.date)}</p>
                  <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[item.status]}`}>
                  {item.status}
                </span>
              </div>
              {item.type === 'video' && item.status === 'approved' && item.meeting_link && (
                <div className="mt-3">
                  <a
                    href={item.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md border px-3 py-1.5 text-xs font-medium text-black hover:bg-slate-50"
                  >
                    Join Video Call
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
