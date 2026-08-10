/**
 * Email checks for signup.
 *
 * Two different jobs, deliberately kept apart:
 *
 *   - **Shape.** Catches typos. `tunde@gmial` is a mistake somebody made and
 *     wants told about.
 *   - **Disposable.** Catches the throwaway inbox that works for ten minutes.
 *
 * Neither proves an address is real. `asdfgh@gmail.com` passes both and belongs
 * to nobody. Only sending mail to it and having someone click the link proves
 * anything, which is why verification exists alongside this — see
 * `sendVerificationEmail` in AuthContext. These two are the cheap filter in
 * front of it, not a replacement for it.
 */

/**
 * Deliberately not RFC 5322.
 *
 * The full grammar admits addresses no Nigerian renter will ever type and is
 * famously about 6,000 characters of regex. This asks the four questions worth
 * asking — something, an @, something, a dot and a plausible ending — and lets
 * verification settle the rest.
 */
const SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * Throwaway inbox providers.
 *
 * Not exhaustive and cannot be — new ones appear constantly and this list will
 * always trail them. It is a speed bump, not a wall: it stops the person
 * reaching for the first temporary address they know, which is most of them.
 *
 * Kept as bare domains and matched against the domain and its parents, so
 * `foo.mailinator.com` is caught by the `mailinator.com` entry.
 */
export const DISPOSABLE_DOMAINS: string[] = [
  '10minutemail.com',
  '10minutemail.net',
  'anonbox.net',
  'burnermail.io',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'inboxbear.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'moakt.com',
  'sharklasers.com',
  'spam4.me',
  'spamgourmet.com',
  'tempmail.com',
  'tempmail.net',
  'temp-mail.org',
  'tempinbox.com',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.net',
];

const DISPOSABLE = new Set(DISPOSABLE_DOMAINS);

/** Lowercased and trimmed. Addresses are case-insensitive in the part that matters. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmailFormat(raw: string): boolean {
  const email = normaliseEmail(raw);
  // A local part longer than this is a paste accident, not an address.
  if (email.length > 254) return false;
  return SHAPE.test(email);
}

/** The domain, or empty string when there isn't one. */
export function emailDomain(raw: string): string {
  const email = normaliseEmail(raw);
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1);
}

/**
 * Whether the address belongs to a known throwaway provider.
 *
 * Checks the domain and each parent, so a subdomain cannot walk around the
 * list: `inbox.mailinator.com` is `mailinator.com` wearing a hat.
 */
export function isDisposableEmail(raw: string): boolean {
  const domain = emailDomain(raw);
  if (!domain) return false;

  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (DISPOSABLE.has(parts.slice(i).join('.'))) return true;
  }

  return false;
}

/**
 * The one thing a screen needs to call.
 *
 * Returns the message to show, or null when the address is acceptable. Written
 * as sentences a person can act on rather than validation codes — "invalid
 * email" tells somebody nothing about what to do next.
 */
export function emailProblem(raw: string): string | null {
  const email = normaliseEmail(raw);

  if (email.length === 0) return 'Enter your email address.';
  if (!isValidEmailFormat(email)) return 'That does not look like an email address.';
  if (isDisposableEmail(email)) {
    return 'Temporary email addresses are not accepted. Use an address you can open, because we send a confirmation link to it.';
  }

  return null;
}
