'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { addClinicalNote, type ClinicalNoteState } from '@/app/doctor/patients/[id]/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toaster';

const initialState: ClinicalNoteState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Add Note'}
    </Button>
  );
}

export function AddClinicalNoteForm({ patientRecordId }: { patientRecordId: number }) {
  const [state, action] = useFormState(addClinicalNote, initialState);
  const [note, setNote] = useState('');
  const [isPatientVisible, setIsPatientVisible] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      setNote('');
      toast({ title: 'Clinical note added', description: state.success, variant: 'success' });
    }
    if (state.error) {
      toast({ title: 'Note save failed', description: state.error, variant: 'error' });
    }
  }, [state.error, state.success, toast]);

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-white p-4">
      <input type="hidden" name="patientRecordId" value={patientRecordId} />
      <input type="hidden" name="isPatientVisible" value={String(isPatientVisible)} />
      <p className="text-sm font-medium">Add Clinical Note</p>
      <Textarea
        name="note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Document assessment, follow-up plan, and instructions..."
        rows={4}
        required
      />
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={isPatientVisible}
          onChange={(event) => setIsPatientVisible(event.target.checked)}
          className="h-4 w-4 rounded border"
        />
        Visible to patient
      </label>
      <SubmitButton />
    </form>
  );
}
