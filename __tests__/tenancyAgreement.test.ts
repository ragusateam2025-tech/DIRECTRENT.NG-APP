import {
  agreementFilename,
  agreementMoney,
  endDate,
  escapeHtml,
  formatLongDate,
  tenancyAgreementHtml,
  type AgreementInput,
} from '../src/lib/tenancyAgreement';
import type { Listing } from '../src/types';

function listing(overrides: Record<string, unknown> = {}): Listing {
  return {
    id: 'l1',
    ownerId: 'owner',
    basicInfo: { title: 'Two bedroom flat', bedrooms: 2, bathrooms: 2 },
    location: { address: '27 Herbert Macaulay Way', area: 'Yaba', state: 'Lagos' },
    pricing: { annualRent: 2_500_000, cautionDepositMonths: 12, serviceCharge: 150_000 },
    details: { description: 'x', amenities: [], maxOccupants: 3 },
    rules: { pets: 'no_pets', smoking: 'no_smoking', alterations: 'ask_first' },
    ...overrides,
  } as unknown as Listing;
}

function input(overrides: Partial<AgreementInput> = {}): AgreementInput {
  return {
    listing: listing(),
    landlord: { name: 'Ade Bello', email: 'ade@example.com', phone: '+2348012345678' },
    tenant: { name: 'Chidi Okafor', email: 'chidi@example.com' },
    startDate: '2026-09-01T00:00:00',
    months: 12,
    generatedAt: new Date('2026-08-15T09:00:00'),
    ...overrides,
  };
}

describe('escaping what users typed', () => {
  /**
   * This is a document somebody signs. An unescaped `<` does not merely break
   * the layout — it swallows the rest of the clause, and a clause that quietly
   * vanished from a signed agreement is the worst failure this file has.
   */
  it('neutralises angle brackets and quotes', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('escapes an ampersand before anything else, so entities are not doubled', () => {
    expect(escapeHtml('Ade & Sons <Ltd>')).toBe('Ade &amp; Sons &lt;Ltd&gt;');
  });

  it('keeps a name with markup out of the rendered document', () => {
    const html = tenancyAgreementHtml(
      input({ tenant: { name: '<b>Chidi</b>', email: 'c@example.com' } }),
    );

    expect(html).not.toContain('<b>Chidi</b>');
    expect(html).toContain('&lt;b&gt;Chidi&lt;/b&gt;');
  });
});

describe('the term', () => {
  it('ends the day before the anniversary', () => {
    // A twelve-month term from 1 September ends on 31 August, not 1 September.
    // Off by one here is a day of somebody's tenancy.
    const end = endDate(new Date('2026-09-01T00:00:00'), 12);

    expect(formatLongDate(end)).toBe('31 August 2027');
  });

  it('handles a six month term across a year boundary', () => {
    const end = endDate(new Date('2026-11-01T00:00:00'), 6);

    expect(formatLongDate(end)).toBe('30 April 2027');
  });

  it('renders an unparseable date as a blank rather than "Invalid Date"', () => {
    expect(formatLongDate(new Date('nonsense'))).toBe('__________________');
  });
});

describe('the money', () => {
  it('derives the caution deposit from the months on the listing', () => {
    expect(agreementMoney(listing()).caution).toBe(2_500_000);
  });

  it('scales a part-year deposit', () => {
    const six = listing({
      pricing: { annualRent: 2_400_000, cautionDepositMonths: 6, serviceCharge: 0 },
    });

    expect(agreementMoney(six).caution).toBe(1_200_000);
  });

  it('says plainly when nothing is payable rather than printing ₦0', () => {
    const html = tenancyAgreementHtml({
      ...input(),
      listing: listing({
        pricing: { annualRent: 2_500_000, cautionDepositMonths: 0, serviceCharge: 0 },
      }),
    });

    expect(html).toContain('No caution deposit is payable');
    expect(html).toContain('No service charge is payable');
  });

  it('uses the literal naira sign', () => {
    // Never an escape sequence. It renders wrongly on some devices, and this
    // document gets printed.
    expect(tenancyAgreementHtml(input())).toContain('₦2,500,000');
  });
});

describe('the document itself', () => {
  it('says on its face that it is a draft', () => {
    // The whole safety story. A generated document that looks authoritative and
    // does not say what it is will be signed as though a lawyer wrote it.
    const html = tenancyAgreementHtml(input());

    expect(html).toContain('This is a draft for both parties to review');
    expect(html).toContain('not legal advice');
  });

  it('carries both parties and the property', () => {
    const html = tenancyAgreementHtml(input());

    expect(html).toContain('Ade Bello');
    expect(html).toContain('Chidi Okafor');
    expect(html).toContain('27 Herbert Macaulay Way');
  });

  it('leaves a blank where a phone number is missing rather than inventing one', () => {
    const html = tenancyAgreementHtml(input());

    // The tenant has no phone on file; the landlord does.
    expect(html).toContain('+234 801 234 5678');
    expect(html).toContain('__________________');
  });

  it('includes the house rules as clauses when the listing has them', () => {
    const html = tenancyAgreementHtml(input());

    expect(html).toContain('House rules');
    expect(html).toContain('No pets');
    expect(html).toContain('Ask the owner before altering anything');
  });

  it('renumbers the closing clauses when there are no house rules', () => {
    // The house rules section is conditional, so the two clauses after it move.
    // Two clause 8s in a signed document is the kind of error people notice.
    const html = tenancyAgreementHtml({
      ...input(),
      listing: listing({ rules: undefined }),
    });

    expect(html).not.toContain('House rules');
    expect(html).toContain('8. Notice and termination');
    expect(html).toContain('9. Governing law');
  });

  it('numbers around the house rules when they are present', () => {
    const html = tenancyAgreementHtml(input());

    expect(html).toContain('8. House rules');
    expect(html).toContain('9. Notice and termination');
    expect(html).toContain('10. Governing law');
  });

  it('names the alterations rule in the tenant covenants', () => {
    // The rule the owner asked for, written into the agreement rather than
    // left on the listing where nobody signs it.
    expect(tenancyAgreementHtml(input())).toContain('cutting walls for air conditioning');
  });
});

describe('the filename', () => {
  it('is something a person can find again', () => {
    expect(agreementFilename(listing(), 'Chidi Okafor')).toBe('Tenancy-Yaba-Chidi-Okafor.pdf');
  });

  it('strips punctuation that a filesystem would refuse', () => {
    expect(agreementFilename(listing(), 'O’Brien / Sons')).toBe(
      'Tenancy-Yaba-O-Brien-Sons.pdf',
    );
  });
});
