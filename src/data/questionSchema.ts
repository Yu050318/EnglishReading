export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'T' | 'F';
export type QuestionType = 'single_choice' | 'true_false';
export type Category = 'news_english' | 'into_the_wild' | 'other';
export type ReviewStatus = 'verified' | 'needs_review';
export interface QuestionOption { key: OptionKey; text: string }
export interface Question {
  id: string; type: QuestionType; question: string; options: QuestionOption[];
  answer: OptionKey[]; category: Category; source: string[]; explanation: string;
  ocrConfidence: number | null; reviewStatus: ReviewStatus; fingerprint: string;
}
export interface ValidationResult { ok: boolean; errors: string[] }
export function validateQuestionCollection(input: unknown): ValidationResult {
  if (!Array.isArray(input)) return { ok: false, errors: ['题库必须是数组'] };
  const errors: string[] = [], ids = new Set<string>();
  input.forEach((raw, index) => {
    const q = raw as Partial<Question>, at = `第 ${index + 1} 题`;
    if (!q?.id) errors.push(`${at}缺少 ID`); else if (ids.has(q.id)) errors.push(`${at} ID 重复：${q.id}`); else ids.add(q.id);
    if (!q?.question?.trim()) errors.push(`${at}题干不能为空`);
    const options = Array.isArray(q.options) ? q.options : [], keys = options.map(o => o.key);
    if (options.length < 2) errors.push(`${at}至少需要两个选项`);
    if (new Set(keys).size !== keys.length) errors.push(`${at}选项键重复`);
    if (options.some(o => !o.text?.trim())) errors.push(`${at}选项文本不能为空`);
    const answers = Array.isArray(q.answer) ? q.answer : [];
    if (q.type === 'single_choice' && answers.length > 1) errors.push(`${at}单选题只能有一个答案`);
    if (answers.some(a => !keys.includes(a))) errors.push(`${at}答案不在选项中`);
    if (q.reviewStatus === 'verified' && answers.length !== 1) errors.push(`${at}已校对题必须有一个答案`);
    if (!['single_choice','true_false'].includes(q.type ?? '')) errors.push(`${at}题型无效`);
    if (!['news_english','into_the_wild','other'].includes(q.category ?? '')) errors.push(`${at}类别无效`);
    if (!['verified','needs_review'].includes(q.reviewStatus ?? '')) errors.push(`${at}校对状态无效`);
    if (!Array.isArray(q.source) || !q.source.length) errors.push(`${at}来源不能为空`);
    if (!/^[a-f0-9]{64}$/.test(q.fingerprint ?? '')) errors.push(`${at}指纹无效`);
  });
  return { ok: errors.length === 0, errors };
}
export function isPublishable(q: Question): boolean {
  return q.reviewStatus === 'verified' && !!q.question.trim() && q.options.length >= 2 && q.answer.length === 1;
}
