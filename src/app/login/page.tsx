'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';

import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, APP_TITLE } from '@/lib/branding';
import { getDashboardPathByRole, getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    const role = getUserRole(data.user);

    if (!role) {
      await supabase.auth.signOut();
      setError('No role is assigned to this account. Set role as patient, doctor, or admin.');
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ccp_auth_toast', 'logged_in');
    }
    router.push(getDashboardPathByRole(role));
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:min-h-[calc(100vh-3rem)] lg:grid-cols-2">
        <section className="relative hidden bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 p-8 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.22),transparent_45%)]" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2">
              <BrandMark />
              <p className="text-sm font-semibold">{APP_NAME}</p>
            </div>
            <h1 className="max-w-md text-4xl font-semibold leading-tight">Remote care operations for modern chronic programs.</h1>
            <p className="max-w-md text-sm text-blue-100">
              Manage patient vitals, alerts, medications, appointments, and AI health insights from one secure SaaS workspace.
            </p>
            <div className="grid max-w-md gap-3 text-sm text-blue-100">
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">Realtime patient monitoring and alerting</div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">Doctor-patient messaging and care plans</div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">AI-assisted risk intelligence and triage</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="inline-flex items-center gap-2">
                <BrandMark />
                <p className="text-sm font-semibold text-slate-700">{APP_NAME}</p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure Access
              </div>
              <CardTitle className="text-2xl">Sign in to your workspace</CardTitle>
              <CardDescription>{APP_TITLE}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  New here?{' '}
                  <Link href="/signup" className="font-medium text-blue-700 underline">
                    Create account
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
