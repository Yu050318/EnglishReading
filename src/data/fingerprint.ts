import { createHash } from 'node:crypto';

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function fingerprintQuestion(question: string, options: Array<{ key: string; text: string }>): string {
  const canonical = [normalizeText(question), ...options.map((option) => `${option.key}:${normalizeText(option.text)}`)].join('|');
  return createHash('sha256').update(canonical).digest('hex');
}
