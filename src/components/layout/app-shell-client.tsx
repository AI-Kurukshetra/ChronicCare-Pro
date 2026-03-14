'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Search } from 'lucide-react';

import { AuthToastListener } from '@/components/auth/auth-toast-listener';
import { Sidebar } from '@/components/layout/sidebar';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { ToastProvider } from '@/components/ui/toaster';
import { type AppRole } from '@/lib/auth/roles';

const publicPaths = new Set(['/', '/login', '/signup', '/register', '/set-password']);
const hidePublicNavbarPaths = new Set(['/login', '/signup', '/register', '/set-password']);

export function AppShellClient({
  children,
  role,
  isAuthenticated,
  userId,
  userName,
  userEmail
}: {
  children: React.ReactNode;
  role: AppRole | null;
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const isPublicPage = pathname ? publicPaths.has(pathname) : false;
  const isRoleWorkspacePage = pathname
    ? pathname.startsWith('/doctor') || pathname.startsWith('/admin') || pathname.startsWith('/patient')
    : false;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = pathname
    ? pathname
        .split('/')
        .filter(Boolean)
        .slice(0, 2)
        .join(' / ') || 'Dashboard'
    : 'Dashboard';

  if (isPublicPage) {
    const showPublicNavbar = pathname ? !hidePublicNavbarPaths.has(pathname) : true;
    return (
      <ToastProvider>
        <AuthToastListener />
        <div className="min-h-screen bg-slate-50">
          {showPublicNavbar && <PublicNavbar />}
          <main className="w-full">{children}</main>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AuthToastListener />
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">Dashboard</p>
        </div>

        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        <div className="md:flex md:min-h-screen">
          <Sidebar
            role={role}
            isAuthenticated={isAuthenticated}
            userId={userId}
            userName={userName}
            userEmail={userEmail}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <header
              className={`sticky top-0 z-20 hidden border-b px-6 py-3 backdrop-blur md:flex md:items-center md:justify-between ${
                isRoleWorkspacePage ? 'border-blue-800 bg-blue-950/85 text-white' : 'bg-white/90'
              }`}
            >
              <div>
                <p className={`text-xs uppercase tracking-[0.18em] ${isRoleWorkspacePage ? 'text-blue-200' : 'text-slate-500'}`}>Workspace</p>
                <p className={`text-sm font-semibold capitalize ${isRoleWorkspacePage ? 'text-white' : 'text-slate-900'}`}>{pageTitle.replace('/', ' > ')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className={`pointer-events-none absolute left-2 top-2.5 h-4 w-4 ${isRoleWorkspacePage ? 'text-blue-200' : 'text-slate-400'}`} />
                  <input
                    className={`h-9 w-64 rounded-md border pl-8 pr-3 text-sm ${
                      isRoleWorkspacePage
                        ? 'border-blue-700 bg-blue-900/80 text-white placeholder:text-blue-300'
                        : 'bg-slate-50'
                    }`}
                    placeholder="Search patient, alert, appointment"
                  />
                </div>
                <button
                  type="button"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${
                    isRoleWorkspacePage ? 'border-blue-700 bg-blue-900/70' : ''
                  }`}
                >
                  <Bell className={`h-4 w-4 ${isRoleWorkspacePage ? 'text-blue-100' : 'text-slate-600'}`} />
                </button>
              </div>
            </header>
            <main
              className={`flex-1 p-4 md:p-8 ${
                isRoleWorkspacePage ? 'bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950' : ''
              }`}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
