/**
 * Fingerspell utility — resolves individual letters to sign-language hand-sign images.
 * Images expected at /signs/letters/{a..z}.png
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export interface LetterSign {
  letter: string;
  src: string;
  exists: boolean;
}

/**
 * Returns the image path for a single letter.
 * Non-alpha characters return null.
 */
export function signImageForLetter(char: string): string | null {
  const lower = char.toLowerCase();
  if (lower.length !== 1 || !ALPHABET.includes(lower)) return null;
  return `/signs/letters/${lower}.png`;
}

/**
 * Converts a word or phrase into an array of LetterSign objects.
 * Spaces are preserved as a separator indicator (exists = false, src = '').
 */
export function fingerspellWord(word: string): LetterSign[] {
  return word.split('').map((ch) => {
    const src = signImageForLetter(ch);
    return {
      letter: ch,
      src: src ?? '',
      exists: src !== null,
    };
  });
}

/**
 * Check if a character is a valid fingerspellable letter.
 */
export function isAlphaChar(char: string): boolean {
  return char.length === 1 && ALPHABET.includes(char.toLowerCase());
}
