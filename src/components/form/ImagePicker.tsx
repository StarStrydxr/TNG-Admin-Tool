import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { IMAGE_ACCEPT_ATTR, formatBytes, isAcceptedImageType } from '../../domain/image';
import { deleteImage, readImage, storeImage } from '../../services/images';
import { useAnnouncer } from '../../hooks/useAnnouncer';

interface ImagePickerProps {
  readonly label: string;
  /** Stored file name, or `''` for none. */
  readonly value: string;
  readonly onChange: (name: string) => void;
  /** Roughly how large the preview should be. */
  readonly size?: 'sm' | 'lg';
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Pick or drop a picture.
 *
 * Both routes are first-class, as asked: a file input (which is also what makes it reachable
 * from the keyboard) and a drop target. No native dialog plugin — that dependency was declined
 * (CLAUDE.md §11, phase 2.3).
 *
 * Replacing a picture deletes the old file. The record is the only thing that referenced it,
 * and leaving orphans behind would quietly grow the folder forever.
 */
export function ImagePicker({ label, value, onChange, size = 'sm' }: ImagePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { announce } = useAnnouncer();

  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreview(null);
      return;
    }
    void readImage(value).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const accept = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!isAcceptedImageType(file.type)) {
        setError('That is not a PNG, JPEG, WebP or GIF.');
        return;
      }

      setBusy(true);
      setError(null);
      const previous = value;

      try {
        const name = await storeImage(file);
        onChange(name);
        announce(`${label} set, ${formatBytes(file.size)} before resizing.`);
        if (previous && previous !== name) await deleteImage(previous);
      } catch (cause) {
        setError(errorText(cause));
      } finally {
        setBusy(false);
      }
    },
    [value, onChange, announce, label],
  );

  const clear = useCallback(async () => {
    const previous = value;
    onChange('');
    setPreview(null);
    announce(`${label} removed.`);
    if (previous) {
      try {
        await deleteImage(previous);
      } catch (cause) {
        setError(errorText(cause));
      }
    }
  }, [value, onChange, announce, label]);

  const box = size === 'lg' ? 'h-48 w-40' : 'h-28 w-24';

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium tracking-wide text-ash-400">{label}</span>

      <div className="flex items-start gap-3">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void accept(event.dataTransfer.files[0]);
          }}
          className={[
            box,
            'flex shrink-0 items-center justify-center overflow-hidden rounded-md border text-center transition-colors',
            dragging ? 'border-cursed-500 bg-cursed-600/10' : 'border-dashed border-void-700',
          ].join(' ')}
        >
          {preview ? (
            // Decorative: the record's own name is the label, so alt text would just repeat it.
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-[11px] leading-snug text-ash-500">
              {busy ? 'Saving…' : 'Drop an image here'}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTR}
            className="sr-only"
            onChange={(event) => {
              void accept(event.target.files?.[0]);
              // Allow re-picking the same file after a removal.
              event.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-300 transition-colors enabled:hover:border-cursed-600 enabled:hover:text-ash-100 disabled:opacity-40"
          >
            {value ? 'Replace…' : 'Choose a file…'}
          </button>

          {value ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clear()}
              className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors enabled:hover:border-blood-500 enabled:hover:text-blood-500 disabled:opacity-40"
            >
              Remove
            </button>
          ) : null}

          {value && !preview && !busy ? (
            <span className="max-w-[12rem] text-[11px] leading-snug text-ash-500">
              The file is missing from the images folder.
            </span>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-1 text-xs text-blood-500">{error}</p> : null}
    </div>
  );
}
