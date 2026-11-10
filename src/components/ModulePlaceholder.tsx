interface ModulePlaceholderProps {
  readonly phase: string;
  readonly summary: string;
  readonly planned: readonly string[];
}

/** Scaffold filler. Delete each one as its module lands. */
export function ModulePlaceholder({ phase, summary, planned }: ModulePlaceholderProps) {
  return (
    <section className="max-w-2xl rounded-lg border border-void-800 bg-void-900 p-6">
      <span className="inline-block rounded-sm bg-void-700 px-2 py-0.5 font-mono text-[11px] tracking-wide text-ash-400">
        {phase}
      </span>
      <p className="mt-3 text-sm leading-relaxed text-ash-300">{summary}</p>
      <ul className="mt-4 space-y-1.5">
        {planned.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm text-ash-500">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-void-600" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
