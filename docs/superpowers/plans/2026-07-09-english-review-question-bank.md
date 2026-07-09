# English Review Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add questions from `英语复习.docx` to the existing English subject and expose them under a new “英语复习” category without changing the existing English vocabulary bank or the Human Resources subject.

**Architecture:** Extend the existing extraction pipeline to parse a second English source document. Keep one combined `public/questions.json` with `subject` and `category` fields. Add a new English category value/label for the review document, regenerate data, and rely on existing subject/category filtering.

**Tech Stack:** Existing Python DOCX extraction, TypeScript schema/category helpers, React + Vite app, Vitest.

## Global Constraints

- Product spec: `docs/superpowers/specs/2026-07-09-english-review-question-bank.md`.
- Do not remove or change existing yxq English 60 questions.
- Do not change Human Resources questions.
- Do not change Supabase schema/RPC/env.
- Do not commit `.env*`, `.vercel/`, `.claude/`, tokens, or task-outside dirty files.
- Use TDD for English review extraction and category label support.
- Product acceptance is required before commit/push/deploy.

---

## Task 1: Add English review category

**Files:**
- Modify: `src/data/questionSchema.ts`
- Modify: `src/data/questionSchema.test.ts`
- Modify: `src/data/categories.ts`
- Modify: `src/data/categories.test.ts`

**Interface:**

Add a category equivalent to:

```ts
english_review: '英语复习'
```

- [ ] Step 1: Write failing tests.

Test schema accepts category `english_review`; test category label is `英语复习`.

- [ ] Step 2: Implement category support.

Rules:

- Keep `vocabulary` for existing yxq questions.
- Add `english_review` to valid categories.
- Add label `英语复习`.
- Ensure available category ordering for English places vocabulary before english_review.

- [ ] Step 3: Run focused tests.

```bash
npm.cmd test -- src/data/questionSchema.test.ts src/data/categories.test.ts
```

Expected: pass.

## Task 2: Add extraction tests for `英语复习.docx`

**Files:**
- Create: `src/data/englishReviewExtraction.test.ts`
- Modify as needed: `scripts/extract_questions.py`

**Test coverage:**

Use temporary fixture text or parse the real DOCX if existing tests already do that safely.

Required cases:

1. First-part two-choice question:

```text
1. The company needs to look at ways of ______(improving / progressing)
employees' understanding of the decisions it makes.
Answer: Improving
```

Expected:

- subject `english`
- category `english_review`
- type `single_choice`
- two options
- answer points to `improving`

2. First-part sentence blank with answer phrase list:

Question sample:

```text
2. The CEO stood up to _____ and outlined the plans for the next financial year.
```

Answer phrase:

```text
address the meeting
```

Expected: publishable single-choice or short-answer with correct answer text; do not guess if mapping is not stable.

3. Second-part passage cloze:

Vocabulary bank includes `K numerous`.
Answer mapping includes `1—5 KMOHI`.

Expected at least blank 1 is parsed as:

- subject `english`
- category `english_review`
- type `single_choice`
- options include key `K` text `numerous`
- answer `K`

- [ ] Step 1: Write failing tests.

Expected RED: parser does not expose English review extraction.

- [ ] Step 2: Run focused RED command.

```bash
npm.cmd test -- src/data/englishReviewExtraction.test.ts
```

## Task 3: Implement English review parser

**Files:**
- Modify: `scripts/extract_questions.py`

**Parser rules:**

- Identify `英语复习.docx` as an English source.
- Existing yxq records stay subject `english`, category `vocabulary`.
- English review records use subject `english`, category `english_review`.
- Handle document paragraph extraction robustly because Word XML may have split runs.

Part 1:

- Parse numbered questions.
- For inline `(a / b)` or `(a, b)` options, generate two options.
- Match following answer lines by sequence.
- Normalize answer capitalization when matching options.
- For answer phrase list questions, map answers by sequence when the number of questions equals number of answer phrases.
- If sequence cannot be proven, mark as `needs_review` and do not publish.

Part 2:

- Parse option banks A-O.
- Parse passage blanks `(1)` through `(10)`.
- Parse answer lines like `1—5 KMOHI` and `6—10 ADJNF`.
- Emit one single-choice question per blank.
- Question text should include passage identifier and blank number; keep enough context for review.

- [ ] Step 1: Implement the smallest parser that satisfies tests.

- [ ] Step 2: Run focused tests.

```bash
npm.cmd test -- src/data/englishReviewExtraction.test.ts src/data/yxqExtraction.test.ts src/data/hrExtraction.test.ts
```

Expected: pass.

## Task 4: Regenerate combined question data

**Files:**
- Regenerate:
  - `data/questions.raw.json`
  - `data/extraction-meta.json`
  - `data/questions.review.json`
  - `data/conversion-report.json`
  - `public/questions.json`

- [ ] Step 1: Run conversion.

```bash
npm.cmd run convert
```

Expected:

- English subject count increases beyond 60.
- Human Resources remains 32.
- Existing yxq 60 remain.
- `needsReview` is 0 if all accepted records are reliable; otherwise non-publishable review records are documented but not published.

- [ ] Step 2: Data sanity check.

Run a node check reporting:

- total count
- count by subject
- English count by category
- HR type distribution unchanged

## Task 5: UI/category behavior check

**Files:**
- Prefer no UI code changes if existing dynamic category logic works.
- Only modify app if category display/filtering fails.

Expected behavior:

- English category filter includes `词汇题库` and `英语复习`.
- Human Resources category filter does not include `英语复习`.
- Subject switcher remains unchanged.

If UI needs changes, add focused tests or static checks for category filtering.

## Task 6: Full verification and product report

Run:

```bash
npm.cmd run validate:data
npm.cmd test
npm.cmd run build
git diff --check
```

Browser verification if possible:

- Open English practice/memorize page.
- Confirm category dropdown has `英语复习`.
- Select `英语复习` and confirm review questions appear.
- Open Human Resources page and confirm `英语复习` does not appear.
- 375px no horizontal overflow.

Report to Product before commit/push:

- Modified files.
- New English review question count.
- Total count and count by subject.
- English category counts.
- HR count unchanged.
- Verification results.
- Browser status.
- Dirty files excluded.
- Whether `MEMORY.md` was updated.

## Task 7: Commit, push, deploy after Product acceptance

After Product acceptance:

- Re-run full verification.
- Stage exact task files only.
- Commit suggested message:

```bash
git commit -m "feat: add English review question bank"
```

- Push to `origin/main`.
- Wait for Vercel production deployment.
- Online smoke:
  - Production URL 200.
  - `/questions.json` count increased.
  - English subject contains category `english_review`.
  - HR subject unchanged.
  - English page can filter to `英语复习`.

## Self-review

- Existing English yxq bank is preserved.
- HR subject is untouched.
- New category is limited to English subject.
- Ambiguous answers are not guessed.
