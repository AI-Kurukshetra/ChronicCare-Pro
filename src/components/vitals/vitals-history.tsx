import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtcDateTime } from '@/lib/date-format';
import { type VitalReading, vitalLabels, vitalUnits } from '@/lib/vitals';

export function VitalsHistory({ vitals, title = 'Vitals History' }: { vitals: VitalReading[]; title?: string }) {
  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Chronological list of recorded vital readings.</CardDescription>
      </CardHeader>
      <CardContent>
        {vitals.length === 0 && <p className="text-sm text-muted-foreground">No vitals recorded yet.</p>}

        <div className="space-y-3">
          {vitals.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p className="font-medium">{vitalLabels[item.type]}</p>
                <p className="text-xs text-muted-foreground">{formatUtcDateTime(item.timestamp)}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.value} {vitalUnits[item.type]}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
