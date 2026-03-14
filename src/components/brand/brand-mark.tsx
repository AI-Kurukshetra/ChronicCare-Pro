import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-blue-200',
        className
      )}
      aria-hidden="true"
    >
      <img src="/assets/medical-logo.svg" alt="Medical logo" className="h-4 w-4" />
    </span>
  );
}
