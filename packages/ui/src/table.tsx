import type { HTMLAttributes, ReactNode } from 'react';

export function Table({ children, className = '' }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
      <table className={`w-full min-w-[560px] text-sm ${className}`}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-3 py-3 font-semibold ${className}`}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Tr({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-border/70 hover:bg-muted/70 ${className}`}>
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-3 text-foreground ${className}`}>{children}</td>;
}