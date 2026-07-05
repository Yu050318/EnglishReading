import type { Question } from './questionSchema';

export interface DeduplicationResult {
  questions: Question[];
  exactDuplicatesRemoved: number;
  answerConflicts: Array<{ fingerprint: string; ids: string[] }>;
}

export function deduplicateQuestions(input: Question[]): DeduplicationResult {
  const byFingerprint = new Map<string, Question>();
  const answerConflicts: DeduplicationResult['answerConflicts'] = [];
  let exactDuplicatesRemoved = 0;
  for (const question of input) {
    const existing = byFingerprint.get(question.fingerprint);
    if (!existing) {
      byFingerprint.set(question.fingerprint, { ...question, source: [...question.source], answer: [...question.answer] });
      continue;
    }
    exactDuplicatesRemoved += 1;
    existing.source = [...new Set([...existing.source, ...question.source])];
    if (existing.answer.join('|') !== question.answer.join('|')) {
      answerConflicts.push({ fingerprint: question.fingerprint, ids: [existing.id, question.id] });
      existing.answer = [];
      existing.reviewStatus = 'needs_review';
    }
  }
  return { questions: [...byFingerprint.values()], exactDuplicatesRemoved, answerConflicts };
}
