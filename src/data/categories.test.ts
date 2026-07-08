import { describe, expect, it } from 'vitest';
import { availableCategories, categoryLabel } from './categories';
import type { Category, Question } from './questionSchema';

const question = (id: string, category: Category): Question => ({
  id,
  type: 'single_choice',
  question: id,
  options: [{ key: 'A', text: 'yes' }, { key: 'B', text: 'no' }],
  answer: ['A'],
  category,
  source: ['test'],
  explanation: '',
  ocrConfidence: null,
  reviewStatus: 'verified',
  fingerprint: id.padEnd(64, 'a').slice(0, 64),
});

describe('categories', () => {
  it('labels vocabulary questions', () => {
    expect(categoryLabel.vocabulary).toBe('词汇题库');
  });

  it('returns only categories present in questions', () => {
    expect(availableCategories([
      question('1', 'vocabulary'),
      question('2', 'vocabulary'),
    ])).toEqual(['vocabulary']);
  });

  it('keeps legacy categories when questions contain them', () => {
    expect(availableCategories([
      question('1', 'vocabulary'),
      question('2', 'news_english'),
      question('3', 'into_the_wild'),
    ])).toEqual(['vocabulary', 'news_english', 'into_the_wild']);
  });
});
