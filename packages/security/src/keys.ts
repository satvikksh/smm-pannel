import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function block(length = 4): string {
  const bytes = randomBytes(length);
  let out = '';
  for (const b of bytes) {
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}

/**
 * Cryptographically random license keys in the format:
 *   SMM-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  return `SMM-${block()}-${block()}-${block()}-${block()}`;
}

export function generateReference(): string {
  return randomBytes(9).toString('hex').toUpperCase();
}