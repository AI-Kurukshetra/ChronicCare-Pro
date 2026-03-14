'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bot,
  BookOpenText,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  UserPlus,
  type LucideIcon,
  MessageSquare,
  Pill,
  Sparkles,
  TriangleAlert,
  ChartSpline,
  PlugZap,
  Settings,
  BadgeCheck,
  Users,
  UsersRound,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

import { SignOutButton } from '@/components/dashboard/sign-out-button';
import { BrandMark } from '@/components/brand/brand-mark';
import { ProfileMenu } from '@/components/profile/profile-menu';
import { APP_NAME, APP_TAGLINE } from '@/lib/branding';
import { AppRole, getDashboardPathByRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

type SidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function Sidebar({
  role,
  isAuthenticated,
  userId,
  userName,
  userEmail,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}: {
  role: AppRole | null;
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const links: SidebarLink[] = [];

  if (isAuthenticated && role) {
    links.push({ href: getDashboardPathByRole(role), label: 'Dashboard', icon: LayoutDashboard });
    if (role === 'patient') {
      links.push({ href: '/patient/vitals', label: 'Vitals', icon: Activity });
      links.push({ href: '/patient/appointments', label: 'Appointments', icon: CalendarCheck });
      links.push({ href: '/patient/medications', label: 'Medications', icon: Pill });
      links.push({ href: '/patient/chat', label: 'Messages', icon: MessageSquare });
      links.push({ href: '/patient/ai', label: 'Analytics', icon: Sparkles });
      links.push({ href: '/patient/coach', label: 'AI Coach', icon: Bot });
      links.push({ href: '/patient/care-plan', label: 'Care Plan', icon: ClipboardCheck });
      links.push({ href: '/patient/education', label: 'Education', icon: BookOpenText });
      links.push({ href: '/patient/emergency', label: 'Emergency', icon: TriangleAlert });
      links.push({ href: '/patient/settings', label: 'Settings', icon: Settings });
    }
    if (role === 'doctor') {
      links.push({ href: '/doctor/patients', label: 'Patients', icon: UsersRound });
      links.push({ href: '/doctor/alerts', label: 'Alerts', icon: TriangleAlert });
      links.push({ href: '/doctor/analytics', label: 'Vitals', icon: Activity });
      links.push({ href: '/doctor/medications', label: 'Medications', icon: Pill });
      links.push({ href: '/doctor/appointments', label: 'Appointments', icon: CalendarCheck });
      links.push({ href: '/doctor/analytics', label: 'Analytics', icon: ChartSpline });
      links.push({ href: '/doctor/messages', label: 'Messages', icon: MessageSquare });
      links.push({ href: '/doctor/care-plans', label: 'Care Plans', icon: ClipboardList });
      links.push({ href: '/doctor/settings', label: 'Settings', icon: Settings });
    }
    if (role === 'admin') {
      links.push({ href: '/admin/manage-users', label: 'Manage Users', icon: Users });
      links.push({ href: '/admin/integrations', label: 'Integrations', icon: PlugZap });
      links.push({ href: '/admin/data-quality', label: 'Data Quality', icon: BadgeCheck });
      links.push({ href: '/admin/settings', label: 'Settings', icon: Settings });
    }
  }

  if (!isAuthenticated) {
    links.push({ href: '/login', label: 'Login', icon: LogIn });
    links.push({ href: '/signup', label: 'Sign Up', icon: UserPlus });
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex h-dvh w-72 flex-col border-r p-4 transition-all duration-300 ease-out md:sticky md:top-0 md:h-screen md:self-start md:translate-x-0',
        role === 'doctor' || role === 'admin' || role === 'patient'
          ? 'border-blue-800 bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950 text-white'
          : 'bg-white',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        isCollapsed ? 'md:w-20 md:p-3' : 'md:w-72'
      )}
    >
      <div className={cn('flex items-center', isCollapsed ? 'justify-center md:justify-between' : 'justify-between')}>
        {isCollapsed && <BrandMark className="hidden h-7 w-7 rounded-md md:inline-flex" />}
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 overflow-hidden transition-all duration-200',
            isCollapsed ? 'w-0 opacity-0 md:pointer-events-none' : 'w-auto opacity-100'
          )}
        >
          <BrandMark className="h-7 w-7 rounded-md" />
          <div className="min-w-0">
            <p className="whitespace-nowrap text-lg font-semibold">{APP_NAME}</p>
            <p
              className={cn(
                'mt-1 whitespace-nowrap text-xs',
                role === 'doctor' || role === 'admin' || role === 'patient' ? 'text-blue-200' : 'text-muted-foreground'
              )}
            >
              {APP_TAGLINE}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'hidden h-8 w-8 items-center justify-center rounded-md border md:inline-flex',
            role === 'doctor' || role === 'admin' || role === 'patient'
              ? 'border-blue-700 text-blue-100 hover:bg-blue-800/80'
              : 'text-muted-foreground hover:bg-slate-50'
          )}
          aria-label="Toggle sidebar width"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md border md:hidden',
            role === 'doctor' || role === 'admin' || role === 'patient'
              ? 'border-blue-700 text-blue-100 hover:bg-blue-800/80'
              : 'text-muted-foreground hover:bg-slate-50'
          )}
          aria-label="Close sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <nav className={cn('mt-5 flex-1 space-y-1 overflow-y-auto pr-1', isCollapsed ? 'md:mt-4' : 'md:mt-6')}>
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              onClick={onCloseMobile}
              className={cn(
                'inline-flex w-full items-center rounded-md px-3 py-2 text-sm transition-all duration-200',
                isCollapsed ? 'justify-center gap-0' : 'gap-2',
                active
                  ? role === 'doctor' || role === 'admin' || role === 'patient'
                    ? 'bg-white text-blue-900'
                    : 'bg-primary text-primary-foreground'
                  : role === 'doctor' || role === 'admin' || role === 'patient'
                    ? 'text-blue-100 hover:bg-blue-800/80 hover:text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap transition-all duration-200',
                  isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                )}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {isAuthenticated && role && (
        <div className={cn('mt-auto border-t pt-4', isCollapsed && 'md:pt-3')}>
          {userId && (
            <ProfileMenu
              userId={userId}
              role={role}
              userName={userName}
              userEmail={userEmail}
              isCollapsed={isCollapsed}
            />
          )}

          <SignOutButton
            className={cn('w-full', isCollapsed && 'px-0')}
            variant="outline"
            size={isCollapsed ? 'icon' : 'default'}
          >
            {isCollapsed ? <LogOut className="h-4 w-4" /> : 'Logout'}
          </SignOutButton>
        </div>
      )}
    </aside>
  );
}
