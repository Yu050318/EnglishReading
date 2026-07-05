import { describe, expect, it } from 'vitest';
import { buildMemorizeQueue, clampMemorizeIndex } from './memorize';
import type { Question } from '../../data/questionSchema';

const question = (id: string, category: Question['category']): Question => ({
  id,
  category,
  question: id,
  source: ['test'],
  answer: ['A'],
  options: [{ key: 'A', text: 'correct' }, { key: 'B', text: 'wrong' }],
  type: 'single_choice',
  explanation: '',
  ocrConfidence: null,
  reviewStatus: 'verified',
  fingerprint: 'a'.repeat(64),
});

describe('memorize helpers', () => {
  it('filters the memorize queue by category', () => {
    const other = question('other', 'other');
    const news = question('news', 'news_english');
    expect(buildMemorizeQueue([other, news], 'news_english')).toEqual([news]);
    expect(buildMemorizeQueue([other, news], '')).toEqual([other, news]);
  });

  it('keeps the index inside the queue', () => {
    expect(clampMemorizeIndex(-1, 2)).toBe(0);
    expect(clampMemorizeIndex(4, 2)).toBe(1);
    expect(clampMemorizeIndex(4, 0)).toBe(0);
  });
});
