# yxq Category Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the current yxq Vocabulary question bank category from old news/wild/other labels to a single visible “词汇题库” category.

**Architecture:** Add `vocabulary` to the existing category model, make the yxq extraction set all yxq records to `vocabulary`, regenerate data, and make category filter options derive from categories that actually exist in the current question set. Preserve compatibility with old category values for imports.

**Tech Stack:** Existing Python extraction script, TypeScript schema/tests, React + Vite UI.

## Global Constraints

- Product spec: `docs/superpowers/specs/2026-07-08-yxq-category-correction.md`.
- Do not change core practice/memorize behavior beyond category display/filter options.
- Do not add dependencies.
- Protect unrelated dirty files. Do not submit `.claude/`, `tsconfig.json`, or task-outside changes.
- Use TDD: add failing tests for `vocabulary` category and dynamic category options before implementation.
- Product acceptance is required before commit/push.

---

## Task 1: Add `vocabulary` category to schema and yxq extraction

**Files:**
- Modify: `src/data/questionSchema.ts`
- Modify: `src/data/questionSchema.test.ts`
- Modify: `scripts/extract_questions.py`
- Modify: `src/data/yxqExtraction.test.ts`

**Interfaces:**
- `Category` includes `'vocabulary'`.
- `validateQuestionCollection()` accepts `vocabulary`.
- yxq extraction records use `category: "vocabulary"`.

- [ ] Step 1: Update or add failing schema test.

Add a test case equivalent to:

```ts
it('accepts vocabulary category', () => {
  const result = validateQuestionCollection([{ ...validQuestion, category: 'vocabulary' }]);
  expect(result.ok).toBe(true);
});
```

Expected RED: fails because `vocabulary` is not currently a valid category.

- [ ] Step 2: Update yxq extraction test expectation.

Change the yxq extraction test assertion from:

```ts
expect(record.category).toBe('other');
```

to:

```ts
expect(record.category).toBe('vocabulary');
```

Expected RED: fails because extraction currently returns `other`.

- [ ] Step 3: Implement minimal schema and extractor changes.

Required changes:

- `src/data/questionSchema.ts`
  - `export type Category = 'news_english' | 'into_the_wild' | 'other' | 'vocabulary';`
  - validation allowed list includes `'vocabulary'`.
- `scripts/extract_questions.py`
  - yxq document parsing path sets category to `"vocabulary"` for every parsed record.
  - Do not use `category_for()` for yxq records.

- [ ] Step 4: Run focused tests.

Run:

```bash
npm.cmd test -- src/data/questionSchema.test.ts src/data/yxqExtraction.test.ts
```

Expected: focused tests pass.

## Task 2: Add dynamic category option helper

**Files:**
- Prefer create: `src/data/categories.ts`
- Create test: `src/data/categories.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**

Create:

```ts
import type { Category, Question } from './questionSchema';

export const categoryLabel: Record<Category, string> = {
  vocabulary: '词汇题库',
  news_english: '新闻英语',
  into_the_wild: '荒野生存',
  other: '其他',
};

export function availableCategories(questions: Question[]): Category[] {
  const order: Category[] = ['vocabulary', 'news_english', 'into_the_wild', 'other'];
  const present = new Set(questions.map((question) => question.category));
  return order.filter((category) => present.has(category));
}
```

- [ ] Step 1: Write failing helper test.

Add tests equivalent to:

```ts
it('returns only categories present in questions', () => {
  expect(availableCategories([
    question('1', 'vocabulary'),
    question('2', 'vocabulary'),
  ])).toEqual(['vocabulary']);
});

it('keeps legacy categories when imported questions contain them', () => {
  expect(availableCategories([
    question('1', 'vocabulary'),
    question('2', 'news_english'),
    question('3', 'into_the_wild'),
  ])).toEqual(['vocabulary', 'news_english', 'into_the_wild']);
});
```

Expected RED: helper file/function does not exist.

- [ ] Step 2: Implement helper.

Use the exact interface above unless an existing better helper already exists.

- [ ] Step 3: Replace local hard-coded label map in `src/App.tsx`.

Required behavior:

- Use `categoryLabel[current.category]` wherever category text is displayed.
- In Practice setup, category options should be `availableCategories(q)`.
- In Memorize controls, category options should be `availableCategories(q)`.
- Do not list categories that have no current questions.
- If imported questions are included in a given page’s question list, categories from those imported questions should appear naturally.

Note: `src/App.tsx` is already dirty from previous unrelated work. Before editing, inspect current diff and only apply the smallest category-specific change. In the final report, clearly distinguish this task’s `App.tsx` change from pre-existing dirty content.

- [ ] Step 4: Run helper and affected tests.

Run:

```bash
npm.cmd test -- src/data/categories.test.ts src/features/practice/practice.test.ts src/features/memorize/memorize.test.ts
```

Expected: pass.

## Task 3: Regenerate question data

**Files:**
- Regenerate: `data/questions.raw.json`
- Regenerate: `data/extraction-meta.json`
- Regenerate: `data/questions.review.json`
- Regenerate: `data/conversion-report.json`
- Regenerate: `public/questions.json`

- [ ] Step 1: Run extraction.

Run:

```bash
python scripts/extract_questions.py
```

Expected: 60 yxq records.

- [ ] Step 2: Run conversion.

Run:

```bash
npm.cmd run convert
```

Expected: published 60, needsReview 0, conflicts 0.

- [ ] Step 3: Check category counts.

Run equivalent:

```bash
node -e "const q=require('./public/questions.json'); console.log(q.length, [...new Set(q.map(x=>x.category))])"
```

Expected:

```text
60 [ 'vocabulary' ]
```

## Task 4: Verification and product report

**Files:**
- No additional intended changes.

- [ ] Step 1: Run full verification.

Run:

```bash
npm.cmd run validate:data
npm.cmd test
npm.cmd run build
git diff --check
```

Expected: all pass; build may retain the existing React Router `use client` warning only.

- [ ] Step 2: Browser or static UI verification.

Preferred if browser automation is available:

- Open `http://localhost:5173/#/memorize`.
- Confirm category dropdown contains “全部类别 / 词汇题库”.
- Confirm it does not contain “新闻英语 / 荒野生存 / 其他”.
- Confirm first card tag says “词汇题库”.
- Open practice setup and confirm the same category dropdown behavior.

Fallback if browser automation is unavailable:

- Use data check proving only `vocabulary` exists.
- Use unit tests proving `availableCategories()` filters unused categories.
- Report browser limitation clearly.

- [ ] Step 3: Report to Product and wait.

Report:

- Modified files.
- Category counts before/after.
- UI option behavior.
- Verification results.
- Dirty files remaining outside scope.
- Do not commit/push before Product acceptance.

## Task 5: Commit and push after Product acceptance

**Files allowed for this task:**

- `src/data/questionSchema.ts`
- `src/data/questionSchema.test.ts`
- `src/data/categories.ts`
- `src/data/categories.test.ts`
- `scripts/extract_questions.py`
- `src/data/yxqExtraction.test.ts`
- `src/App.tsx` category-only diff
- `data/questions.raw.json`
- `data/extraction-meta.json`
- `data/questions.review.json`
- `data/conversion-report.json`
- `public/questions.json`
- `docs/superpowers/specs/2026-07-08-yxq-category-correction.md`
- `docs/superpowers/plans/2026-07-08-yxq-category-correction.md`

- [ ] Step 1: After Product acceptance, re-run fresh verification.

- [ ] Step 2: Stage exact task-scoped files only.

- [ ] Step 3: Commit.

Suggested message:

```bash
git commit -m "fix: correct yxq question category"
```

- [ ] Step 4: Push to existing `origin/main`.

If global proxy fails, use one-command temporary proxy clearing only; do not modify Git config.

- [ ] Step 5: Verify local HEAD, upstream, and GitHub `refs/heads/main` match.

## Self-review

- Spec coverage: all screenshot/user issues and discovered data misclassification are covered.
- Minimality: no new dependency, no UI redesign, no behavior changes outside categories.
- Compatibility: old categories remain valid for imported legacy data.
