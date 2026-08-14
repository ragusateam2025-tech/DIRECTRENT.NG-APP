/**
 * Tidying what people type, without pretending to understand it.
 *
 * What this does and does not do is worth stating plainly, because "autocorrect"
 * suggests more than any offline function can deliver. It fixes **case and
 * spacing** — SHOUTING, all-lowercase, doubled spaces, a full stop with no space
 * after it, five exclamation marks. It does not fix grammar, spelling or word
 * choice: real grammar correction needs a language model behind a paid API, and
 * a half-clever local guess would quietly rewrite people's meaning.
 *
 * The rule throughout is that it only ever changes case and whitespace. It
 * never removes a word, never substitutes one, and never touches a string it
 * cannot improve. Somebody's listing is their own words, and an editor that
 * silently rephrases them is worse than one that leaves a stray capital alone.
 */

/**
 * Words that keep their capitals, whatever the surrounding case.
 *
 * Almost all Nigerian, because that is what the naive rules get wrong. Sentence
 * case would render WAEC as "Waec" and VI as "Vi", and an address is exactly
 * where a renter notices.
 */
const ACRONYMS = new Set([
  'BQ',
  'CCTV',
  'GRA',
  'LGA',
  'LASU',
  'NEPA',
  'PHCN',
  'UNILAG',
  'VI',
  'WAEC',
  'LUTH',
  'UBA',
  'GTB',
  'NNPC',
  'FCT',
  'FESTAC',
  'IKDC',
  'PLC',
  'LTD',
  'TV',
  'AC',
  'DSTV',
  'GOTV',
  'ATM',
  'POS',
  'NYSC',
  'UI',
  'OAU',
  'ABU',
  'UNN',
  '2BR',
  '3BR',
]);

/** Small words that stay lowercase inside a title, unless they open it. */
const MINOR = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

/**
 * Collapses runaway whitespace and punctuation.
 *
 * Applied before anything else, because the case rules need to know where a
 * sentence ends and "Nice flat.Very clean" hides that boundary.
 */
export function tidySpacing(input: string): string {
  return (
    input
      .replace(/\s+/g, ' ')
      // Three or more of the same terminator become one. Two exclamation marks
      // are enthusiasm; six are noise.
      .replace(/([!?.,])\1{1,}/g, '$1')
      // No space before punctuation, exactly one after — but not inside a
      // number, or ₦1,500,000 would become ₦1, 500, 000.
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/([,.!?;:])(?=[^\s\d])/g, '$1 ')
      .trim()
  );
}

/** True when a word is an acronym we keep as-is. */
function acronym(word: string): string | null {
  const bare = word.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return ACRONYMS.has(bare) ? word.replace(/[A-Za-z0-9]+/, bare) : null;
}

/**
 * Whether a string is written in one case throughout.
 *
 * The test that decides whether to intervene at all. "A room self-contained In
 * Yaba" is mixed and a bit untidy, but the capitals in it are somebody's
 * choices, and overriding them is how an editor starts fighting its user.
 * SHOUTING and all-lowercase are different: nobody means those.
 */
function isUniformCase(input: string): boolean {
  const letters = input.replace(/[^A-Za-z]/g, '');
  if (letters.length < 2) return false;
  return letters === letters.toUpperCase() || letters === letters.toLowerCase();
}

/**
 * Sentence case, for prose — descriptions, house rules, decline reasons.
 *
 * Only rewrites when the text is uniformly one case. Mixed-case writing is left
 * alone apart from spacing, on the principle that a person who typed both cases
 * meant both.
 */
export function toSentenceCase(input: string): string {
  const tidied = tidySpacing(input);
  if (!tidied || !isUniformCase(tidied)) return tidied;

  const lowered = tidied.toLowerCase();
  // Capitalise the first letter of the string and of anything following a
  // terminator. "I" is handled with the acronyms because it behaves the same.
  const cased = lowered.replace(
    /(^\s*[a-z])|([.!?]\s+[a-z])/g,
    match => match.toUpperCase(),
  );

  return cased
    .split(' ')
    .map(word => acronym(word) ?? (word === 'i' ? 'I' : word))
    .join(' ');
}

/**
 * Beyond this many words, a message in full capitals is carelessness rather
 * than emphasis. Below it, "OK!" and "NO" are things people mean.
 */
const SHOUT_ALLOWANCE = 3;

/**
 * Tidying a chat message, which needs a lighter hand than a listing.
 *
 * A listing is an advert and its text is a public claim; a message is a person
 * speaking, and rewriting what somebody just said is a good deal more intrusive
 * than fixing a headline. So this does less: it tidies spacing and capitalises
 * where sentences begin, and it leaves a short shout alone.
 *
 * That last part is the whole difference. In an advert, capitals are somebody
 * not knowing better. In conversation, "NO" and "OK!" are emphasis, and folding
 * them to "No" and "Ok!" takes the meaning out. Past a few words it stops being
 * emphasis and starts being a stuck caps lock, and then it is worth fixing.
 */
export function tidyMessage(input: string): string {
  const tidied = tidySpacing(input);
  if (!tidied) return tidied;

  const letters = tidied.replace(/[^A-Za-z]/g, '');
  const shouting = letters.length > 1 && letters === letters.toUpperCase();
  const brief = tidied.split(' ').length <= SHOUT_ALLOWANCE;

  if (shouting && brief) return tidied;
  if (shouting) return toSentenceCase(tidied);

  // Mixed case, so the writer's capitals stay exactly as typed. All that is
  // added is a capital where the message begins, which nobody has ever meant to
  // leave off.
  return tidied.replace(/^\s*[a-z]/, c => c.toUpperCase());
}

/**
 * Title case, for names of things — listing titles, streets, areas, landmarks.
 *
 * Applied whatever the input case, because a title is a label rather than
 * somebody's prose, and "14, WAEC STREET, YABA" is worth fixing even though the
 * owner typed it deliberately. Minor words stay down unless they open the title
 * or follow a comma, which is where a new phrase starts.
 */
export function toTitleCase(input: string): string {
  const tidied = tidySpacing(input);
  if (!tidied) return tidied;

  let opensPhrase = true;

  return tidied
    .split(' ')
    .map(word => {
      const kept = acronym(word);
      const bare = word.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      const starts = opensPhrase;
      // A comma ends the phrase, so the next word opens a new one.
      opensPhrase = /[,:—-]$/.test(word);

      if (kept) return kept;
      if (!starts && MINOR.has(bare)) return word.toLowerCase();

      // A word in full capitals is shouting and gets folded down. Anything else
      // keeps the capitals it has, so a deliberate internal one survives —
      // OBrien stays OBrien rather than becoming OBRien, which is what
      // capitalising "the first lowercase letter" would do to it.
      const letters = word.replace(/[^A-Za-z]/g, '');
      const shouting = letters.length > 0 && letters === letters.toUpperCase();
      const base = shouting ? word.toLowerCase() : word;

      // Targets the first letter, not the first character, so "14," and "2," go
      // through untouched.
      return base.replace(/[a-zA-Z]/, c => c.toUpperCase());
    })
    .join(' ');
}
