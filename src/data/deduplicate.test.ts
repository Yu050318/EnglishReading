import { describe, expect, it } from 'vitest';
import { deduplicateQuestions } from './deduplicate';

const base = {
  id: 'q_1', type: 'single_choice' as const, question: 'Question?',
  subject: 'english' as const,
  options: [{ key: 'A' as const, text: 'Yes' }, { key: 'B' as const, text: 'No' }],
  answer: ['A'], category: 'other' as const, source: ['one'], explanation: '', ocrConfidence: null,
  reviewStatus: 'verified' as const, fingerprint: 'f'.repeat(64),
};

describe('deduplicateQuestions', () => {
  it('merges exact fingerprints and unions sources', () => {
    const result = deduplicateQuestions([base, { ...base, id: 'q_2', source: ['two'] }]);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].source).toEqual(['one', 'two']);
    expect(result.exactDuplicatesRemoved).toBe(1);
  });
  it('marks answer conflicts for review without guessing', () => {
    const result = deduplicateQuestions([base, { ...base, id: 'q_2', answer: ['B'] }]);
    expect(result.questions[0].reviewStatus).toBe('needs_review');
    expect(result.questions[0].answer).toEqual([]);
    expect(result.answerConflicts).toHaveLength(1);
  });
});
