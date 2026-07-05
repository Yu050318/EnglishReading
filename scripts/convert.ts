import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deduplicateQuestions } from '../src/data/deduplicate';
import { isPublishable, validateQuestionCollection, type Question } from '../src/data/questionSchema';

const root = resolve(import.meta.dirname, '..');
const raw = JSON.parse(await readFile(resolve(root, 'data/questions.raw.json'), 'utf8')) as Question[];
const meta = JSON.parse(await readFile(resolve(root, 'data/extraction-meta.json'), 'utf8'));
const deduplicated = deduplicateQuestions(raw);
const review = deduplicated.questions;
const validation = validateQuestionCollection(review);
if (!validation.ok) throw new Error(`题库校验失败：\n${validation.errors.join('\n')}`);
const published = review.filter(isPublishable);
const report = {
  generatedAt: new Date().toISOString(), totalRecognized: raw.length,
  structuredRecognized: meta.structuredRecognized, ocrPagesInspected: meta.ocrPagesInspected,
  ocrCandidatesAccepted: meta.ocrCandidatesAccepted,
  exactDuplicatesRemoved: deduplicated.exactDuplicatesRemoved,
  needsReview: review.filter((q) => q.reviewStatus === 'needs_review').length,
  published: published.length, answerConflicts: deduplicated.answerConflicts.length,
  conflicts: deduplicated.answerConflicts, invalidRecords: 0, similarityCandidates: [],
  notes: [meta.ocrPolicy],
};
await mkdir(resolve(root, 'public'), { recursive: true });
await writeFile(resolve(root, 'data/questions.review.json'), JSON.stringify(review, null, 2));
await writeFile(resolve(root, 'public/questions.json'), JSON.stringify(published, null, 2));
await writeFile(resolve(root, 'data/conversion-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
