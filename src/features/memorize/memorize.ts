import type { Question } from '../../data/questionSchema';

export const buildMemorizeQueue = (questions: Question[], category: string): Question[] =>
  category ? questions.filter(question => question.category === category) : questions;

export const clampMemorizeIndex = (index: number, length: number): number =>
  length === 0 ? 0 : Math.min(Math.max(index, 0), length - 1);
