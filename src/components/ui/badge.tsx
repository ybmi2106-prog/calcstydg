import * as React from 'react';
import { cn } from '@/utils/cn';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
};

const variants = {
  default: 'bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-200',
  success: 'bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-200',
  warning: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
  outline: 'border border-border text-muted-foreground'
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', variants[variant], className)} {...props} />;
}
