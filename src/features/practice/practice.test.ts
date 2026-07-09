import { describe, expect, it } from 'vitest';
import { buildQueue, filterQuestions, isCorrect } from './practice';

const q = (
  id: string,
  category = 'other',
  subject = 'english',
  type = 'single_choice',
  answer = ['A'],
) => ({
  id,
  subject,
  category,
  question: id,
  source: ['s'],
  answer,
  options: [
    { key: 'A', text: 'a' },
    { key: 'B', text: 'b' },
    { key: 'C', text: 'c' },
    { key: 'D', text: 'd' },
  ],
  type,
  explanation: '',
  ocrConfidence: null,
  reviewStatus: 'verified',
  fingerprint: 'a'.repeat(64),
}) as any;

describe('practice', () => {
  it('filters', () => {
    expect(filterQuestions([q('1'), q('2', 'news_english')], { category: 'news_english' }).map((item) => item.id)).toEqual(['2']);
  });

  it('filters by subject and treats old records as English', () => {
    const old = q('old');
    delete old.subject;
    const items = [old, q('en'), q('hr', 'human_resources_review', 'human_resources')];

    expect(filterQuestions(items, { subject: 'english' }).map((item) => item.id)).toEqual(['old', 'en']);
    expect(filterQuestions(items, { subject: 'human_resources' }).map((item) => item.id)).toEqual(['hr']);
  });

  it('does not repeat', () => {
    expect(new Set(buildQueue([q('1'), q('2'), q('3')], true, 'all').map((item) => item.id)).size).toBe(3);
  });

  it('excludes short answer questions from auto-scored queues', () => {
    expect(buildQueue([q('objective'), q('subjective', 'human_resources_review', 'human_resources', 'short_answer', [])], false, 'all').map((item) => item.id)).toEqual(['objective']);
  });

  it('scores', () => {
    expect(isCorrect(q('1'), ['A'])).toBe(true);
  });

  it('scores multiple choice by exact answer set', () => {
    const multi = q('multi', 'human_resources_review', 'human_resources', 'multiple_choice', ['B', 'D']);

    expect(isCorrect(multi, ['B', 'D'])).toBe(true);
    expect(isCorrect(multi, ['D', 'B'])).toBe(true);
    expect(isCorrect(multi, ['B'])).toBe(false);
    expect(isCorrect(multi, ['B', 'C', 'D'])).toBe(false);
  });
});
