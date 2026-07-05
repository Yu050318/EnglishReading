# Question Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the supplied DOCX/OCR sources into validated, reviewable, deduplicated question JSON and a conversion quality report.

**Architecture:** A small TypeScript data core owns normalization, fingerprints, schema validation, deduplication, and reporting. A Python extraction script reads DOCX/OCR source formats and emits raw JSON; the TypeScript converter validates and publishes deterministic artifacts.

**Tech Stack:** Node.js, TypeScript, Vitest, Zod, Python 3, python-docx

---

### Task 1: Project and schema

**Files:** `package.json`, `tsconfig.json`, `src/data/questionSchema.ts`, `src/data/questionSchema.test.ts`

- [ ] Write failing schema tests for valid records, duplicate IDs, empty questions, duplicate option keys, missing answer keys, and multi-answer single choice.
- [ ] Run the tests and confirm they fail because the schema module is absent.
- [ ] Implement the question types and collection validator with structured Chinese diagnostics.
- [ ] Run the schema tests and confirm they pass.

### Task 2: Fingerprints and deduplication

**Files:** `src/data/fingerprint.ts`, `src/data/fingerprint.test.ts`, `src/data/deduplicate.ts`, `src/data/deduplicate.test.ts`

- [ ] Write failing tests for whitespace/case normalization and deterministic SHA-256 fingerprints.
- [ ] Implement normalization and fingerprinting, then make the tests pass.
- [ ] Write failing tests for exact merges, source union, answer conflicts, and conservative similarity candidates.
- [ ] Implement deduplication and conflict reporting, then make the tests pass.

### Task 3: Source extraction

**Files:** `scripts/extract_questions.py`, `tests/fixtures/structured-sample.json`

- [ ] Add a fixture-based failing test that specifies structured DOCX paragraph parsing and conservative OCR candidate parsing.
- [ ] Implement extraction using `python-docx` and the existing `tmp/ocr` files without modifying source documents.
- [ ] Run extraction tests and inspect rejected OCR diagnostics.

### Task 4: Conversion and artifacts

**Files:** `scripts/convert.ts`, `src/data/conversion.ts`, `src/data/conversion.test.ts`, `data/*.json`, `public/questions.json`

- [ ] Write a failing conversion test for raw, review, public, and report output rules.
- [ ] Implement conversion, validation, publication filtering, and report aggregation.
- [ ] Run all unit tests and the real conversion command.
- [ ] Validate the generated public collection and record source/review/conflict totals.

### Task 5: Phase-one handoff

- [ ] Send totals, data caveats, test evidence, and the proposed quality gate to the product thread.
- [ ] Wait for product approval before starting React application implementation.
