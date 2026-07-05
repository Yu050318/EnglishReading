import { describe, expect, it } from 'vitest';
import { fingerprintQuestion, normalizeText } from './fingerprint';

describe('fingerprints', () => {
  it('normalizes case and whitespace', () => expect(normalizeText('  Hello,  WORLD! ')).toBe('hello world'));
  it('is stable for equivalent text', () => {
    const a = fingerprintQuestion('What IS news?', [{ key: 'A', text: 'A report' }]);
    const b = fingerprintQuestion(' what is NEWS? ', [{ key: 'A', text: 'a  report' }]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
