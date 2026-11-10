import { AttachTechnique } from '../../components/generator/AttachTechnique';
import { GeneratorPanel } from '../../components/generator/GeneratorPanel';
import { ShikigamiManager } from '../../components/generator/ShikigamiManager';
import { SHIKIGAMI_VARIANT_ID, TECHNIQUE_SPECS } from '../../generators/specs';

export function TechniqueGeneratorPage() {
  return (
    <GeneratorPanel
      specs={TECHNIQUE_SPECS}
      renderExtra={({ draft, tableSet, children, setChildren }) => (
        <>
          {draft.kind === 'technique' && draft.variant?.id === SHIKIGAMI_VARIANT_ID ? (
            <ShikigamiManager
              parentSeed={draft.seed}
              tableSet={tableSet}
              drafts={children}
              onChange={setChildren}
            />
          ) : null}

          {/* Only a technique goes on a sheet; a loose shikigami belongs to one. */}
          {draft.kind === 'technique' ? (
            <AttachTechnique draft={draft} household={children} />
          ) : null}
        </>
      )}
    />
  );
}
