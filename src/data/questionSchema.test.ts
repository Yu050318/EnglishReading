import { describe, expect, it } from 'vitest';
import { validateQuestionCollection } from './questionSchema';

const valid = {
  id: 'q_abc', type: 'single_choice', question: 'What is news?',
  options: [{ key: 'A', text: 'A report' }, { key: 'B', text: 'A poem' }],
  answer: ['A'], category: 'news_english', source: ['test'], explanation: '',
  ocrConfidence: null, reviewStatus: 'verified', fingerprint: 'a'.repeat(64),
};

describe('validateQuestionCollection', () => {
  it('accepts a valid collection', () => expect(validateQuestionCollection([valid])).toEqual({ ok: true, errors: [] }));
  it('accepts vocabulary category', () => expect(validateQuestionCollection([{ ...valid, category: 'vocabulary' }])).toEqual({ ok: true, errors: [] }));
  it.each([
    ['empty question', [{ ...valid, question: ' ' }], '题干不能为空'],
    ['duplicate option keys', [{ ...valid, options: [{ key: 'A', text: 'x' }, { key: 'A', text: 'y' }] }], '选项键重复'],
    ['answer outside options', [{ ...valid, answer: ['D'] }], '答案不在选项中'],
    ['multiple single-choice answers', [{ ...valid, answer: ['A', 'B'] }], '单选题只能有一个答案'],
    ['duplicate ids', [valid, { ...valid }], 'ID 重复'],
  ])('rejects %s', (_name, input, message) => {
    const result = validateQuestionCollection(input);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain(message);
  });
});
