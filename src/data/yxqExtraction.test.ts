import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('yxq DOCX extraction', () => {
  it('parses numbered vocabulary items with separated answer lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'yxq-extraction-'));
    const docx = join(dir, 'yxq英语题库.docx');
    const root = resolve(import.meta.dirname, '../..');
    const sample = [
      '1.',
      'When he was 16, Mr. Green went on vacation to Thailand with his parents. That was the ______ that led to him setting up his own travel company.',
      'A. routine',
      'B. concern',
      'C. obstacle',
      'D. spark',
      '答案：D',
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
      ], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
      const [record] = JSON.parse(output);

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
      expect(record.subject).toBe('english');
      expect(record.category).toBe('vocabulary');
      expect(record.reviewStatus).toBe('verified');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
