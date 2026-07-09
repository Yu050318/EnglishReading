export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'T' | 'F';
export type QuestionType = 'single_choice' | 'true_false' | 'multiple_choice' | 'short_answer';
export type Category = 'news_english' | 'into_the_wild' | 'other' | 'vocabulary' | 'human_resources_review';
export type ReviewStatus = 'verified' | 'needs_review';
export type SubjectId = 'english' | 'human_resources';

export interface QuestionOption { key: OptionKey; text: string }
export interface Question {
  id: string;
  subject: SubjectId;
  type: QuestionType;
  question: string;
  options: QuestionOption[];
  answer: OptionKey[];
  answerText?: string;
  category: Category;
  source: string[];
  explanation: string;
  ocrConfidence: number | null;
  reviewStatus: ReviewStatus;
  fingerprint: string;
}
export interface ValidationResult { ok: boolean; errors: string[] }

const optionKeys = new Set<OptionKey>(['A', 'B', 'C', 'D', 'T', 'F']);
const subjects = new Set<SubjectId>(['english', 'human_resources']);
const types = new Set<QuestionType>(['single_choice', 'true_false', 'multiple_choice', 'short_answer']);
const categories = new Set<Category>(['news_english', 'into_the_wild', 'other', 'vocabulary', 'human_resources_review']);
const statuses = new Set<ReviewStatus>(['verified', 'needs_review']);

export function normalizeSubjectValue(value: unknown): SubjectId {
  return value === 'human_resources' ? 'human_resources' : 'english';
}

export function normalizeQuestion(raw: unknown): Question {
  const item = raw as Partial<Question>;
  return {
    ...item,
    subject: normalizeSubjectValue(item.subject),
    options: Array.isArray(item.options) ? item.options : [],
    answer: Array.isArray(item.answer) ? item.answer : [],
    source: Array.isArray(item.source) ? item.source : [],
    explanation: typeof item.explanation === 'string' ? item.explanation : '',
    ocrConfidence: item.ocrConfidence ?? null,
  } as Question;
}

export function normalizeQuestionCollection(input: unknown): Question[] {
  return Array.isArray(input) ? input.map(normalizeQuestion) : [];
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateQuestionCollection(input: unknown): ValidationResult {
  if (!Array.isArray(input)) return { ok: false, errors: ['题库必须是数组'] };
  const errors: string[] = [];
  const ids = new Set<string>();
  input.forEach((raw, index) => {
    const q = normalizeQuestion(raw);
    const at = `第 ${index + 1} 题`;
    if (!q.id) errors.push(`${at}缺少 ID`);
    else if (ids.has(q.id)) errors.push(`${at} ID 重复：${q.id}`);
    else ids.add(q.id);
    if (!q.question?.trim()) errors.push(`${at}题干不能为空`);
    if (!subjects.has(q.subject)) errors.push(`${at}科目无效`);
    if (!types.has(q.type)) errors.push(`${at}题型无效`);
    if (!categories.has(q.category)) errors.push(`${at}类别无效`);
    if (!statuses.has(q.reviewStatus)) errors.push(`${at}校对状态无效`);
    if (!Array.isArray(q.source) || !q.source.length) errors.push(`${at}来源不能为空`);
    if (!/^[a-f0-9]{64}$/.test(q.fingerprint ?? '')) errors.push(`${at}指纹无效`);

    const keys = q.options.map((option) => option.key);
    if (q.type !== 'short_answer' && q.options.length < 2) errors.push(`${at}至少需要两个选项`);
    if (new Set(keys).size !== keys.length) errors.push(`${at}选项键重复`);
    if (q.options.some((option) => !optionKeys.has(option.key) || !option.text?.trim())) errors.push(`${at}选项无效`);
    const answers = q.answer;
    if (new Set(answers).size !== answers.length) errors.push(`${at}答案重复`);
    if (q.type !== 'short_answer' && answers.some((answer) => !keys.includes(answer))) errors.push(`${at}答案不在选项中`);

    if ((q.type === 'single_choice' || q.type === 'true_false') && answers.length > 1) errors.push(`${at}单选题只能有一个答案`);
    if (q.type === 'multiple_choice' && q.reviewStatus === 'verified' && answers.length < 1) errors.push(`${at}多选题必须至少有一个答案`);
    if (q.type === 'short_answer' && !hasText(q.answerText) && !hasText(q.explanation)) errors.push(`${at}主观题必须有参考答案或解析`);
    if (q.reviewStatus === 'verified' && q.type !== 'short_answer' && answers.length < 1) errors.push(`${at}已校对题必须有答案`);
  });
  return { ok: errors.length === 0, errors };
}

export function isPublishable(raw: Question): boolean {
  const q = normalizeQuestion(raw);
  if (q.reviewStatus !== 'verified' || !q.question.trim()) return false;
  if (q.type === 'short_answer') return hasText(q.answerText) || hasText(q.explanation);
  if (q.options.length < 2 || q.answer.length < 1) return false;
  if (q.type === 'single_choice' || q.type === 'true_false') return q.answer.length === 1;
  return q.type === 'multiple_choice';
}
