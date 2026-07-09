import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('English review DOCX extraction', () => {
  it('parses phrase blanks, two-choice items, and passage cloze blanks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'english-review-extraction-'));
    const docx = join(dir, '英语复习.docx');
    const root = resolve(import.meta.dirname, '../..');
    const sample = [
      '英语复习',
      '第一部分',
      '1. They must be joking. That really is not a very _____.',
      '2. The CEO stood up to _____ and outlined the plans for the next financial year.',
      'realistic demand',
      'address the meeting',
      '1. The company needs to look at ways of ______(improving / progressing)',
      "employees' understanding of the decisions it makes.",
      'Improving',
      '第二部分',
      'A  accurate  B  admirable  C  generate  D  artistic',
      'E  strive  F  decisive  G  definitely  H  aptitude',
      'I  indication  J  intensely  K  numerous  L  freshman',
      'M  occupation  N  unacceptable  O  Undergraduate',
      'I gave _(1)_ answers, but I had no real idea what _(2)_ career I would end up in.',
      '1—5 KMOHI',
    ];

    try {
      execFileSync('python', [
        '-c',
        [
          'from docx import Document',
          'import sys',
          'doc = Document()',
          '[doc.add_paragraph(line) for line in sys.argv[2:]]',
          'doc.save(sys.argv[1])',
        ].join('; '),
        docx,
        ...sample,
      ]);

      const output = execFileSync('python', [
        '-c',
        [
          'import json, sys',
          'from pathlib import Path',
          `sys.path.insert(0, ${JSON.stringify(root)})`,
          'from scripts.extract_questions import parse_document',
          'print(json.dumps(parse_document(Path(sys.argv[1])), ensure_ascii=False))',
        ].join('; '),
        docx,
      ], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } });
      const records = JSON.parse(output);

      const phrase = records.find((record: { source: string[] }) => record.source[0].endsWith('#part1-phrase-2'));
      expect(phrase.subject).toBe('english');
      expect(phrase.category).toBe('english_review');
      expect(phrase.type).toBe('single_choice');
      expect(phrase.options.map((option: { text: string }) => option.text)).toContain('address the meeting');
      expect(phrase.options.find((option: { key: string }) => option.key === phrase.answer[0]).text).toBe('address the meeting');

      const twoChoice = records.find((record: { source: string[] }) => record.source[0].endsWith('#part1-choice-1'));
      expect(twoChoice.type).toBe('single_choice');
      expect(twoChoice.options).toEqual([
        { key: 'A', text: 'improving' },
        { key: 'B', text: 'progressing' },
      ]);
      expect(twoChoice.answer).toEqual(['A']);

      const cloze = records.find((record: { source: string[] }) => record.source[0].endsWith('#part2-passage1-blank1'));
      expect(cloze.type).toBe('single_choice');
      expect(cloze.options).toContainEqual({ key: 'K', text: 'numerous' });
      expect(cloze.answer).toEqual(['K']);
      expect(cloze.question).toContain('blank (1)');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
