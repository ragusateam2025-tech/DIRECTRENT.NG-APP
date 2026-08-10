import {
  DISPOSABLE_DOMAINS,
  emailDomain,
  emailProblem,
  isDisposableEmail,
  isValidEmailFormat,
  normaliseEmail,
} from '../src/lib/email';

describe('normaliseEmail', () => {
  it('trims and lowercases', () => {
    expect(normaliseEmail('  Tunde@Example.COM ')).toBe('tunde@example.com');
  });
});

describe('isValidEmailFormat', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmailFormat('tunde@example.com')).toBe(true);
    expect(isValidEmailFormat('t.onyedikachukwu+rent@mail.co.uk')).toBe(true);
  });

  it('rejects a missing domain part', () => {
    // The commonest real typo: a domain with no dot.
    expect(isValidEmailFormat('tunde@gmial')).toBe(false);
  });

  it('rejects a missing @', () => {
    expect(isValidEmailFormat('tunde.example.com')).toBe(false);
  });

  it('rejects whitespace inside', () => {
    expect(isValidEmailFormat('tun de@example.com')).toBe(false);
  });

  it('rejects an empty local part', () => {
    expect(isValidEmailFormat('@example.com')).toBe(false);
  });

  it('rejects a trailing dot', () => {
    expect(isValidEmailFormat('tunde@example.')).toBe(false);
  });

  it('rejects an address longer than the spec allows', () => {
    expect(isValidEmailFormat(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});

describe('emailDomain', () => {
  it('returns everything after the last @', () => {
    expect(emailDomain('tunde@example.com')).toBe('example.com');
  });

  it('returns empty when there is no @', () => {
    expect(emailDomain('nonsense')).toBe('');
  });
});

describe('isDisposableEmail', () => {
  it('catches a known throwaway provider', () => {
    expect(isDisposableEmail('someone@mailinator.com')).toBe(true);
    expect(isDisposableEmail('someone@yopmail.com')).toBe(true);
  });

  it('catches a subdomain of one', () => {
    // A subdomain is the same provider wearing a hat.
    expect(isDisposableEmail('someone@inbox.mailinator.com')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isDisposableEmail('Someone@MAILINATOR.com')).toBe(true);
  });

  it('leaves ordinary providers alone', () => {
    expect(isDisposableEmail('tunde@gmail.com')).toBe(false);
    expect(isDisposableEmail('tunde@yahoo.com')).toBe(false);
    expect(isDisposableEmail('tunde@directrent.ng')).toBe(false);
  });

  it('does not match a domain that merely ends with a listed one', () => {
    // "notmailinator.com" is a different company, not a subdomain.
    expect(isDisposableEmail('someone@notmailinator.com')).toBe(false);
  });

  it('has no duplicate entries in the list', () => {
    expect(new Set(DISPOSABLE_DOMAINS).size).toBe(DISPOSABLE_DOMAINS.length);
  });

  it('lists only bare domains, so subdomain matching works', () => {
    for (const domain of DISPOSABLE_DOMAINS) {
      expect(domain).toBe(domain.trim().toLowerCase());
      expect(domain.startsWith('@')).toBe(false);
    }
  });
});

describe('emailProblem', () => {
  it('passes a good address', () => {
    expect(emailProblem('tunde@gmail.com')).toBeNull();
  });

  it('asks for an address when empty', () => {
    expect(emailProblem('   ')).toBe('Enter your email address.');
  });

  it('reports a malformed address', () => {
    expect(emailProblem('tunde@gmial')).toBe('That does not look like an email address.');
  });

  it('explains why a temporary address is refused', () => {
    const message = emailProblem('someone@mailinator.com');
    expect(message).toContain('Temporary email addresses are not accepted');
    // The reason matters: people accept a rule they understand.
    expect(message).toContain('confirmation link');
  });

  it('reports shape before disposability', () => {
    // A malformed throwaway address should be told it is malformed — that is
    // the problem the person can actually fix by retyping.
    expect(emailProblem('broken@mailinator')).toBe('That does not look like an email address.');
  });
});
