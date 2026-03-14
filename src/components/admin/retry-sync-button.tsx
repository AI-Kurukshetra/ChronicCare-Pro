'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function RetrySyncButton({ jobId }: { jobId: number }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/integrations/sync-jobs/${jobId}/retry`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? 'Retry failed.');
      return;
    }

    setMessage(payload.message ?? 'Queued for retry.');
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="outline" type="button" onClick={retry} disabled={loading}>
        {loading ? 'Retrying...' : 'Retry'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && <p className="text-xs text-emerald-700">{message}</p>}
    </div>
  );
}
