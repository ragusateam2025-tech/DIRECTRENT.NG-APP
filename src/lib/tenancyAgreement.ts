import { formatNaira } from './format';
import { formatNigerianPhone } from './phone';
import { ALTERATION_LABELS, PET_LABELS, SMOKING_LABELS } from '../data/rules';
import type { Listing } from '../types';

/**
 * A tenancy agreement, assembled from what the platform already knows.
 *
 * **This is a draft, not legal advice, and it says so on its own first page.**
 * The clauses below are an ordinary Nigerian residential tenancy in plain
 * English; they have not been settled by a lawyer, and the wording should be
 * reviewed by one before anybody signs. Generating a document that *looks*
 * authoritative is the easy half — saying plainly that it is a starting point
 * is what stops it being used as though it were more than that.
 *
 * What this genuinely removes is the retyping. Both parties, the property, the
 * rent, the deposit, the term and the house rules are already recorded, agreed
 * and visible to both sides. Copying them into a Word template by hand is where
 * the errors and the delay come from.
 *
 * Everything the platform does not know is left as a ruled blank rather than
 * guessed: addresses of the parties, witnesses, and the signatures themselves.
 * A blank is honest and gets filled in; an invented value gets signed.
 */

export interface AgreementParty {
  name: string;
  email: string;
  phone?: string | null;
}

export interface AgreementInput {
  listing: Listing;
  landlord: AgreementParty;
  tenant: AgreementParty;
  /** ISO date the tenancy begins. */
  startDate: string;
  /** Term in months, from the accepted enquiry. */
  months: number;
  /** Generated-on date; passed rather than read so the output is testable. */
  generatedAt: Date;
}

/**
 * Escapes text before it goes into the document.
 *
 * Every name, address and house rule here was typed by a user. Unescaped, a
 * stray `<` silently swallows the rest of a clause — and this is a document
 * somebody signs, so a clause that quietly vanished is a worse outcome than a
 * broken layout.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 14 August 2026 — the form used on Nigerian documents. */
export function formatLongDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '__________________';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** The last day of a term that begins on `start` and runs `months`. */
export function endDate(start: Date, months: number): Date {
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  // A twelve-month term from 1 January ends on 31 December, not 1 January.
  end.setDate(end.getDate() - 1);
  return end;
}

/** What the tenant pays, itemised the way the listing already shows it. */
export function agreementMoney(listing: Listing) {
  const rent = listing.pricing.annualRent;
  const months = listing.pricing.cautionDepositMonths ?? 0;
  return {
    rent,
    caution: Math.round((rent * months) / 12),
    cautionMonths: months,
    serviceCharge: listing.pricing.serviceCharge ?? 0,
  };
}

function ruleLines(listing: Listing): string[] {
  const rules = listing.rules;
  if (!rules) return [];

  const lines = [
    PET_LABELS[rules.pets],
    SMOKING_LABELS[rules.smoking],
    ALTERATION_LABELS[rules.alterations],
  ];
  if (rules.houseRules) lines.push(rules.houseRules);
  return lines;
}

function party(label: string, p: AgreementParty): string {
  const phone = p.phone ? formatNigerianPhone(p.phone) : '__________________';
  return `
    <p class="party"><strong>${escapeHtml(label)}</strong><br />
    ${escapeHtml(p.name)}<br />
    ${escapeHtml(p.email)}<br />
    ${escapeHtml(phone)}<br />
    Address: <span class="blank"></span></p>`;
}

/**
 * Builds the agreement as printable HTML.
 *
 * HTML rather than a PDF library because expo-print renders HTML to a real PDF,
 * which keeps the whole document reviewable as text — and a clause somebody can
 * read in a diff is a clause a lawyer can be asked about.
 */
export function tenancyAgreementHtml(input: AgreementInput): string {
  const { listing, landlord, tenant, months, generatedAt } = input;
  const start = new Date(input.startDate);
  const money = agreementMoney(listing);
  const rules = ruleLines(listing);

  const clause = (n: number, heading: string, body: string) => `
    <h2>${n}. ${escapeHtml(heading)}</h2>
    <p>${body}</p>`;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #111; margin: 48px; }
  h1 { font-size: 18pt; text-align: center; letter-spacing: 1px; margin-bottom: 4px; }
  .sub { text-align: center; color: #555; font-size: 10pt; margin-top: 0; }
  h2 { font-size: 12pt; margin-top: 22px; margin-bottom: 4px; }
  .notice { border: 1px solid #999; padding: 12px 14px; font-size: 10pt; background: #f6f6f6; margin: 18px 0 24px; }
  .party { margin: 10px 0 16px; }
  .blank { display: inline-block; border-bottom: 1px solid #333; min-width: 260px; }
  ul { margin: 4px 0 0 18px; }
  .sign { margin-top: 34px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; }
  .line { border-bottom: 1px solid #333; height: 42px; margin-bottom: 4px; }
  .foot { margin-top: 30px; font-size: 9pt; color: #666; text-align: center; }
</style></head><body>

<h1>TENANCY AGREEMENT</h1>
<p class="sub">Prepared through Directrent.ng on ${escapeHtml(formatLongDate(generatedAt))}</p>

<div class="notice">
  <strong>This is a draft for both parties to review.</strong> It has been filled
  in from the details agreed on Directrent.ng. It is not legal advice, and it has
  not been settled by a lawyer. Have it checked before you sign it, and fill in
  every blank line by hand.
</div>

<p>This agreement is made on the <span class="blank"></span> day of
<span class="blank"></span> between:</p>

${party('THE LANDLORD', landlord)}
${party('THE TENANT', tenant)}

${clause(1, 'The property', `
  The Landlord agrees to let, and the Tenant agrees to take, the property at
  <strong>${escapeHtml(listing.location.address)}, ${escapeHtml(listing.location.area)}</strong>
  ${listing.location.state ? `, ${escapeHtml(listing.location.state)} State` : ''} —
  a ${escapeHtml(String(listing.basicInfo.bedrooms))} bedroom property with
  ${escapeHtml(String(listing.basicInfo.bathrooms))} bathroom(s).`)}

${clause(2, 'Term', `
  The tenancy runs for <strong>${escapeHtml(String(months))} months</strong>,
  beginning on <strong>${escapeHtml(formatLongDate(start))}</strong> and ending on
  <strong>${escapeHtml(formatLongDate(endDate(start, months)))}</strong>, unless
  renewed in writing by both parties.`)}

${clause(3, 'Rent', `
  The rent is <strong>${escapeHtml(formatNaira(money.rent))}</strong> per year,
  payable in advance. The Landlord shall issue a receipt for every payment
  received.`)}

${clause(4, 'Caution deposit', money.caution > 0 ? `
  The Tenant shall pay a refundable caution deposit of
  <strong>${escapeHtml(formatNaira(money.caution))}</strong>
  (${escapeHtml(String(money.cautionMonths))} months). It is returned at the end
  of the tenancy less the cost of any damage beyond fair wear and tear, itemised
  in writing.` : 'No caution deposit is payable under this agreement.')}

${clause(5, 'Service charge', money.serviceCharge > 0 ? `
  A service charge of <strong>${escapeHtml(formatNaira(money.serviceCharge))}</strong>
  per year is payable, covering the shared services provided at the property.` :
  'No service charge is payable under this agreement.')}

${clause(6, 'The Tenant agrees', `</p>
  <ul>
    <li>To pay the rent when it falls due.</li>
    <li>To keep the interior of the property in good and tenantable repair, fair wear and tear excepted.</li>
    <li>Not to make structural alterations without the Landlord's written consent. This includes cutting walls for air conditioning, mounting equipment on the roof, and lifting or replacing floor tiles.</li>
    <li>Not to sublet or assign the property, in whole or in part, without the Landlord's written consent.</li>
    <li>To permit the Landlord to inspect the property at reasonable times, with reasonable notice.</li>
    <li>To use the property as a private residence only.</li>
  </ul><p>`)}

${clause(7, 'The Landlord agrees', `</p>
  <ul>
    <li>To allow the Tenant quiet enjoyment of the property throughout the tenancy.</li>
    <li>To keep the structure, roof and exterior in repair.</li>
    <li>To give reasonable notice before entering the property.</li>
    <li>To refund the caution deposit as set out above.</li>
  </ul><p>`)}

${rules.length ? `
  <h2>8. House rules</h2>
  <p>The following were stated on the listing and form part of this agreement:</p>
  <ul>${rules.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}

<h2>${rules.length ? 9 : 8}. Notice and termination</h2>
<p>Either party may end this tenancy by giving written notice as required by the
tenancy law of ${escapeHtml(listing.location.state ?? 'the')} State. Neither
party may end it earlier without the other's written agreement.</p>

<h2>${rules.length ? 10 : 9}. Governing law</h2>
<p>This agreement is governed by the laws of the Federal Republic of Nigeria and
the tenancy law of ${escapeHtml(listing.location.state ?? 'the relevant')} State.</p>

<div class="sign">
  <div><div class="line"></div>Landlord — ${escapeHtml(landlord.name)}<br />Date:</div>
  <div><div class="line"></div>Tenant — ${escapeHtml(tenant.name)}<br />Date:</div>
</div>
<div class="sign">
  <div><div class="line"></div>Witness (name, address)</div>
  <div><div class="line"></div>Witness (name, address)</div>
</div>

<p class="foot">Generated by Directrent.ng — rented directly, without agent fees.
This document is a draft and must be reviewed before signing.</p>

</body></html>`;
}

/** A filename somebody can find again in their downloads. */
export function agreementFilename(listing: Listing, tenantName: string): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `Tenancy-${safe(listing.location.area)}-${safe(tenantName)}.pdf`;
}
