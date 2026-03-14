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

    router.push(getDashboardPathByRole(role));
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(14,165,233,0.14),transparent_40%)]" />
      <Card className="relative z-10 w-full max-w-md rounded-3xl border-blue-100/80 shadow-xl">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center gap-2">
            <BrandMark />
            <p className="text-sm font-semibold text-slate-700">{APP_NAME}</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Access
          </div>
          <CardTitle className="text-2xl">Sign in to {APP_NAME}</CardTitle>
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
    </div>
  );
}
