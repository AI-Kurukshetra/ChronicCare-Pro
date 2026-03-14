import { updateAppointmentStatus } from '@/app/doctor/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtcDateTime } from '@/lib/date-format';

type DoctorAppointment = {
  id: number;
  patient_id: string;
  date: string;
  type: 'video' | 'clinic';
  status: 'pending' | 'approved' | 'rejected';
  meeting_link: string | null;
};

const statusStyles: Record<DoctorAppointment['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800'
};

export function DoctorAppointmentsPanel({
  appointments,
  patientNameByUserId
}: {
  appointments: DoctorAppointment[];
  patientNameByUserId: Record<string, string>;
}) {
  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>Appointment Requests</CardTitle>
        <CardDescription>Approve or reject patient booking requests.</CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 && <p className="text-sm text-muted-foreground">No appointment requests.</p>}
        <div className="space-y-3">
          {appointments.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{patientNameByUserId[item.patient_id] ?? 'Unknown Patient'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatUtcDateTime(item.date)} - {item.type}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[item.status]}`}>
                  {item.status}
                </span>
              </div>

              {item.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <form action={updateAppointmentStatus}>
                    <input type="hidden" name="appointmentId" value={item.id} />
                    <input type="hidden" name="status" value="approved" />
                    {item.type === 'video' && (
                      <input
                        type="url"
                        name="meetingLink"
                        required
                        placeholder="https://meet.google.com/..."
                        className="mr-2 h-8 rounded-md border px-2 text-xs"
                      />
                    )}
                    <Button size="sm" type="submit">
                      Approve
                    </Button>
                  </form>
                  <form action={updateAppointmentStatus}>
                    <input type="hidden" name="appointmentId" value={item.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <Button size="sm" variant="outline" type="submit">
                      Reject
                    </Button>
                  </form>
                </div>
              )}

              {item.status === 'approved' && item.type === 'video' && item.meeting_link && (
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline" className="text-black hover:text-black">
                    <a href={item.meeting_link} target="_blank" rel="noreferrer">
                      Join Video Call
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
