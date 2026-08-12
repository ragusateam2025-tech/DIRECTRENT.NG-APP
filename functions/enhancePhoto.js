const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');

/**
 * Quietly improves listing photographs after they are uploaded.
 *
 * Most property photos are taken indoors, on a phone, in a hurry. They come out
 * flat and slightly soft — not broken, just dull — and a dull photograph loses
 * to a bright one on a Browse screen regardless of which flat is better.
 *
 * What this cannot do is worth saying plainly: it will not rescue a blurred,
 * badly framed or very dark photograph. Nothing free will. It fixes flat
 * contrast and mild softness, which is the common case, and leaves everything
 * else alone.
 *
 * Restraint is the whole design. A photograph that is already well exposed is
 * left untouched, because auto-levelling a good picture flattens it — the
 * failure mode of every "enhance" button ever shipped. The image is measured
 * first and skipped unless it is genuinely lifeless.
 */

/**
 * Below this average channel spread, an image is flat enough to be worth
 * lifting. A well-exposed photograph typically sits well above it; a dim
 * interior sits below.
 */
const FLAT_STDEV = 52;

/** Marks a file as already processed, so writing it back cannot retrigger this. */
const DONE_FLAG = 'directrentEnhanced';

exports.enhanceListingPhoto = onObjectFinalized(
  {
    // Named rather than inferred. Without it the trigger has to resolve the
    // default bucket from FIREBASE_CONFIG, which is not reliably present while
    // the deploy tooling is analysing this file — the analysis simply times out
    // and reports that it cannot determine the backend.
    bucket: 'directrent-prod.firebasestorage.app',
    // us-east1 because that is where the bucket is, and a storage trigger must
    // live in the bucket's region. Note the split: Firestore is in Europe and
    // Storage is in the United States, so photographs travel from the US east
    // coast to Lagos while everything else comes from Europe. A bucket cannot
    // be moved after creation — changing it means a new bucket and copying
    // every file across.
    region: 'us-east1',
    memory: '1GiB',
    // Generous: sharp decodes, measures and re-encodes, and a cold start pulls
    // a native binary with it.
    timeoutSeconds: 120,
  },
  async event => {
    const { name, contentType, bucket: bucketName, metadata } = event.data;

    // Listing photographs only. Avatars are 96px and profile pictures are not
    // what anybody is judging a property on.
    if (!name || !name.startsWith('listings/')) return;
    if (!contentType || !contentType.startsWith('image/')) return;

    // The guard that stops this running on its own output. Without it the
    // write below retriggers the function, which writes again, forever — an
    // infinite loop that bills by the second.
    if (metadata && metadata[DONE_FLAG] === 'true') return;

    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(name);

    try {
      const [buffer] = await file.download();
      const image = sharp(buffer, { failOn: 'none' });
      const stats = await image.stats();

      // Average spread across the colour channels. Alpha is ignored — its
      // spread says nothing about how the photograph looks.
      const channels = stats.channels.slice(0, 3);
      const spread =
        channels.reduce((total, channel) => total + channel.stdev, 0) / channels.length;

      if (spread >= FLAT_STDEV) {
        logger.info('Photo already has good contrast, left alone', { name, spread });
        return;
      }

      // Deliberately gentle, in this order:
      //
      //   normalise  stretches the range, clipping only the extreme 1% at each
      //              end so a single blown highlight cannot decide the whole
      //              exposure
      //   modulate   a small saturation lift, because stretching contrast tends
      //              to leave colour looking thin
      //   sharpen    a light pass, well short of the halo that makes a photo
      //              look processed
      const enhanced = await sharp(buffer, { failOn: 'none' })
        .rotate() // Honours EXIF orientation, which is lost on re-encode.
        .normalise({ lower: 1, upper: 99 })
        .modulate({ saturation: 1.06 })
        .sharpen({ sigma: 0.7 })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      // Never make a file bigger. These are downloaded on Lagos mobile data,
      // and a prettier photograph that costs more to fetch is not an
      // improvement.
      if (enhanced.length > buffer.length) {
        logger.info('Enhanced version was larger, kept the original', { name });
        return;
      }

      // The existing metadata is carried over, and this matters more than it
      // looks: firebaseStorageDownloadTokens lives there, and the app has
      // already stored a download URL containing that token. Dropping it would
      // break every link to this photograph.
      await file.save(enhanced, {
        contentType: 'image/jpeg',
        metadata: {
          metadata: {
            ...(metadata || {}),
            [DONE_FLAG]: 'true',
          },
        },
      });

      logger.info('Lifted a flat photo', {
        name,
        spread,
        before: buffer.length,
        after: enhanced.length,
      });
    } catch (error) {
      // Never fatal. The original is already uploaded and already referenced by
      // the listing; a failure here means the photograph stays as it was, which
      // is exactly what happened before this function existed.
      logger.error('Could not enhance a photo', { name, error: String(error) });
    }
  },
);
