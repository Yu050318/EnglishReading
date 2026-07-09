import type { Question, SubjectId } from '../../data/questionSchema';
import { normalizeSubject } from '../../data/subjects';

export interface Filters { category?: string; source?: string; search?: string; subject?: SubjectId }

export function filterQuestions(items: Question[], filters: Filters): Question[] {
  const search = filters.search?.trim().toLowerCase();
  return items.filter((question) => {
    if (filters.subject && normalizeSubject(question.subject) !== filters.subject) return false;
    if (filters.category && question.category !== filters.category) return false;
    if (filters.source && !question.source.some((source) => source.includes(filters.source!))) return false;
    return !search || question.question.toLowerCase().includes(search);
  });
}

export function buildQueue(items: Question[], random: boolean, count: number | 'all'): Question[] {
  const out = items.filter((question) => question.type !== 'short_answer');
  if (random) {
    for (let index = out.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [out[index], out[target]] = [out[target], out[index]];
    }
  }
  return count === 'all' ? out : out.slice(0, count);
}

export function isCorrect(q: Question, selected: string[]): boolean {
  return [...q.answer].sort().join('|') === [...selected].sort().join('|');
}
