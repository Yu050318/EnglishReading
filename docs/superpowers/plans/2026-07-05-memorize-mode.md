# Memorize Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-question-at-a-time memorize mode that always reveals the correct answer.

**Architecture:** Keep queue/index logic in a small pure module and render the mode as a dedicated React page. Reuse the existing question model, category labels, favorites state, and responsive visual language without changing persisted data.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Vite

---

### Task 1: Memorize navigation helpers

**Files:**
- Create: `src/features/memorize/memorize.ts`
- Create: `src/features/memorize/memorize.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
expect(buildMemorizeQueue([other, news], 'news_english')).toEqual([news]);
expect(clampMemorizeIndex(-1, 2)).toBe(0);
expect(clampMemorizeIndex(4, 2)).toBe(1);
expect(clampMemorizeIndex(4, 0)).toBe(0);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- src/features/memorize/memorize.test.ts`
Expected: FAIL because the module/functions do not exist.

- [ ] **Step 3: Implement the pure helpers**

```ts
export const buildMemorizeQueue = (questions: Question[], category: string) =>
  category ? questions.filter(question => question.category === category) : questions;

export const clampMemorizeIndex = (index: number, length: number) =>
  length === 0 ? 0 : Math.min(Math.max(index, 0), length - 1);
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm.cmd test -- src/features/memorize/memorize.test.ts`
Expected: all memorize helper tests pass.

### Task 2: Memorize page and routes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add a dedicated `/memorize` route and navigation entries**

Add “背题” to the header, add a home action, and route to a `Memorize` component receiving questions, state, and `setState`.

- [ ] **Step 2: Render the memorization card**

Render category selection, `current / total`, question text, every option, green correct-option styling, explicit answer text, optional explanation, favorite toggle, previous/next buttons, and empty/loading state.

- [ ] **Step 3: Add keyboard navigation**

Register `ArrowLeft` and `ArrowRight` while the component is mounted, clamp movement at both ends, and clean up the listener on unmount.

- [ ] **Step 4: Add responsive styles**

Add `.memorize`, `.memorize-controls`, `.memorize-option`, `.memorize-answer`, and mobile rules. Keep controls at least 44px high and avoid horizontal overflow.

### Task 3: Verification

**Files:**
- Verify: all changed source and test files

- [ ] **Step 1: Run complete tests**

Run: `npm.cmd test`
Expected: all suites pass.

- [ ] **Step 2: Validate the question bank**

Run: `npm.cmd run validate:data`
Expected: `题库校验通过`.

- [ ] **Step 3: Build production assets**

Run: `npm.cmd run build`
Expected: Vite exits successfully and writes `dist` assets.

- [ ] **Step 4: Inspect repository scope**

Run: `git diff --check` and `git status --short`
Expected: no whitespace errors; pre-existing user changes remain intact and identifiable.

