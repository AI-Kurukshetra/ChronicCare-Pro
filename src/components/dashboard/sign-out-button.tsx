'use client';

import { useRouter } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type SignOutButtonProps = {
  className?: string;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  children?: ReactNode;
};

export function SignOutButton({
  className,
  variant = 'outline',
  size = 'default',
  children
}: SignOutButtonProps) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <Button className={cn('text-black hover:text-black', className)} variant={variant} size={size} onClick={signOut}>
      {children ?? 'Sign out'}
    </Button>
  );
}
