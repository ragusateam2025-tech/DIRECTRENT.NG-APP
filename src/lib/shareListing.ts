import { Share } from 'react-native';
import { formatNaira } from './format';
import { calculateSavings } from './savings';
import type { Listing } from '../types';

/**
 * The message a tenant sends when they share a property.
 *
 * Sharing is how Nigerian rental decisions actually get made: almost nobody
 * signs alone, and the person who decides is often not the person browsing. A
 * listing sent to a spouse, a parent or a friend is the cheapest distribution
 * this app has, so what gets pasted into WhatsApp matters as much as the screen
 * it came from.
 *
 * Built as a pure function so it can be tested. Everything in it is
 * brand-critical -- the literal naira sign, the savings framed as a floor
 * rather than a ceiling -- and those are exactly the things that rot silently.
 */
export function buildShareMessage(listing: Listing): string {
  const { savings } = calculateSavings(listing.pricing.annualRent);
  const { bedrooms, bathrooms, title } = listing.basicInfo;

  const facts = [
    listing.location.area,
    `${bedrooms} bed`,
    `${bathrooms} bath`,
  ].join(' · ');

  const lines = [
    title,
    facts,
    `${formatNaira(listing.pricing.annualRent)}/year`,
    '',
    // The whole argument in one sentence. Someone reading this has no idea what
    // Directrent is, so the message has to say why it is not just another
    // listing -- and "from" because 32% is the researched floor, not the
    // ceiling.
    //
    // Says what the listing is rather than what it is not. This gets forwarded
    // to people we have never met, sometimes by the very agents we would rather
    // work with, and a message that opens by naming an enemy travels worse than
    // one that opens with the offer.
    `Direct from the property owner on Directrent. Save from ${formatNaira(savings)} against the usual charges.`,
  ];

  // Owner-occupancy is a first-order question here and costs one line. Someone
  // forwarding a property to family is often asking exactly this.
  if (listing.ownerOccupied !== undefined) {
    lines.push(
      listing.ownerOccupied
        ? 'The owner lives on the property.'
        : 'The owner does not live on the property.',
    );
  }

  lines.push('', 'directrent.ng');

  return lines.join('\n');
}

/**
 * Opens the phone's share sheet with the listing.
 *
 * No link to the listing itself, deliberately. There is no per-property page on
 * the website and no deep link registered, so any URL here would either land
 * the reader on a homepage that does not mention this flat or, worse, do
 * nothing at all on a phone without the app. A message that reads correctly
 * everywhere beats a link that works in one place.
 *
 * Resolves to whether the sheet reported a share. Swallows nothing: a failure
 * to open the sheet is worth surfacing, because the user asked for it.
 */
export async function shareListing(listing: Listing): Promise<boolean> {
  const result = await Share.share({
    message: buildShareMessage(listing),
    title: listing.basicInfo.title,
  });

  return result.action === Share.sharedAction;
}
