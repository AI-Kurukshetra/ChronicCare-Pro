'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { useToast } from '@/components/ui/toaster';

const AUTH_TOAST_KEY = 'ccp_auth_toast';

export function AuthToastListener() {
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const value = window.localStorage.getItem(AUTH_TOAST_KEY);
    if (!value) return;

    if (value === 'logged_out') {
      toast({ title: 'Logged out', description: 'You have been signed out successfully.', variant: 'info' });
    }

    if (value === 'logged_in') {
      toast({ title: 'Welcome back', description: 'Login successful.', variant: 'success' });
    }

    window.localStorage.removeItem(AUTH_TOAST_KEY);
  }, [pathname, toast]);

  return null;
}
