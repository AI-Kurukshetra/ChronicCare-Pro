'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatUtcDateTime } from '@/lib/date-format';

type IntegrationConfig = {
  id: number;
  organization_id: number | null;
  provider: 'fhir' | 'epic' | 'cerner' | 'custom';
  environment: 'sandbox' | 'production';
  status: 'active' | 'inactive';
  auth_type: 'oauth2' | 'api_key';
  base_url: string;
  scopes: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type Organization = {
  id: number;
  name: string;
  slug: string;
};

type Draft = {
  organizationId: number | null;
  environment: 'sandbox' | 'production';
  status: 'active' | 'inactive';
  authType: 'oauth2' | 'api_key';
  baseUrl: string;
  scopes: string;
  accessToken: string;
  refreshToken: string;
};

type CreateDraft = {
  provider: 'fhir' | 'epic' | 'cerner' | 'custom';
  organizationId: number | null;
  environment: 'sandbox' | 'production';
  status: 'active' | 'inactive';
  authType: 'oauth2' | 'api_key';
  baseUrl: string;
  scopes: string;
  accessToken: string;
  refreshToken: string;
};

const defaultCreateDraft: CreateDraft = {
  provider: 'fhir' as const,
  organizationId: null,
  environment: 'sandbox' as const,
  status: 'active' as const,
  authType: 'oauth2' as const,
  baseUrl: '',
  scopes: '',
  accessToken: '',
  refreshToken: ''
};

export function IntegrationConfigManager({
  initialConfigs,
  organizations
}: {
  initialConfigs: IntegrationConfig[];
  organizations: Organization[];
}) {
  const [configs, setConfigs] = useState<IntegrationConfig[]>(initialConfigs);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(defaultCreateDraft);
  const [rowDrafts, setRowDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(
      initialConfigs.map((item) => [
        item.id,
        {
          organizationId: item.organization_id,
          environment: item.environment,
          status: item.status,
          authType: item.auth_type,
          baseUrl: item.base_url,
          scopes: item.scopes ?? '',
          accessToken: '',
          refreshToken: ''
        }
      ])
    ) as Record<number, Draft>
  );

  const [busy, setBusy] = useState<number | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const orgById = useMemo(
    () => Object.fromEntries(organizations.map((org) => [org.id, org.name])) as Record<number, string>,
    [organizations]
  );

  async function refreshConfigs() {
    const response = await fetch('/api/admin/integrations/configs');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? 'Failed to refresh configs.');
      return;
    }

    const nextConfigs = (payload.configs as IntegrationConfig[]) ?? [];
    setConfigs(nextConfigs);
    setRowDrafts(
      Object.fromEntries(
        nextConfigs.map((item) => [
          item.id,
          {
            organizationId: item.organization_id,
            environment: item.environment,
            status: item.status,
            authType: item.auth_type,
            baseUrl: item.base_url,
            scopes: item.scopes ?? '',
            accessToken: '',
            refreshToken: ''
          }
        ])
      ) as Record<number, Draft>
    );
  }

  async function createConfig() {
    setBusy('create');
    setError(null);
    setMessage(null);

    const response = await fetch('/api/admin/integrations/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createDraft)
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setError(payload.error ?? 'Failed to create config.');
      return;
    }

    setMessage(payload.message ?? 'Config created.');
    setCreateDraft(defaultCreateDraft);
    await refreshConfigs();
  }

  async function saveConfig(id: number) {
    const draft = rowDrafts[id];
    if (!draft) return;

    setBusy(id);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/integrations/configs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setError(payload.error ?? 'Failed to update config.');
      return;
    }

    setMessage(payload.message ?? 'Config updated.');
    await refreshConfigs();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Integration Config</CardTitle>
          <CardDescription>Add a new FHIR/EHR connector for your organization.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={createDraft.provider}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, provider: event.target.value as 'fhir' | 'epic' | 'cerner' | 'custom' }))}
          >
            <option value="fhir">fhir</option>
            <option value="epic">epic</option>
            <option value="cerner">cerner</option>
            <option value="custom">custom</option>
          </select>

          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={createDraft.organizationId ?? ''}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, organizationId: event.target.value ? Number(event.target.value) : null }))}
          >
            <option value="">No organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <Input
            placeholder="https://fhir.example.com"
            value={createDraft.baseUrl}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
          />

          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={createDraft.environment}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, environment: event.target.value as 'sandbox' | 'production' }))}
          >
            <option value="sandbox">sandbox</option>
            <option value="production">production</option>
          </select>

          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={createDraft.status}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>

          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={createDraft.authType}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, authType: event.target.value as 'oauth2' | 'api_key' }))}
          >
            <option value="oauth2">oauth2</option>
            <option value="api_key">api_key</option>
          </select>

          <Input
            placeholder="Scopes (optional)"
            value={createDraft.scopes}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, scopes: event.target.value }))}
          />

          <Input
            placeholder="Access token (optional)"
            value={createDraft.accessToken}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, accessToken: event.target.value }))}
          />

          <Input
            placeholder="Refresh token (optional)"
            value={createDraft.refreshToken}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, refreshToken: event.target.value }))}
          />

          <div className="md:col-span-3 flex items-center gap-2">
            <Button type="button" onClick={createConfig} disabled={busy === 'create'}>
              {busy === 'create' ? 'Creating...' : 'Create Config'}
            </Button>
            <Button type="button" variant="outline" onClick={refreshConfigs} disabled={busy !== null}>
              Refresh
            </Button>
          </div>

          {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
          {message && <p className="md:col-span-3 text-sm text-emerald-700">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Integration Configs</CardTitle>
          <CardDescription>Update connector endpoint, auth settings, status, and organization mapping.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {configs.length === 0 && <p className="text-sm text-muted-foreground">No configs available.</p>}
          {configs.map((config) => {
            const draft = rowDrafts[config.id];
            if (!draft) return null;

            return (
              <div key={config.id} className="rounded-xl border bg-white p-4">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium uppercase">{config.provider} #{config.id}</p>
                  <p className="text-xs text-muted-foreground">Updated {formatUtcDateTime(config.updated_at)}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={draft.organizationId ?? ''}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({
                        ...prev,
                        [config.id]: { ...prev[config.id], organizationId: event.target.value ? Number(event.target.value) : null }
                      }))
                    }
                  >
                    <option value="">No organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={draft.environment}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({
                        ...prev,
                        [config.id]: { ...prev[config.id], environment: event.target.value as 'sandbox' | 'production' }
                      }))
                    }
                  >
                    <option value="sandbox">sandbox</option>
                    <option value="production">production</option>
                  </select>

                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={draft.status}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({
                        ...prev,
                        [config.id]: { ...prev[config.id], status: event.target.value as 'active' | 'inactive' }
                      }))
                    }
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>

                  <Input
                    value={draft.baseUrl}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({ ...prev, [config.id]: { ...prev[config.id], baseUrl: event.target.value } }))
                    }
                    placeholder="Base URL"
                  />

                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={draft.authType}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({
                        ...prev,
                        [config.id]: { ...prev[config.id], authType: event.target.value as 'oauth2' | 'api_key' }
                      }))
                    }
                  >
                    <option value="oauth2">oauth2</option>
                    <option value="api_key">api_key</option>
                  </select>

                  <Input
                    value={draft.scopes}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({ ...prev, [config.id]: { ...prev[config.id], scopes: event.target.value } }))
                    }
                    placeholder="Scopes"
                  />

                  <Input
                    value={draft.accessToken}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({ ...prev, [config.id]: { ...prev[config.id], accessToken: event.target.value } }))
                    }
                    placeholder="Rotate access token (optional)"
                  />

                  <Input
                    value={draft.refreshToken}
                    onChange={(event) =>
                      setRowDrafts((prev) => ({ ...prev, [config.id]: { ...prev[config.id], refreshToken: event.target.value } }))
                    }
                    placeholder="Rotate refresh token (optional)"
                  />

                  <div className="flex items-center gap-2 md:col-span-1">
                    <Button type="button" size="sm" onClick={() => saveConfig(config.id)} disabled={busy === config.id}>
                      {busy === config.id ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Org: {config.organization_id ? (orgById[config.organization_id] ?? config.organization_id) : 'N/A'} • Last sync:{' '}
                  {config.last_synced_at ? formatUtcDateTime(config.last_synced_at) : 'Never'}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
