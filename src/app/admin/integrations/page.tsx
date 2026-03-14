import type { ReactNode } from 'react';
import { Activity, Building2, RefreshCw, Workflow } from 'lucide-react';
import { redirect } from 'next/navigation';

import { IntegrationConfigManager } from '@/components/admin/integration-config-manager';
import { IntegrationSyncTrigger } from '@/components/admin/integration-sync-trigger';
import { RetrySyncButton } from '@/components/admin/retry-sync-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDateTime } from '@/lib/date-format';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

type SyncJob = {
  id: number;
  integration_config_id: number | null;
  source: 'fhir' | 'device' | 'manual';
  operation: 'pull_observations' | 'push_appointments' | 'pull_patients' | 'device_ingest';
  status: 'queued' | 'running' | 'completed' | 'failed';
  processed_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

type IntegrationLog = {
  id: number;
  sync_job_id: number | null;
  level: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
};

type Organization = {
  id: number;
  name: string;
  slug: string;
};

export default async function AdminIntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'admin') redirect('/login');

  const admin = createAdminClient();

  const [configsRes, jobsRes, logsRes, orgsRes] = await Promise.all([
    admin
      .from('integration_configs')
      .select('id,organization_id,provider,environment,status,auth_type,base_url,scopes,last_synced_at,created_at,updated_at')
      .order('created_at', { ascending: false }),
    admin
      .from('sync_jobs')
      .select('id,integration_config_id,source,operation,status,processed_count,failed_count,error_message,created_at,completed_at')
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('integration_logs')
      .select('id,sync_job_id,level,message,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    admin.from('organizations').select('id,name,slug').order('created_at', { ascending: false }).limit(50)
  ]);

  const configs = (configsRes.data as IntegrationConfig[] | null) ?? [];
  const jobs = (jobsRes.data as SyncJob[] | null) ?? [];
  const logs = (logsRes.data as IntegrationLog[] | null) ?? [];
  const orgs = (orgsRes.data as Organization[] | null) ?? [];

  const orgById = Object.fromEntries(orgs.map((org) => [org.id, org.name])) as Record<number, string>;
  const stats = {
    configs: configs.length,
    activeConfigs: configs.filter((item) => item.status === 'active').length,
    runningJobs: jobs.filter((item) => item.status === 'running').length,
    failedJobs: jobs.filter((item) => item.status === 'failed').length
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Admin Integrations</p>
            <h1 className="text-2xl font-semibold md:text-3xl">FHIR & Integration Operations</h1>
            <p className="max-w-2xl text-sm text-blue-100">Monitor EHR connectivity, sync jobs, and integration health from one console.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Integration Configs" value={stats.configs} subtitle={`${stats.activeConfigs} active`} icon={<Building2 className="h-5 w-5 text-blue-700" />} />
        <MetricCard title="Running Jobs" value={stats.runningJobs} subtitle="In progress" icon={<RefreshCw className="h-5 w-5 text-cyan-700" />} />
        <MetricCard title="Failed Jobs" value={stats.failedJobs} subtitle="Needs retry" icon={<Activity className="h-5 w-5 text-red-700" />} />
        <MetricCard title="Organizations" value={orgs.length} subtitle="Tenant records" icon={<Workflow className="h-5 w-5 text-emerald-700" />} />
      </div>

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle>Manual Sync Control</CardTitle>
          <CardDescription>Trigger ad-hoc FHIR sync to validate integration health and pipelines.</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationSyncTrigger integrationConfigId={configs[0]?.id} organizationId={configs[0]?.organization_id ?? undefined} />
        </CardContent>
      </Card>

      <IntegrationConfigManager initialConfigs={configs} organizations={orgs} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-blue-100/70 shadow-sm">
          <CardHeader>
            <CardTitle>Integration Configurations</CardTitle>
            <CardDescription>Provider endpoints and environment status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {configs.length === 0 && <p className="text-sm text-muted-foreground">No integration configs found. Insert one in `integration_configs`.</p>}
            {configs.map((config) => (
              <div key={config.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium uppercase">{config.provider}</p>
                  <span className={config.status === 'active' ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700'}>{config.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{config.base_url}</p>
                <p className="text-xs text-muted-foreground">
                  {config.environment} • Org: {config.organization_id ? (orgById[config.organization_id] ?? config.organization_id) : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last synced: {config.last_synced_at ? formatUtcDateTime(config.last_synced_at) : 'Never'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-blue-100/70 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Sync Jobs</CardTitle>
            <CardDescription>Track processing and retry failed jobs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 && <p className="text-sm text-muted-foreground">No sync jobs yet.</p>}
            {jobs.map((job) => (
              <div key={job.id} className="rounded-lg border bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium">Job #{job.id} • {job.operation}</p>
                  <span className={
                    job.status === 'completed'
                      ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700'
                      : job.status === 'failed'
                        ? 'rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700'
                        : 'rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700'
                  }>{job.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Processed: {job.processed_count} • Failed: {job.failed_count}
                </p>
                <p className="text-xs text-muted-foreground">Created: {formatUtcDateTime(job.created_at)}</p>
                {job.error_message && <p className="text-xs text-red-700">{job.error_message}</p>}
                {job.status === 'failed' && (
                  <div className="mt-2">
                    <RetrySyncButton jobId={job.id} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle>Integration Logs</CardTitle>
          <CardDescription>Operational log stream for sync pipelines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No integration logs available.</p>}
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border bg-slate-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  <span className={log.level === 'error' ? 'text-red-700' : log.level === 'warning' ? 'text-orange-700' : 'text-slate-700'}>
                    [{log.level.toUpperCase()}]
                  </span>{' '}
                  {log.message}
                </p>
                <span className="text-xs text-muted-foreground">{formatUtcDateTime(log.created_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Job: {log.sync_job_id ?? 'N/A'}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-blue-100/80 shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
