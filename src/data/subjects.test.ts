import { describe, expect, it } from 'vitest';
import type { Question } from './questionSchema';
import { normalizeSubject, questionsForSubject, subjectLabel } from './subjects';

const question = (id: string, subject?: Question['subject']): Question => ({
  id,
  subject: subject ?? 'english',
  type: 'single_choice',
  question: id,
  options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
  answer: ['A'],
  category: 'vocabulary',
  source: ['test'],
  explanation: '',
  ocrConfidence: null,
  reviewStatus: 'verified',
  fingerprint: 'a'.repeat(64),
});

describe('subjects', () => {
  it('labels supported subjects', () => {
    expect(subjectLabel.english).toBe('英语');
    expect(subjectLabel.human_resources).toBe('人力资源');
  });

  it('defaults unknown or missing subject values to English', () => {
    expect(normalizeSubject(undefined)).toBe('english');
    expect(normalizeSubject('nope')).toBe('english');
    expect(normalizeSubject('human_resources')).toBe('human_resources');
  });

  it('filters questions by subject and treats old missing subject as English', () => {
    const old = { ...question('old') };
    delete (old as Partial<Question>).subject;
    const items = [old as Question, question('english', 'english'), question('hr', 'human_resources')];

    expect(questionsForSubject(items, 'english').map((item) => item.id)).toEqual(['old', 'english']);
    expect(questionsForSubject(items, 'human_resources').map((item) => item.id)).toEqual(['hr']);
  });
});
