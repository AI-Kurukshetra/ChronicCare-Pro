'use client';

import { useEffect } from 'react';

import { useToast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';

export function EmergencyRealtimeAlert({ doctorId }: { doctorId: string }) {
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`doctor-emergency-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_events',
          filter: `doctor_id=eq.${doctorId}`
        },
        (payload) => {
          const row = payload.new as { reason?: string; status?: string };
          if (row.status === 'open') {
            toast({
              title: 'New emergency request',
              description: row.reason ?? 'A patient triggered an emergency event.',
              variant: 'error'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, toast]);

  return null;
}
