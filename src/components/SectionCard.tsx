import type { ReactNode } from 'react';

interface SectionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-lg border border-void-800 bg-void-900 p-5">
      <header className="mb-4">
        <h2 className="font-display text-base text-ash-100">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ash-500">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
