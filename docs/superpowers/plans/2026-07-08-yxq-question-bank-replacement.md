# yxq Question Bank Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quiz website's built-in question bank with the 60 questions from `D:\学习\大二下\英语阅读\yxq英语题库.docx`.

**Architecture:** Reuse the existing pipeline: extract DOCX into `data/questions.raw.json`, convert/deduplicate into `data/questions.review.json`, and publish verified questions to `public/questions.json`. Keep the app UI and localStorage behavior unchanged.

**Tech Stack:** Python DOCX extraction script, Node/Vitest TypeScript validation, existing React + Vite app.

## Global Constraints

- Product spec: `docs/superpowers/specs/2026-07-08-yxq-question-bank-replacement.md`.
- Do not edit the source DOCX.
- Do not add dependencies unless the existing environment cannot read this DOCX; if blocked, report to Product before adding anything.
- Do not submit unrelated dirty files. Explicitly exclude `.claude/`, `tsconfig.json`, and unrelated `src/**` changes already present before this task.
- Use TDD for parser behavior: write a failing parser/extraction test before changing extraction behavior.
- Keep implementation minimal: no new UI, no new backend, no new data management feature.
- After Product acceptance, commit only task-scoped files and push to the existing `origin/main`.

---

## File Map

- Modify: `scripts/extract_questions.py`
  - Add or adjust parsing so `yxq英语题库.docx` is the source for this replacement.
  - Produce records matching the existing `Question` JSON shape.
- Modify or create test near the existing data tests:
  - Preferred: `src/data/yxqExtraction.test.ts` if calling a TS helper is practical.
  - Alternative: a small Python parser test if the repo already supports Python tests; if not, use Vitest with a fixture-like function exported from a TS helper.
- Regenerate: `data/questions.raw.json`
- Regenerate: `data/extraction-meta.json`
- Regenerate: `data/questions.review.json`
- Regenerate: `data/conversion-report.json`
- Regenerate: `public/questions.json`
- Do not touch: source DOCX, `.claude/`, `tsconfig.json`, unrelated app feature files unless needed only to fix a real failing test caused by this data replacement.

## Task 1: Add parser coverage for the yxq DOCX format

**Files:**
- Test: choose the smallest test location consistent with the current codebase.
- Modify only if needed for testability: `scripts/extract_questions.py` or a new tiny extraction helper.

**Interfaces:**
- Consumes: text structure with `1.`, question text, `A.`, `B.`, `C.`, `D.`, `答案：X`.
- Produces: one record with `type: "single_choice"`, 4 options, `answer: ["D"]` for the first sample question, `source: ["yxq英语题库.docx#1"]`, `category: "other"`, `reviewStatus: "verified"`.

- [ ] Step 1: Write the failing test using the first source question as the sample.

Sample content to assert against:

```text
1.
When he was 16, Mr. Green went on vacation to Thailand with his parents. That was the ______ that led to him setting up his own travel company.
A. routine
B. concern
C. obstacle
D. spark
答案：D
```

Required assertions:

```ts
expect(record.type).toBe('single_choice');
expect(record.question).toContain('Mr. Green went on vacation');
expect(record.options).toEqual([
  { key: 'A', text: 'routine' },
  { key: 'B', text: 'concern' },
  { key: 'C', text: 'obstacle' },
  { key: 'D', text: 'spark' },
]);
expect(record.answer).toEqual(['D']);
expect(record.source).toEqual(['yxq英语题库.docx#1']);
expect(record.category).toBe('other');
expect(record.reviewStatus).toBe('verified');
```

- [ ] Step 2: Run the focused test and verify RED.

Run the exact relevant focused test command, for example:

```bash
npm test -- yxqExtraction
```

Expected: fail because the yxq parser/helper does not exist yet or does not parse the sample.

- [ ] Step 3: Implement the minimal parser change.

Implementation rules:

- Match question starts with `^\d+\.\s*$` or `^\d+\.\s+`.
- Collect following non-empty paragraphs until the next numbered question.
- Treat lines matching `^[A-D]\.\s+` as options.
- Treat lines matching `^答案[:：]\s*([A-D])$` as the answer.
- Join non-option, non-answer lines between the number and first option as the question text with a single space.
- Mark complete records as `verified`; incomplete records as `needs_review`.
- Reuse existing fingerprint generation.

- [ ] Step 4: Run the focused test and verify GREEN.

Run:

```bash
npm test -- yxqExtraction
```

Expected: focused test passes.

## Task 2: Switch extraction to the yxq document and regenerate data

**Files:**
- Modify: `scripts/extract_questions.py`
- Regenerate: `data/questions.raw.json`
- Regenerate: `data/extraction-meta.json`
- Regenerate after conversion: `data/questions.review.json`, `data/conversion-report.json`, `public/questions.json`

**Interfaces:**
- Produces raw records with existing `Question` shape.
- Produces metadata showing `sourceDocuments: ["yxq英语题库.docx"]` or equivalent clear field, `structuredRecognized: 60`, and no OCR-promoted records.

- [ ] Step 1: Run extraction.

Run:

```bash
python scripts/extract_questions.py
```

Expected: command reports 60 structured records from `yxq英语题库.docx`.

- [ ] Step 2: Run conversion.

Run:

```bash
npm run convert
```

Expected:

- `totalRecognized` is 60.
- `published` is 60 if all source questions are complete.
- `needsReview` is 0 if all source questions are complete.
- `answerConflicts` is 0.

- [ ] Step 3: Inspect generated public data.

Run a read-only check equivalent to:

```bash
node -e "const q=require('./public/questions.json'); console.log(q.length, q[0].source, q[0].answer)"
```

Expected:

- Length is 60.
- First source is `yxq英语题库.docx#1`.
- First answer is `["D"]`.

## Task 3: Validate app compatibility

**Files:**
- Prefer no app source changes.
- Only change app source if a real compatibility failure occurs because of valid new data.

**Interfaces:**
- `public/questions.json` remains a valid `Question[]`.
- Practice and memorize flows continue to consume the same schema.

- [ ] Step 1: Run data validation.

Run:

```bash
npm run validate:data
```

Expected: validation passes.

- [ ] Step 2: Run unit tests.

Run:

```bash
npm test
```

Expected: all suites pass. If existing unrelated dirty changes cause failures, identify the failing files and report whether they are outside this task before editing.

- [ ] Step 3: Run production build.

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [ ] Step 4: Optional browser or HTTP smoke check.

If local browser automation is available, start the dev server and verify the homepage displays the new total count and practice/memorize pages load.

If browser automation is unavailable, use static/HTTP checks:

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Then request:

- `http://127.0.0.1:5173/`
- `http://127.0.0.1:5173/questions.json`

Expected: both return HTTP 200, and `questions.json` has 60 records.

## Task 4: Report to Product for acceptance

**Files:**
- No new code changes.

- [ ] Step 1: Provide the implementation report to Product.

Include:

- Modified files.
- Generated data counts.
- First and last source item sanity check.
- Whether any records were `needs_review`.
- Full verification commands and pass/fail results.
- Current dirty worktree items that remain excluded.
- Whether browser verification was performed or why not.

- [ ] Step 2: Wait for Product acceptance before commit/push.

Do not commit yet unless Product explicitly accepts.

## Task 5: Commit and push after Product acceptance

**Files:**
- Stage only task-scoped files:
  - `scripts/extract_questions.py`
  - parser test/helper files created for this task
  - `data/questions.raw.json`
  - `data/extraction-meta.json`
  - `data/questions.review.json`
  - `data/conversion-report.json`
  - `public/questions.json`
  - this spec/plan if Product asks execution to include them

- [ ] Step 1: Re-run fresh verification after Product acceptance.

Run:

```bash
npm run validate:data
npm test
npm run build
git diff --check
```

Expected: all pass.

- [ ] Step 2: Stage exact task files only.

Run `git status --short` first and verify unrelated files remain unstaged.

- [ ] Step 3: Commit.

Suggested message:

```bash
git commit -m "feat: replace question bank with yxq vocabulary set"
```

- [ ] Step 4: Push.

Run:

```bash
git push origin main
```

If the global local proxy blocks push, use one-command temporary proxy clearing only; do not modify Git config.

- [ ] Step 5: Verify remote.

Run:

```bash
git ls-remote --heads origin main
```

Expected: remote `refs/heads/main` hash equals local `HEAD`.

## Self-review

- Spec coverage: all acceptance criteria are covered by Tasks 1-5.
- Placeholder scan: no task contains TBD/TODO-style placeholders; optional browser verification has a fallback.
- Minimality: plan reuses existing schema, conversion, validation, and app code.
