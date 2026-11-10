/**
 * Storing and loading pictures.
 *
 * Downscaling happens here, in the browser, before anything crosses to Rust: a canvas is free
 * and already present, where resizing on the Rust side would mean an image crate (CLAUDE.md
 * §10 — ask before adding a dependency).
 *
 * Reading comes back as a `data:` URL, which an `<img src>` takes directly. Results are cached
 * for the session so a list of twenty records does not re-read twenty files on every render.
 */

import {
  isAcceptedImageType,
  scaledDimensions,
  shouldReencode,
  storageExtension,
  type Dimensions,
} from '../domain/image';
import { call } from './transport';

/** Quality for re-encoded JPEGs. High enough that a portrait shows no obvious artefacts. */
const JPEG_QUALITY = 0.9;

const cache = new Map<string, string>();

function newImageId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    img.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not re-encode that image.'))),
      type,
      type === 'image/jpeg' ? JPEG_QUALITY : undefined,
    );
  });
}

/** Draw the image into a canvas at the fitted size and read the bytes back out. */
async function downscale(file: File): Promise<{ bytes: Uint8Array; type: string }> {
  const img = await loadBitmap(file);
  const natural: Dimensions = { width: img.naturalWidth, height: img.naturalHeight };
  const target = scaledDimensions(natural);
  const resized = target.width !== natural.width || target.height !== natural.height;

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This system cannot resize images (no 2D canvas).');

  // A JPEG has no alpha; without this a transparent source turns black rather than white.
  if (file.type === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.imageSmoothingQuality = 'high';
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await canvasBlob(canvas, outputType);

  // Re-encoding an already-optimised file can make it bigger. When nothing was resized and the
  // round trip gained nothing, keep the original bytes.
  if (!resized && blob.size >= file.size) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type };
  }

  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: outputType };
}

/**
 * Put a picked or dropped file into the image folder.
 *
 * Returns the stored file name, which is what goes in the record.
 */
export async function storeImage(file: File): Promise<string> {
  if (!isAcceptedImageType(file.type)) {
    throw new Error(`${file.type || 'That file'} is not an image type this app stores.`);
  }

  const { bytes, type } = shouldReencode(file.type)
    ? await downscale(file)
    : { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type };

  const name = await call<string>('image_save', {
    id: newImageId(),
    ext: storageExtension(type),
    // Tauri takes a plain number array over the bridge.
    bytes: Array.from(bytes),
  });

  return name;
}

/** A `data:` URL for an `<img src>`, or null when the file is gone. */
export async function readImage(name: string): Promise<string | null> {
  if (!name) return null;

  const cached = cache.get(name);
  if (cached) return cached;

  try {
    const url = await call<string>('image_load', { name });
    cache.set(name, url);
    return url;
  } catch {
    // A picture deleted from the folder by hand is a gap in the UI, not an error to raise.
    return null;
  }
}

export async function deleteImage(name: string): Promise<void> {
  if (!name) return;
  cache.delete(name);
  await call<void>('image_delete', { name });
}

/**
 * Every picture file name on disk.
 *
 * Returns null when the shell is not there, which the problems panel reads as "cannot tell"
 * and skips the missing-picture check rather than reporting every record as broken.
 */
export async function listImageNames(): Promise<ReadonlySet<string> | null> {
  try {
    const names = await call<readonly string[]>('image_list');
    return new Set(names);
  } catch {
    return null;
  }
}

export async function revealImageFolder(): Promise<void> {
  await call<void>('image_reveal');
}
