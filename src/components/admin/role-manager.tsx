'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Shield, Stethoscope, UserRound, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type AppRole } from '@/lib/auth/roles';
import { formatUtcDate } from '@/lib/date-format';

type AdminUser = {
  id: string;
  email: string | null;
  role: AppRole | null;
  created_at: string;
};

const roleOptions: AppRole[] = ['patient', 'doctor', 'admin'];

export function RoleManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users');
      const payload = await response.json();

      if (!response.ok) {
        setLoading(false);
        setError(payload.error ?? 'Failed to load users.');
        return;
      }

      setUsers(payload.users as AdminUser[]);
      setLoading(false);
    };

    loadUsers();
  }, []);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [users]
  );

  const stats = useMemo(
    () => ({
      total: users.length,
      patient: users.filter((user) => user.role === 'patient').length,
      doctor: users.filter((user) => user.role === 'doctor').length,
      admin: users.filter((user) => user.role === 'admin').length
    }),
    [users]
  );

  const visibleUsers = useMemo(() => {
    return sortedUsers.filter((user) => {
      const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter;
      const emailText = (user.email ?? '').toLowerCase();
      const idText = user.id.toLowerCase();
      const q = search.trim().toLowerCase();
      const matchesSearch = q.length === 0 || emailText.includes(q) || idText.includes(q);

      return matchesRole && matchesSearch;
    });
  }, [sortedUsers, roleFilter, search]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-blue-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Users</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <Users className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-cyan-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Patients</p>
              <p className="text-2xl font-semibold">{stats.patient}</p>
            </div>
            <div className="rounded-full bg-cyan-50 p-2">
              <UserRound className="h-5 w-5 text-cyan-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Doctors</p>
              <p className="text-2xl font-semibold">{stats.doctor}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <Stethoscope className="h-5 w-5 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-100/80 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Admins</p>
              <p className="text-2xl font-semibold">{stats.admin}</p>
            </div>
            <div className="rounded-full bg-violet-50 p-2">
              <Shield className="h-5 w-5 text-violet-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-100/70 shadow-sm">
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>
            Read-only user directory. Doctors and patients now onboard from the public signup page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by email or user id"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'all' | AppRole)}
            >
              <option value="all">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading users...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && visibleUsers.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found for current filters.</p>
          )}

          {!loading && (
            <div className="space-y-3">
              {visibleUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm transition hover:shadow"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.email ?? user.id}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium capitalize">{user.role ?? 'unassigned'}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatUtcDate(user.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
