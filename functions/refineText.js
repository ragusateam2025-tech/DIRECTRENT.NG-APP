const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

/**
 * Rewriting what somebody typed, through Google AI Studio's free tier.
 *
 * Server-side, and it has to be: the API key would otherwise ship inside the
 * app bundle, where anybody who unzips an APK can read it and spend the quota.
 * A callable rather than an HTTP endpoint so Firebase hands us the caller's uid
 * instead of us having to establish who is asking.
 *
 * The two prompts differ in more than tone. An owner's listing is advertising
 * copy and may be freely rearranged. A tenant's message is a person introducing
 * themselves, so that prompt forbids inventing facts — a model that helpfully
 * adds "I have excellent references" has put a claim in somebody's mouth that
 * they will have to answer for at the viewing.
 */

const GOOGLE_AI_API_KEY = defineSecret('GOOGLE_AI_API_KEY');

/**
 * Free-tier model, and a constant because it is the thing most likely to need
 * changing. Google retires model ids on its own schedule and this has already
 * happened once: gemini-2.0-flash returned a 404 saying it was no longer
 * available, within days of being written.
 *
 * When that happens again the symptom is "The writing assistant is unavailable"
 * on the phone and a 404 in the logs naming the dead id. The fix is this line.
 */
const MODEL = 'gemini-3.7-flash';

/**
 * Caps, chosen to fail politely rather than expensively.
 *
 * The free tier is rate-limited by requests and tokens both, so an unbounded
 * input is a way for one person to exhaust the day's quota for everybody.
 */
const MAX_INPUT = 4000;
const MIN_INPUT = 20;

const PROMPTS = {
  owner:
    "You are an expert real estate copywriter. Transform the user's raw, messy, or bulleted property notes into a highly professional, engaging, and clear rental listing description. Avoid cheap marketing cliches, exclamation point spam, and buzzwords like 'STUNNING' or 'MUST SEE'. Focus on structural clarity, highlight key amenities organically, use clear paragraph breaks, and keep the total output under 200 words.",
  tenant:
    "You are a professional communication coach. Rewrite the tenant's raw introductory message into a polite, respectful, and highly professional rental application inquiry to a landlord. Ensure the tone expresses high responsibility, reliability, and clear interest in the property. Fix all grammatical flaws, maintain an approachable but formal tone, and keep the output concise and under 150 words. Do not fabricate facts; only use details provided by the user.",
};

/** The roles this will act on. Anything else is refused before a request is made. */
const ROLES = Object.keys(PROMPTS);

/**
 * Refines a piece of text according to who wrote it.
 *
 * Every rejection happens before the provider is called. A malformed request
 * that still costs a quota unit is a malformed request somebody can use to
 * exhaust the free tier without ever getting a reply.
 */
exports.refineText = onCall(
  { region: 'europe-west1', secrets: [GOOGLE_AI_API_KEY] },
  async request => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign in first.');
    }

    const { rawText, role } = request.data ?? {};

    if (!ROLES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `role must be one of: ${ROLES.join(', ')}.`,
      );
    }

    if (typeof rawText !== 'string') {
      throw new HttpsError('invalid-argument', 'rawText must be text.');
    }

    const text = rawText.trim();

    if (text.length < MIN_INPUT) {
      throw new HttpsError(
        'invalid-argument',
        `Write a little more first — at least ${MIN_INPUT} characters.`,
      );
    }

    if (text.length > MAX_INPUT) {
      throw new HttpsError(
        'invalid-argument',
        `That is too long to refine. Keep it under ${MAX_INPUT} characters.`,
      );
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // In the header rather than the query string: a key in a URL ends
            // up in logs, proxies and error reports.
            'x-goog-api-key': GOOGLE_AI_API_KEY.value(),
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPTS[role] }] },
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              // Low, because this is a rewrite rather than an invention. A
              // warmer setting is where a model starts adding amenities the
              // property does not have.
              temperature: 0.4,
              maxOutputTokens: 600,
            },
          }),
        },
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        logger.error('Google AI rejected the request', {
          status: response.status,
          detail: detail.slice(0, 500),
        });

        // The free tier's most common failure by far, and worth naming: the
        // caller can simply wait, and telling them so is better than a generic
        // failure they will retry immediately and make worse.
        if (response.status === 429) {
          throw new HttpsError(
            'resource-exhausted',
            'The writing assistant is busy. Try again in a minute.',
          );
        }

        throw new HttpsError('internal', 'The writing assistant is unavailable.');
      }

      const body = await response.json();
      const refined = body?.candidates?.[0]?.content?.parts
        ?.map(p => p.text ?? '')
        .join('')
        .trim();

      // A response with no usable text is a failure even though the call
      // succeeded — a safety block returns 200 with no candidate. Returning an
      // empty string here would wipe what the user wrote.
      if (!refined) {
        logger.warn('Google AI returned no text', {
          reason: body?.candidates?.[0]?.finishReason,
        });
        throw new HttpsError(
          'internal',
          'Nothing came back. Your original text has not been changed.',
        );
      }

      return { text: refined };
    } catch (e) {
      // Re-thrown untouched so the specific messages above survive; anything
      // else is something the caller cannot act on, so it is logged here and
      // reported plainly.
      if (e instanceof HttpsError) throw e;
      logger.error('Refine failed', e);
      throw new HttpsError('internal', 'The writing assistant is unavailable.');
    }
  },
);
