import type { ReactNode } from 'react';

import { useInterfaceStyle } from '../hooks/useSettings';

interface SectionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

/**
 * A section of a page.
 *
 * In the Jujutsu interface it is a file with a tab: the title stands above the card's top
 * edge, the way a case file is labelled. It is one piece with the card — same surface, and it
 * overlaps the top border by the border's own width, so the line runs up and around the tab
 * instead of under it. The top margin is the tab's height, and it belongs to the card rather
 * than to whatever lays the cards out, so twenty-odd call sites did not need to learn that a
 * tab exists.
 *
 * In Classic it is the plain panel it always was, heading inside.
 */
export function SectionCard({ title, description, children }: SectionCardProps) {
  const style = useInterfaceStyle();

  if (style === 'classic') {
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

  return (
    <section className="relative mt-9 rounded-lg rounded-tl-none border border-void-800 bg-void-900 p-5">
      <h2 className="absolute bottom-full -left-px -mb-px max-w-full truncate rounded-t-md border border-b-0 border-void-800 bg-void-900 px-4 pb-1 pt-1.5 font-display text-base text-ash-100">
        {title}
      </h2>
      {description ? <p className="mb-4 text-xs text-ash-500">{description}</p> : null}
      {children}
    </section>
  );
}
