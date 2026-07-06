import type { Question } from '../../data/questionSchema';

export const buildMemorizeQueue = (questions: Question[], category: string): Question[] =>
  category ? questions.filter(question => question.category === category) : questions;

export const clampMemorizeIndex = (index: number, length: number): number =>
  length === 0 ? 0 : Math.min(Math.max(index, 0), length - 1);

export type MemorizeJumpResult = { ok: true; index: number } | { ok: false };

export const parseMemorizeJump = (value: string, length: number): MemorizeJumpResult => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const questionNumber = Number(trimmed);
  if (!Number.isSafeInteger(questionNumber) || questionNumber < 1 || questionNumber > length) {
    return { ok: false };
  }
  return { ok: true, index: questionNumber - 1 };
};
