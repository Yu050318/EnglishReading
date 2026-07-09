# Inline Subject Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the “切换科目” home link on feature pages with an inline subject menu that switches subjects while keeping the user on the current page.

**Architecture:** Add a small reusable subject switcher component/helper that reads the current route and writes the selected `subject` query parameter. Use it anywhere the app currently renders “当前科目：X · 切换科目”. Keep data, scoring, Supabase, and Vercel behavior unchanged.

**Tech Stack:** Existing React + Vite + TypeScript app, React Router HashRouter, existing subject helpers.

## Global Constraints

- Product spec: `docs/superpowers/specs/2026-07-09-inline-subject-switcher.md`.
- Do not change question data or extraction scripts.
- Do not change Supabase schema/RPC/env.
- Do not commit `.env*`, `.vercel/`, `.claude/`, or task-outside dirty files.
- Preserve mobile layout; 375px must not overflow horizontally.
- Product acceptance is required before commit/push/deploy.

---

## Task 1: Add subject switch URL helper

**Files:**
- Modify or create: `src/data/subjects.ts` or a small route helper file.
- Test: `src/data/subjects.test.ts` or a new focused test.

**Interface:**

Create a helper equivalent to:

```ts
export function subjectSearch(currentSearch: string, subject: SubjectId): string
```

Behavior:

- Preserves unrelated query params.
- Sets `subject` to selected subject.
- Returns a search string suitable for a `<NavLink to={{ search }}>` or string URL.

- [ ] Step 1: Write failing tests.

Cases:

```ts
expect(subjectSearch('?subject=english&foo=1', 'human_resources')).toBe('?subject=human_resources&foo=1');
expect(subjectSearch('', 'english')).toBe('?subject=english');
```

- [ ] Step 2: Implement helper with `URLSearchParams`.

- [ ] Step 3: Run focused tests.

```bash
npm.cmd test -- src/data/subjects.test.ts
```

## Task 2: Replace current subject link with inline menu

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Behavior:**

- Replace text `当前科目：{subjectLabel[subject]} · <NavLink to="/">切换科目</NavLink>` with an inline menu.
- Render:
  - label `当前科目：`
  - button/link for `英语`
  - button/link for `人力资源`
- Current subject has selected style and `aria-current` or equivalent.
- Clicking a subject keeps the current route path and changes only `subject`.
- Do not remove homepage subject cards.

- [ ] Step 1: Add failing text/static test if existing test pattern supports it, or add a helper test for URL generation from Task 1.

- [ ] Step 2: Implement minimal component, for example:

```tsx
function SubjectSwitcher({ subject }: { subject: SubjectId }) {
  const location = useLocation();
  return (
    <div className="subject-switcher">
      <span>当前科目：</span>
      {subjectOrder.map((item) => (
        <NavLink
          key={item}
          to={{ pathname: location.pathname, search: subjectSearch(location.search, item) }}
          className={item === subject ? 'active' : undefined}
          aria-current={item === subject ? 'true' : undefined}
        >
          {subjectLabel[item]}
        </NavLink>
      ))}
    </div>
  );
}
```

Adapt exact syntax to current React Router version and code style.

- [ ] Step 3: Use `SubjectSwitcher` in all feature pages that show current subject.

- [ ] Step 4: Add CSS:

```css
.subject-switcher {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .5rem;
}
.subject-switcher a {
  min-height: 36px;
  padding: .35rem .75rem;
  border: 1px solid var(--line);
}
.subject-switcher a.active {
  border-color: var(--gold);
  background: rgba(214, 171, 70, .14);
}
```

Use existing CSS variables/classes if names differ.

## Task 3: Verify route-specific behavior

**Files:**
- Tests if practical: route/helper tests.
- No data changes.

- [ ] Step 1: Verify mistakes route.

Expected:

- From `#/mistakes?subject=english`, subject menu link for HR points to `#/mistakes?subject=human_resources`.

- [ ] Step 2: Verify memorize route.

Expected:

- From `#/memorize?subject=english`, HR link points to `#/memorize?subject=human_resources`.
- Memorize queue resets naturally based on subject.

- [ ] Step 3: Verify practice behavior.

Expected:

- Practice setup keeps route and changes subject.
- If switching while in active practice causes state ambiguity, reset to setup for the new subject rather than mixing queues.

## Task 4: Full verification and product report

Run:

```bash
npm.cmd run validate:data
npm.cmd test
npm.cmd run build
git diff --check
```

Browser verification if possible:

- Mobile 375px open `/#/mistakes?subject=english`.
- Confirm no “切换科目” link.
- Confirm inline menu shows 英语/人力资源.
- Tap 人力资源 and confirm still on mistakes page.
- Open `/#/memorize?subject=english`, tap 人力资源, confirm still on memorize and HR content loads.
- Confirm no horizontal overflow.

Report to Product before commit/push:

- Modified files.
- Verification results.
- Browser status.
- Dirty files excluded.
- Whether `MEMORY.md` was updated.

## Task 5: Commit, push, deploy after Product acceptance

After Product acceptance:

- Re-run verification.
- Stage exact task files only.
- Commit suggested message:

```bash
git commit -m "fix: add inline subject switcher"
```

- Push to `origin/main`.
- Wait for Vercel production deployment.
- Online smoke:
  - Production URL 200.
  - `/#/mistakes?subject=english` has inline subject menu.
  - Switching to HR keeps the route.
  - 375px no horizontal overflow.

## Self-review

- Scope is limited to subject switching UI.
- No data, Supabase, or extraction behavior changes.
- Mobile behavior is explicitly verified.
