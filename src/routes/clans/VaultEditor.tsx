import { ASSET_TYPES } from '../../domain/clans';
import type { Clan, ClanAsset } from '../../domain/entities';
import { AreaCell, Cell, Row, RowList } from './RowList';

interface VaultEditorProps {
  readonly clan: Clan;
  readonly onChange: (patch: Partial<Clan>) => void;
  /** Saved cursed tools and objects, for the "which record is this" picker. */
  readonly holdables: readonly { readonly id: string; readonly name: string }[];
}

/**
 * The clan vault: money and things.
 *
 * ⚠️ **The money is free text and nothing totals it.** Same reasoning as Cursed Rating (§4) —
 * what a clan has is a figure somebody decides, and a second number here computed from a list
 * of movements would eventually disagree with it. Writing “¥4,200,000 — after the Kyoto
 * repairs” is allowed and is often the honest answer.
 *
 * A holding may point at a saved cursed tool or object, which is what makes the Holy Sinner’s
 * Blade a thing the clan owns rather than a line of text repeating its name.
 */
export function VaultEditor({ clan, onChange, holdables }: VaultEditorProps) {
  const treasury = clan.treasury;

  const patchAsset = (id: string, patch: Partial<ClanAsset>) =>
    onChange({
      treasury: {
        ...treasury,
        assets: treasury.assets.map((asset) =>
          asset.id === id ? { ...asset, ...patch } : asset,
        ),
      },
    });

  return (
    <>
      <section className="mt-5 border-t border-void-800 pt-4">
        <h4 className="mb-2 text-xs font-medium tracking-wide text-ash-400">Clan vault</h4>
        <div className="flex flex-wrap items-start gap-3">
          <Cell
            label="Funds"
            value={treasury.yen}
            onChange={(yen) => onChange({ treasury: { ...treasury, yen } })}
            placeholder="¥4,200,000"
            className="w-44"
          />
          <div className="min-w-[14rem] flex-1">
            <AreaCell
              label="Vault notes"
              value={treasury.notes}
              rows={2}
              placeholder="Held in the Osaka compound. Two keys, never together."
              onChange={(notes) => onChange({ treasury: { ...treasury, notes } })}
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ash-500">
          Free text, and nothing adds it up — a total computed here would eventually disagree
          with the one the clan actually has.
        </p>
      </section>

      <RowList
        title="Holdings"
        addLabel="Add holding"
        onAdd={() =>
          onChange({
            treasury: {
              ...treasury,
              assets: [
                ...treasury.assets,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  assetType: '',
                  recordId: '',
                  heldBy: '',
                  notes: '',
                },
              ],
            },
          })
        }
        count={treasury.assets.length}
        empty="Nothing in the vault. Tools, sealed objects, property, a debt somebody owes."
        hint="Pointing a holding at a saved record keeps the two in step; a holding with no record is still perfectly valid."
      >
        {treasury.assets.map((asset) => (
          <Row
            key={asset.id}
            removeLabel={`Remove ${asset.name || 'this holding'}`}
            onRemove={() =>
              onChange({
                treasury: {
                  ...treasury,
                  assets: treasury.assets.filter((other) => other.id !== asset.id),
                },
              })
            }
          >
            <div className="flex flex-wrap items-end gap-2">
              <Cell
                label="Name"
                value={asset.name}
                onChange={(name) => patchAsset(asset.id, { name })}
                placeholder="Holy Sinner’s Blade"
                className="min-w-[10rem] flex-1"
              />
              <Cell
                label="Type"
                value={asset.assetType}
                onChange={(assetType) => patchAsset(asset.id, { assetType })}
                suggestions={ASSET_TYPES}
                placeholder="Cursed tool"
                className="w-32"
              />
              <Cell
                label="Held by"
                value={asset.heldBy}
                onChange={(heldBy) => patchAsset(asset.id, { heldBy })}
                placeholder="In the vault"
                className="min-w-[8rem] flex-1"
              />
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="flex min-w-[12rem] flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-ash-500">
                  Vault record
                </span>
                <select
                  value={asset.recordId}
                  onChange={(event) => {
                    const recordId = event.target.value;
                    const found = holdables.find((item) => item.id === recordId);
                    // Picking a record names the holding too, if it has no name yet — that is
                    // almost always what was meant, and it stays editable afterwards.
                    patchAsset(asset.id, {
                      recordId,
                      ...(found && !asset.name.trim() ? { name: found.name } : {}),
                    });
                  }}
                  className="rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 outline-none focus:border-cursed-500"
                >
                  <option value="">Not a saved record</option>
                  {holdables.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <Cell
                label="Notes"
                value={asset.notes}
                onChange={(notes) => patchAsset(asset.id, { notes })}
                className="min-w-[12rem] flex-1"
              />
            </div>
          </Row>
        ))}
      </RowList>
    </>
  );
}
