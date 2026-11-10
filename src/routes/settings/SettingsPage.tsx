import { useSettings } from '../../hooks/useSettings';
import { AccessibilitySection } from './AccessibilitySection';
import { BackgroundSection } from './BackgroundSection';
import { DataSection } from './DataSection';
import { DifficultySection } from './DifficultySection';
import { ProblemsSection } from './ProblemsSection';
import { MyMaterialSection } from './MyMaterialSection';
import { VaultSyncSection } from './VaultSyncSection';
import { TemplatesSection } from './TemplatesSection';
import { RolesSection } from './RolesSection';
import { ThemeSection } from './ThemeSection';

export function SettingsPage() {
  const { error, dismissError } = useSettings();

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {error ? (
        <div className="flex items-start justify-between gap-4 rounded-md border border-blood-500/40 bg-blood-500/10 px-4 py-3">
          <p className="text-sm text-ash-300">Settings could not be saved: {error}</p>
          <button
            type="button"
            onClick={dismissError}
            className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <RolesSection />
      <ThemeSection />
      <BackgroundSection />
      <AccessibilitySection />
      <DifficultySection />
      <TemplatesSection />
      <MyMaterialSection />
      <VaultSyncSection />
      <ProblemsSection />
      <DataSection />

      <p className="text-xs text-ash-500">
        Saved to <code className="font-mono">%APPDATA%\jjk-rp-vault\config.json</code> as you
        change things. Editable by hand; anything unreadable falls back to the default rather
        than breaking the app.
      </p>
    </div>
  );
}
