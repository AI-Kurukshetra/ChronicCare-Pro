import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MedicationItem = {
  id: number;
  medicine_name: string;
  dosage: string;
  schedule: string;
  reminder_time: string;
  created_at?: string;
};

export function MedicationList({
  medications,
  title = 'Medication Schedule',
  description = 'Current medication list and reminder times.'
}: {
  medications: MedicationItem[];
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {medications.length === 0 && <p className="text-sm text-muted-foreground">No medications assigned.</p>}
        <div className="space-y-3">
          {medications.map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              <p className="font-medium">{item.medicine_name}</p>
              <p className="text-sm text-muted-foreground">
                {item.dosage} - {item.schedule}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Reminder: {item.reminder_time}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
