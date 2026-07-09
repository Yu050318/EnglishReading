# Multi Subject HR Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second “人力资源” subject backed by `人力期中考核总复习_修正版答案解析.docx` without replacing or breaking the existing English subject.

**Architecture:** Keep one published question collection and add a `subject` field to each question. Extend schema and extraction to support English and HR records, then filter all app flows by selected subject. Add `multiple_choice` and `short_answer` support with minimal UI changes: objective questions can be practiced; subjective questions are primarily for memorize/library review.

**Tech Stack:** Existing React + Vite + TypeScript app, existing Python DOCX extraction, existing Vitest validation pipeline, LocalStorage/current sync payload compatibility.

## Global Constraints

- Product spec: `docs/superpowers/specs/2026-07-09-multi-subject-hr-question-bank.md`.
- Do not remove or replace the English question bank.
- Do not modify source DOCX files.
- Do not add dependencies unless blocked and Product approves.
- Preserve old local study records: missing subject means English.
- Protect task-outside dirty files and secret/local files: do not submit `.claude/`, `.env*`, `.vercel/`, or unrelated local config.
- Use TDD for schema, extraction, subject filtering, and multiple-choice scoring.
- Product acceptance is required before commit/push/deploy.

---

## Task 1: Extend data schema for subjects and new question types

**Files:**
- Modify: `src/data/questionSchema.ts`
- Modify: `src/data/questionSchema.test.ts`
- Create or modify: `src/data/subjects.ts`
- Test: `src/data/subjects.test.ts`

**Interfaces:**

```ts
export type SubjectId = 'english' | 'human_resources';
export type QuestionType = 'single_choice' | 'true_false' | 'multiple_choice' | 'short_answer';

export interface Question {
  subject: SubjectId;
  answer: OptionKey[];
  answerText?: string;
}
```

Compatibility rule: validation should accept old records without `subject` only at import/normalization boundaries. Published built-in data should always include subject.

- [ ] Step 1: Add failing schema tests.

Test cases:

```ts
it('accepts a published English question with subject', () => {
  expect(validateQuestionCollection([{ ...validQuestion, subject: 'english' }]).ok).toBe(true);
});

it('accepts a human resources multiple choice question', () => {
  expect(validateQuestionCollection([{
    ...validQuestion,
    subject: 'human_resources',
    type: 'multiple_choice',
    answer: ['B', 'D'],
  }]).ok).toBe(true);
});

it('accepts a human resources short answer with answerText and no options', () => {
  expect(validateQuestionCollection([{
    ...validQuestion,
    subject: 'human_resources',
    type: 'short_answer',
    options: [],
    answer: [],
    answerText: '参考答案',
  }]).ok).toBe(true);
});
```

Expected RED: subject/type rules fail.

- [ ] Step 2: Implement minimal schema support.

Rules:

- `single_choice`: one answer, answer must be in options.
- `multiple_choice`: one or more answers, every answer must be in options.
- `true_false`: existing behavior.
- `short_answer`: options may be empty; `answerText` or `explanation` must be non-empty; no objective answer required.
- `subject` must be `english` or `human_resources` for built-in/generated data.

- [ ] Step 3: Add subject labels.

Create:

```ts
export const subjectLabel: Record<SubjectId, string> = {
  english: '英语',
  human_resources: '人力资源',
};
```

- [ ] Step 4: Run focused tests.

```bash
npm.cmd test -- src/data/questionSchema.test.ts src/data/subjects.test.ts
```

Expected: pass.

## Task 2: Extract HR DOCX into question records

**Files:**
- Modify: `scripts/extract_questions.py` or create focused parser helper under `scripts/`
- Test: existing extraction test or new `src/data/hrExtraction.test.ts`
- Regenerate later: data JSON files

**Interfaces:**

HR records:

```json
{
  "subject": "human_resources",
  "type": "single_choice | multiple_choice | short_answer",
  "source": ["人力期中考核总复习_修正版答案解析.docx#..."],
  "explanation": "...",
  "answerText": "..."
}
```

- [ ] Step 1: Write failing extraction tests using samples from the DOCX.

Cover:

Single choice first question:

```ts
expect(q.type).toBe('single_choice');
expect(q.subject).toBe('human_resources');
expect(q.answer).toEqual(['B']);
expect(q.explanation).toContain('工作分析');
```

Multiple choice sample `案例（一）-2`:

```ts
expect(q.type).toBe('multiple_choice');
expect(q.answer).toEqual(['B', 'D']);
```

Calculation sample:

```ts
expect(q.type).toBe('short_answer');
expect(q.answerText).toContain('效率不变');
expect(q.explanation).toContain('250');
```

Case analysis sample:

```ts
expect(q.type).toBe('short_answer');
expect(q.answerText).toContain('岗位职责');
```

Expected RED: parser cannot produce these records.

- [ ] Step 2: Implement parser.

Parsing rules:

- Track current section by headings:
  - `一、单项选择题` → `single_choice`
  - `二、不定项选择题` → `multiple_choice`
  - `三、计算题` → `short_answer`
  - `四、案例分析题` → `short_answer`
- Objective questions:
  - Question starts with numeric or case label.
  - Options match `A. ...` through `D. ...`.
  - `答案：BD` becomes `["B","D"]`.
  - `解析：...` goes to `explanation`.
- Subjective questions:
  - Preserve full prompt.
  - `答案：...` or `参考答案：...` goes to `answerText`.
  - `解析：...` goes to `explanation`.
- Generate stable IDs with a subject prefix or subject included in fingerprint input.

- [ ] Step 3: Run extraction tests.

```bash
npm.cmd test -- src/data/hrExtraction.test.ts
```

Expected: pass.

## Task 3: Preserve and mark English questions

**Files:**
- Modify: `scripts/extract_questions.py`
- Modify: `src/data/yxqExtraction.test.ts`
- Regenerate data later.

- [ ] Step 1: Add/adjust tests requiring yxq records to include `subject: "english"`.

Expected RED if current yxq records lack subject.

- [ ] Step 2: Update English extraction path.

Rules:

- Existing yxq English questions remain `category: "vocabulary"`.
- Add `subject: "english"` to all English records.
- Do not change English question IDs unless necessary. If IDs must change due to subject in fingerprint, document effect on existing progress.

- [ ] Step 3: Run focused extraction tests.

```bash
npm.cmd test -- src/data/yxqExtraction.test.ts src/data/hrExtraction.test.ts
```

Expected: pass.

## Task 4: Regenerate and validate combined data

**Files:**
- Regenerate: `data/questions.raw.json`
- Regenerate: `data/extraction-meta.json`
- Regenerate: `data/questions.review.json`
- Regenerate: `data/conversion-report.json`
- Regenerate: `public/questions.json`

- [ ] Step 1: Run conversion.

```bash
npm.cmd run convert
```

Expected:

- English yxq questions remain published.
- HR questions are recognized and publishable when complete.
- No old English data is removed.

- [ ] Step 2: Check subject counts.

Run equivalent:

```bash
node -e "const q=require('./public/questions.json'); const m={}; for (const x of q) m[x.subject]=(m[x.subject]||0)+1; console.log(m)"
```

Expected: both `english` and `human_resources` exist.

- [ ] Step 3: Check type counts.

Expected: HR includes `single_choice`, `multiple_choice`, and `short_answer`.

## Task 5: Add subject filtering and subject entry UI

**Files:**
- Modify: `src/App.tsx`
- Possibly modify or create small helpers under `src/features/`
- Tests: subject/filter/scoring tests.

**Interfaces:**

```ts
function questionsForSubject(questions: Question[], subject: SubjectId): Question[]
```

- [ ] Step 1: Add failing filtering tests.

Test that English and HR queues do not mix.

- [ ] Step 2: Add subject selection to home.

Behavior:

- Home shows cards for 英语 and 人力资源.
- Each card shows total question count for that subject.
- Practice/memorize links include subject, for example `#/practice?subject=english`.

- [ ] Step 3: Apply subject filter in Practice, Memorize, Collection, Library.

Rules:

- If URL subject is missing, default to `english` for backward compatibility.
- Category filters operate inside current subject only.
- Wrong/favorite/library views show current subject records only.

- [ ] Step 4: Keep navigation simple.

Add visible current subject text and a way to return to subject selection/home.

## Task 6: Support multiple choice and short answer behavior

**Files:**
- Modify: `src/features/practice/practice.ts`
- Modify tests: `src/features/practice/practice.test.ts`
- Modify: `src/App.tsx`
- Possibly modify memorize rendering if needed.

- [ ] Step 1: Add failing scoring tests.

Cases:

```ts
expect(isCorrect(multiQuestion(['B','D']), ['B','D'])).toBe(true);
expect(isCorrect(multiQuestion(['B','D']), ['D','B'])).toBe(true);
expect(isCorrect(multiQuestion(['B','D']), ['B'])).toBe(false);
expect(isCorrect(multiQuestion(['B','D']), ['B','C','D'])).toBe(false);
```

- [ ] Step 2: Implement multi-select UI for `multiple_choice`.

Rules:

- Single choice keeps radio-like one pick.
- Multiple choice toggles options and allows multiple selected.
- Submit only enabled when at least one option selected.

- [ ] Step 3: Handle short answer.

Minimal product behavior:

- Back题 mode displays question, answerText, explanation.
- Practice mode excludes `short_answer` from auto-scored queues by default, or shows it with “查看参考答案” and does not affect score. Prefer excluding from auto-scored practice unless Product requests mixed practice.

## Task 7: Persistence and import/export compatibility

**Files:**
- Modify store/normalization code as needed.
- Tests: store/import compatibility tests.

- [ ] Step 1: Add tests for old records without subject.

Expected: old data is treated as English.

- [ ] Step 2: Ensure progress/favorite/mistake views are subject-filtered.

Do not delete old records; just filter by question membership of current subject.

- [ ] Step 3: Ensure export includes subject on questions.

## Task 8: Full verification and product report

Run:

```bash
npm.cmd run validate:data
npm.cmd test
npm.cmd run build
git diff --check
```

Browser verification if possible:

- Home shows 英语 and 人力资源.
- English practice still works.
- HR practice shows HR objective questions only.
- HR memorize can show calculation/case answerText and explanation.
- Subject switching does not mix queues.

Report to Product before commit/push:

- Modified files.
- English count and HR count.
- HR type counts.
- Verification results.
- Browser verification status.
- Dirty files excluded.
- Whether `MEMORY.md` was updated.

## Task 9: Commit, push, and deploy after Product acceptance

After Product acceptance:

- Re-run full verification.
- Stage exact task files only.
- Commit suggested message:

```bash
git commit -m "feat: add human resources subject question bank"
```

- Push to `origin/main`.
- Verify local HEAD, upstream, and GitHub main match.
- If Vercel Git integration is active, wait for production deployment and verify online URL. If not, run existing Vercel deploy flow.

## Self-review

- Spec coverage: all user requirements are represented: no change to existing English, new HR document as separate subject, objective/subjective handling.
- Minimality: one question collection plus subject field avoids parallel app duplication.
- Compatibility: old missing-subject data defaults to English.
