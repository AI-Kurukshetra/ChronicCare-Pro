'use client';

import Link from 'next/link';

import { APP_NAME, APP_TAGLINE } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand/brand-mark';

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <BrandMark className="h-7 w-7 rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold md:text-base">{APP_NAME}</p>
            <p className="truncate text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
