# Memorize Question Jump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users jump directly to the Nth question in the currently filtered memorize queue.

**Architecture:** Add a pure jump-target parser beside the existing memorize queue helpers, then connect it to local input/error state inside the existing `Memorize` component. Keep the queue index zero-based internally and the user-facing question number one-based; do not change persistence or question data.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Vite

---

### Task 1: Validate and convert a user-entered question number

**Files:**
- Modify: `src/features/memorize/memorize.ts`
- Modify: `src/features/memorize/memorize.test.ts`

- [ ] **Step 1: Write failing parser tests**

Add this import and test block:

```ts
import { buildMemorizeQueue, clampMemorizeIndex, parseMemorizeJump } from './memorize';

it('converts a valid one-based question number to an index', () => {
  expect(parseMemorizeJump('1', 10)).toEqual({ ok: true, index: 0 });
  expect(parseMemorizeJump('10', 10)).toEqual({ ok: true, index: 9 });
});

it.each(['', '0', '-1', '1.5', 'abc', '11'])(
  'rejects invalid question number %s',
  value => expect(parseMemorizeJump(value, 10)).toEqual({ ok: false })
);

it('rejects jumps when the queue is empty', () => {
  expect(parseMemorizeJump('1', 0)).toEqual({ ok: false });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- src/features/memorize/memorize.test.ts`

Expected: FAIL because `parseMemorizeJump` is not exported.

- [ ] **Step 3: Implement the minimal parser**

Add to `src/features/memorize/memorize.ts`:

```ts
export type MemorizeJumpResult = { ok: true; index: number } | { ok: false };

export const parseMemorizeJump = (value: string, length: number): MemorizeJumpResult => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const questionNumber = Number(trimmed);
  if (!Number.isSafeInteger(questionNumber) || questionNumber < 1 || questionNumber > length) {
    return { ok: false };
  }
  return { ok: true, index: questionNumber - 1 };
};
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm.cmd test -- src/features/memorize/memorize.test.ts`

Expected: all memorize helper tests pass.

### Task 2: Add jump controls and state synchronization

**Files:**
- Modify: `src/App.tsx` in the `Memorize` component and memorize-helper import

- [ ] **Step 1: Import the parser and add local jump state**

Extend the memorize import with `parseMemorizeJump`. Inside `Memorize`, add:

```tsx
const [jumpValue, setJumpValue] = useState('1');
const [jumpError, setJumpError] = useState('');
```

- [ ] **Step 2: Centralize successful index changes**

Use a single synchronization helper for button, keyboard, category, and direct jumps:

```tsx
const goToIndex = (nextIndex: number) => {
  const next = clampMemorizeIndex(nextIndex, queue.length);
  setIndex(next);
  setJumpValue(queue.length ? String(next + 1) : '');
  setJumpError('');
};

const move = (delta: number) => goToIndex(safeIndex + delta);

const jump = () => {
  const result = parseMemorizeJump(jumpValue, queue.length);
  if (!result.ok) {
    setJumpError(`请输入 1～${queue.length} 的整数`);
    return;
  }
  goToIndex(result.index);
};
```

On category change, set the category and reset the index/input/error to question 1. When `q` finishes loading and the queue becomes non-empty, ensure the displayed input becomes `1` without changing persistence.

- [ ] **Step 3: Render accessible controls**

Add this control group beside the category selector:

```tsx
<div className="memorize-jump">
  <label htmlFor="memorize-question-number">跳到第几题</label>
  <div className="memorize-jump-row">
    <input
      id="memorize-question-number"
      type="number"
      inputMode="numeric"
      min={1}
      max={queue.length || 1}
      step={1}
      value={jumpValue}
      disabled={!queue.length}
      aria-invalid={Boolean(jumpError)}
      aria-describedby={jumpError ? 'memorize-jump-error' : undefined}
      onChange={event => setJumpValue(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') jump();
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.stopPropagation();
      }}
    />
    <button className="button" disabled={!queue.length} onClick={jump}>跳转</button>
  </div>
  {jumpError && <small id="memorize-jump-error" className="field-error">{jumpError}</small>}
</div>
```

The global left/right handler must ignore events originating from `INPUT`, `SELECT`, `TEXTAREA`, or `BUTTON` elements so form controls keep their native keyboard behavior.

- [ ] **Step 4: Verify behavior locally through component logic review**

Confirm all paths call `goToIndex`: previous, next, global arrow keys, valid direct jump, and category reset. Confirm invalid direct input only sets `jumpError` and never changes `index`.

### Task 3: Responsive styling

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add jump-control styles**

Add:

```css
.memorize-jump{display:grid;gap:6px;min-width:230px}
.memorize-jump>label{font-size:13px;font-weight:700}
.memorize-jump-row{display:flex;gap:8px}
.memorize-jump-row input{width:110px}
.memorize-jump-row .button{min-width:76px}
.field-error{color:var(--red);font-size:12px}
```

- [ ] **Step 2: Add the 700px mobile layout**

Within the existing mobile media rule, ensure:

```css
.memorize-jump{width:100%;min-width:0}
.memorize-jump-row{width:100%}
.memorize-jump-row input{min-width:0;flex:1}
.memorize-jump-row .button{min-width:88px}
```

The combined control must remain within the viewport at 375px and every interactive control must be at least 44px high.

### Task 4: Full verification and product handoff

**Files:**
- Verify: `src/App.tsx`
- Verify: `src/styles.css`
- Verify: `src/features/memorize/memorize.ts`
- Verify: `src/features/memorize/memorize.test.ts`
- Include: `docs/superpowers/specs/2026-07-05-memorize-jump-design.md`
- Include: `docs/superpowers/plans/2026-07-05-memorize-jump.md`

- [ ] **Step 1: Run all unit tests**

Run: `npm.cmd test`

Expected: all suites and tests pass, including valid and invalid jump parsing.

- [ ] **Step 2: Validate data**

Run: `npm.cmd run validate:data`

Expected: `题库校验通过`.

- [ ] **Step 3: Build production assets**

Run: `npm.cmd run build`

Expected: Vite exits successfully.

- [ ] **Step 4: Verify interactions**

Check all eight acceptance criteria in `docs/superpowers/specs/2026-07-05-memorize-jump-design.md`, including a 375px no-overflow check. If browser automation is unavailable, report that limitation rather than claiming the check passed.

- [ ] **Step 5: Protect unrelated user changes**

Run: `git status --short`, `git diff --check`, and inspect the staged file list. Do not stage `tsconfig.json` or `.claude/`.

- [ ] **Step 6: Report to product for acceptance**

Do not commit implementation before product acceptance. Report changed files, test/build evidence, interaction evidence, and any limitations to the product thread.

- [ ] **Step 7: Commit and push after product acceptance**

After acceptance, stage only the approved scope, commit with `feat: add memorize question jump`, push normally to `origin/main`, then verify local `HEAD`, upstream, and GitHub `refs/heads/main` are identical. Never force-push.

