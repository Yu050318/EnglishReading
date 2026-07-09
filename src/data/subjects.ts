import type { Question, SubjectId } from './questionSchema';
import { normalizeSubjectValue } from './questionSchema';

export const subjectLabel: Record<SubjectId, string> = {
  english: '英语',
  human_resources: '人力资源',
};

export const subjectOrder: SubjectId[] = ['english', 'human_resources'];

export function normalizeSubject(value: unknown): SubjectId {
  return normalizeSubjectValue(value);
}

export function questionsForSubject<T extends Question>(questions: T[], subject: SubjectId): T[] {
  return questions.filter((question) => normalizeSubject((question as Partial<Question>).subject) === subject);
}

export function availableSubjects(questions: Question[]): SubjectId[] {
  const present = new Set(questions.map((question) => normalizeSubject(question.subject)));
  return subjectOrder.filter((subject) => present.has(subject));
}
