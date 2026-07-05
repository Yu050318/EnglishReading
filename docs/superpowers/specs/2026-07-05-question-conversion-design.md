# Question Conversion Design

## Scope

This phase converts the three structured test documents and the OCR intermediates behind `英语阅读题库.docx` into a validated question dataset. It does not implement the React application.

## Pipeline

1. Parse the three structured test DOCX files first. Their numbered question, A-D option, and marked-answer paragraphs are authoritative.
2. Parse OCR page text conservatively. A candidate is emitted only when a question, complete option set, and explicit correct-answer text can be identified. OCR-only records remain `needs_review` unless their answer maps unambiguously to exactly one option.
3. Normalize question and option text, compute SHA-256 fingerprints, merge exact duplicates, and flag answer conflicts.
4. Generate similarity candidates for human review; only exact fingerprints and extremely close records with identical normalized options are auto-merged.
5. Validate every record. Publish only complete `verified` questions to `public/questions.json`; retain uncertain records in `data/questions.review.json`.

## Outputs

- `data/questions.raw.json`: all parsed source records before deduplication.
- `data/questions.review.json`: merged records including `needs_review` items.
- `public/questions.json`: practice-safe verified records only.
- `data/conversion-report.json`: source counts, deduplication counts, review counts, published counts, conflicts, invalid records, and similarity candidates.

## Stable identity

Each question receives an ID derived from its first observed canonical fingerprint. The converter accepts a previous review file as an ID registry so editorial text changes can retain the old ID when explicitly matched during review.

## Failure behavior

Malformed OCR pages are reported and skipped rather than guessed. Schema violations fail the conversion command before publication.

## Testing

Unit tests cover normalization, fingerprint stability, schema rules, exact deduplication, answer conflicts, and publication filtering. A conversion smoke test checks that all four JSON artifacts are created and the published dataset validates.
