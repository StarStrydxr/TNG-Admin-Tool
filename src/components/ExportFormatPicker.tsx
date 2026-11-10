import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  type ExportFormat,
} from '../services/exports';

interface ExportFormatPickerProps {
  readonly value: ExportFormat;
  readonly onChange: (format: ExportFormat) => void;
}

/**
 * Which template set the next export renders with.
 *
 * Deliberately a bare select beside the Export button rather than a setting: the choice belongs
 * to the thing being exported — a sheet for the GM's own folder wants readable markdown, the
 * same record going into a channel wants the posting format — so it is asked for at the moment
 * it matters and defaults back to readable markdown each session.
 */
export function ExportFormatPicker({ value, onChange }: ExportFormatPickerProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ExportFormat)}
      aria-label="Export format"
      title="Which template set the export renders with"
      className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-500 outline-none transition-colors hover:border-void-600 hover:text-ash-300 focus:border-cursed-500"
    >
      {EXPORT_FORMATS.map((format) => (
        <option key={format} value={format}>
          {EXPORT_FORMAT_LABELS[format]}
        </option>
      ))}
    </select>
  );
}
