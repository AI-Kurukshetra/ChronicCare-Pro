import type { Metadata } from 'next';

import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { APP_TITLE } from '@/lib/branding';

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_TITLE
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
