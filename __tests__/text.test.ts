import { tidyMessage, tidySpacing, toSentenceCase, toTitleCase } from '../src/lib/text';

describe('tidying spacing', () => {
  it('collapses runs of spaces and trims', () => {
    expect(tidySpacing('  Two   bedroom   flat  ')).toBe('Two bedroom flat');
  });

  it('puts one space after punctuation and none before', () => {
    expect(tidySpacing('Nice flat.Very clean , quiet street')).toBe(
      'Nice flat. Very clean, quiet street',
    );
  });

  it('calms repeated punctuation without removing it', () => {
    expect(tidySpacing('Available now!!!! Call me???')).toBe('Available now! Call me?');
  });

  it('leaves a naira figure alone', () => {
    // The obvious way to write the punctuation rule breaks every price in the
    // app: ₦1,500,000 becomes ₦1, 500, 000.
    expect(tidySpacing('Rent is ₦1,500,000 per year')).toBe('Rent is ₦1,500,000 per year');
  });
});

describe('sentence case, for prose', () => {
  it('rescues shouting', () => {
    expect(toSentenceCase('VERY CLEAN FLAT. NEWLY PAINTED.')).toBe(
      'Very clean flat. Newly painted.',
    );
  });

  it('rescues all-lowercase', () => {
    expect(toSentenceCase('very clean flat. newly painted.')).toBe(
      'Very clean flat. Newly painted.',
    );
  });

  it('keeps Nigerian acronyms intact through the rewrite', () => {
    // Naive sentence case turns WAEC into Waec, which is exactly where a reader
    // notices that a machine has been at the text.
    expect(toSentenceCase('CLOSE TO WAEC AND UNILAG')).toBe('Close to WAEC and UNILAG');
  });

  it('leaves mixed-case writing alone apart from spacing', () => {
    // Someone who typed both cases meant both. Overriding that is where an
    // editor starts fighting its user.
    expect(toSentenceCase('A room self-contained In Yaba')).toBe(
      'A room self-contained In Yaba',
    );
  });

  it('never drops or changes a word', () => {
    const input = 'SPACIOUS TWO BEDROOM WITH BOREHOLE AND PREPAID METER';
    const words = (s: string) => s.toLowerCase().split(/\s+/);

    expect(words(toSentenceCase(input))).toEqual(words(input));
  });
});

describe('chat messages, which need a lighter hand', () => {
  it('capitalises where a message begins', () => {
    expect(tidyMessage('is the flat still available?')).toBe(
      'Is the flat still available?',
    );
  });

  it('leaves a short shout alone, because that is emphasis', () => {
    // In an advert, capitals are somebody not knowing better. In conversation
    // they are meaning, and "No" does not say what "NO" says.
    expect(tidyMessage('NO')).toBe('NO');
    expect(tidyMessage('OK!')).toBe('OK!');
  });

  it('fixes a stuck caps lock', () => {
    expect(tidyMessage('I AM STILL WAITING FOR YOUR REPLY ABOUT THE FLAT')).toBe(
      'I am still waiting for your reply about the flat',
    );
  });

  it('leaves the writer’s own capitals as typed', () => {
    // Deliberately gentler than the listing rules. Somebody's own words are not
    // ours to restyle past the first letter.
    expect(tidyMessage('i can pay in Naira or USD, whichever')).toBe(
      'I can pay in Naira or USD, whichever',
    );
  });

  it('does not lose a word', () => {
    const input = 'PLEASE  CALL   ME BEFORE  YOU COME';
    expect(tidyMessage(input).toLowerCase().split(' ')).toEqual(
      input.toLowerCase().split(/\s+/),
    );
  });
});

describe('title case, for names of things', () => {
  it('fixes a shouted address', () => {
    expect(toTitleCase('14, WAEC STREET, YABA')).toBe('14, WAEC Street, Yaba');
  });

  it('keeps minor words down inside a title', () => {
    expect(toTitleCase('a room self-contained in yaba')).toBe(
      'A Room Self-contained in Yaba',
    );
  });

  it('capitalises a minor word that opens the title', () => {
    expect(toTitleCase('the mews, lekki')).toBe('The Mews, Lekki');
  });

  it('capitalises after a comma, where a new phrase starts', () => {
    expect(toTitleCase('flat 2, the courtyard')).toBe('Flat 2, The Courtyard');
  });

  it('leaves a deliberate internal capital alone', () => {
    expect(toTitleCase("o'brien close, mccarthy street")).toBe(
      "O'brien Close, Mccarthy Street",
    );
    expect(toTitleCase('OBrien Close')).toBe('OBrien Close');
  });

  it('handles an empty string without inventing one', () => {
    expect(toTitleCase('')).toBe('');
    expect(toSentenceCase('   ')).toBe('');
  });
});
