import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Longest edge, in pixels, that a listing photo is stored at.
 *
 * A phone camera produces roughly 4000×3000. At 1600 the photo still fills a
 * listing card and detail hero on any phone, while the file drops by an order
 * of magnitude.
 */
export const MAX_EDGE = 1600;

/**
 * JPEG quality after resizing. 0.7 is the point where further reduction starts
 * showing on flat surfaces like painted walls — which is most of a property
 * photograph.
 */
export const JPEG_QUALITY = 0.7;

export interface CompressedPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * Computes the resize target that caps the longest edge at MAX_EDGE while
 * preserving aspect ratio.
 *
 * Returns null when the image is already small enough — there is no point
 * re-encoding a photo that needs no resizing, and doing so only loses quality.
 */
export function resizeTarget(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return null;

  const ratio = maxEdge / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Resizes and compresses a picked photo before upload.
 *
 * Lagos mobile data is the constraint this exists for: an uncompressed camera
 * frame is 6–8 MB, and five of them is a landlord abandoning the form. After
 * this a photo is typically around 300 KB.
 */
export async function compressPhoto(
  uri: string,
  width: number,
  height: number,
): Promise<CompressedPhoto> {
  const target = resizeTarget(width, height);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    target ? [{ resize: target }] : [],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  return { uri: result.uri, width: result.width, height: result.height };
}
