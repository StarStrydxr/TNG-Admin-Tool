import { describe, expect, it } from 'vitest';

import {
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_EDGE,
  formatBytes,
  isAcceptedImageType,
  scaledDimensions,
  shouldReencode,
  storageExtension,
} from './image';

describe('accepted types', () => {
  it('takes the four web formats and nothing else', () => {
    expect(isAcceptedImageType('image/png')).toBe(true);
    expect(isAcceptedImageType('image/jpeg')).toBe(true);
    expect(isAcceptedImageType('image/webp')).toBe(true);
    expect(isAcceptedImageType('image/gif')).toBe(true);

    expect(isAcceptedImageType('image/svg+xml')).toBe(false);
    expect(isAcceptedImageType('application/pdf')).toBe(false);
    expect(isAcceptedImageType('')).toBe(false);
  });

  it('offers the same list to the file input', () => {
    expect(IMAGE_ACCEPT_ATTR).toBe('image/png,image/jpeg,image/webp,image/gif');
  });
});

describe('storage format', () => {
  it('keeps JPEG as JPEG and sends everything else to PNG', () => {
    expect(storageExtension('image/jpeg')).toBe('jpg');
    expect(storageExtension('image/png')).toBe('png');
    expect(storageExtension('image/webp')).toBe('png');
  });

  it('leaves a GIF a GIF, since re-encoding would keep only the first frame', () => {
    expect(storageExtension('image/gif')).toBe('gif');
    expect(shouldReencode('image/gif')).toBe(false);
    expect(shouldReencode('image/png')).toBe(true);
  });
});

describe('scaling', () => {
  it('fits the longest edge to the limit and keeps the ratio', () => {
    expect(scaledDimensions({ width: 4000, height: 2000 }, 1000)).toEqual({
      width: 1000,
      height: 500,
    });
    expect(scaledDimensions({ width: 2000, height: 4000 }, 1000)).toEqual({
      width: 500,
      height: 1000,
    });
  });

  it('leaves a small image alone rather than upscaling it', () => {
    const small = { width: 300, height: 200 };
    expect(scaledDimensions(small, 1000)).toEqual(small);
  });

  it('never rounds an edge down to zero', () => {
    expect(scaledDimensions({ width: 5000, height: 2 }, 100).height).toBe(1);
  });

  it('survives a zero-sized image instead of dividing by nothing', () => {
    expect(scaledDimensions({ width: 0, height: 0 }, 100)).toEqual({ width: 0, height: 0 });
  });

  it('defaults to the documented limit', () => {
    expect(scaledDimensions({ width: 4096, height: 4096 }).width).toBe(MAX_IMAGE_EDGE);
  });
});

describe('formatBytes', () => {
  it('scales the unit to the size', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
