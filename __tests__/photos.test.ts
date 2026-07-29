import { resizeTarget, MAX_EDGE, JPEG_QUALITY } from '../src/lib/photos';

describe('resizeTarget', () => {
  it('caps a landscape photo at the long edge', () => {
    expect(resizeTarget(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });

  it('caps a portrait photo at the long edge', () => {
    expect(resizeTarget(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('preserves aspect ratio on an unusual shape', () => {
    const result = resizeTarget(3200, 800);
    expect(result).toEqual({ width: 1600, height: 400 });
  });

  it('returns null when the photo is already small enough', () => {
    expect(resizeTarget(1200, 900)).toBeNull();
  });

  it('returns null at exactly the maximum edge, avoiding a pointless re-encode', () => {
    expect(resizeTarget(1600, 1200)).toBeNull();
  });

  it('resizes a photo one pixel over the limit', () => {
    expect(resizeTarget(1601, 1601)).toEqual({ width: 1600, height: 1600 });
  });

  it('handles a square photo', () => {
    expect(resizeTarget(3000, 3000)).toEqual({ width: 1600, height: 1600 });
  });

  it('respects a custom maximum edge', () => {
    expect(resizeTarget(4000, 2000, 800)).toEqual({ width: 800, height: 400 });
  });

  it('never returns a dimension above the cap', () => {
    for (const [w, h] of [
      [4032, 3024],
      [3024, 4032],
      [5000, 1000],
      [1000, 5000],
    ]) {
      const r = resizeTarget(w, h);
      expect(r).not.toBeNull();
      expect(Math.max(r!.width, r!.height)).toBeLessThanOrEqual(MAX_EDGE);
    }
  });
});

describe('compression constants', () => {
  it('caps the long edge at a size that still fills a phone screen', () => {
    expect(MAX_EDGE).toBe(1600);
  });

  it('keeps quality above the point where flat walls show artefacts', () => {
    expect(JPEG_QUALITY).toBeGreaterThanOrEqual(0.6);
    expect(JPEG_QUALITY).toBeLessThan(1);
  });
});
