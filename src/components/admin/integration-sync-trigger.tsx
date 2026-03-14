'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

type IntegrationSyncTriggerProps = {
  integrationConfigId?: number;
  organizationId?: number;
};

export function IntegrationSyncTrigger({ integrationConfigId, organizationId }: IntegrationSyncTriggerProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function triggerSync() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await fetch('/api/integrations/fhir/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrationConfigId,
        organizationId,
        operation: 'pull_observations',
        observations: []
      })
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? 'Sync trigger failed.');
      return;
    }

    setMessage(payload.message ?? 'Sync started successfully. Refresh to view latest job status.');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={triggerSync} disabled={loading}>
          {loading ? 'Triggering...' : 'Run FHIR Sync'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
