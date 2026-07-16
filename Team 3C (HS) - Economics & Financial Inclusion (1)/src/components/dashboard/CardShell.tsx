import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const CardShell = ({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) => (
  <div className="rounded-[var(--radius)] border border-border bg-card shadow-sm">
    <div className="flex items-start justify-between gap-3 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-primary-foreground">
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-display text-lg text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
    <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
    {footer && <div className="border-t border-border px-5 py-3.5 md:px-6">{footer}</div>}
  </div>
);

export const EmptyRow = ({ children }: { children: ReactNode }) => (
  <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>
);
