import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('human resources DOCX extraction', () => {
  it('parses objective and short-answer sections', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hr-extraction-'));
    const docx = join(dir, '人力期中考核总复习_修正版答案解析.docx');
    const root = resolve(import.meta.dirname, '../..');
    const sample = [
      '人力期中考核总复习：修正版答案解析',
      '一、单项选择题',
      '1. 工作分析后形成的成果性文件是（ ）。',
      'A. 招聘计划',
      'B. 职位说明书',
      'C. 薪酬表',
      'D. 考勤记录',
      '答案：B',
      '解析：工作分析最终会形成职位说明书等成果。',
      '二、不定项选择题',
      '案例（一）：某公司因职位说明书长期未更新，岗位职责边界模糊。',
      '案例（一）-2. 聘请外部咨询机构开展工作分析的优点包括（ ）。',
      'A. 成本一定最低',
      'B. 专业性较强',
      'C. 完全不需要企业参与',
      'D. 视角相对客观',
      '答案：BD',
      '解析：外部咨询机构通常专业性较强，视角相对客观。',
      '三、计算题',
      '1. 某企业年计划产量为250件，人均年产量为4件，计算所需人数。',
      '答案：效率不变：约63人；效率提高20%：约53人。',
      '解析：250/4=62.5，向上取整约63人。',
      '四、案例分析题',
      '某公司多年未更新岗位资料。',
      '1. 说明废弃工作分析可能带来的影响。',
      '参考答案：废弃工作分析会使岗位职责不清，影响招聘、培训和绩效管理。',
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
      const records = JSON.parse(output);

      expect(records).toHaveLength(4);
      expect(records[0].type).toBe('single_choice');
      expect(records[0].subject).toBe('human_resources');
      expect(records[0].answer).toEqual(['B']);
      expect(records[0].explanation).toContain('工作分析');
      expect(records[1].type).toBe('multiple_choice');
      expect(records[1].answer).toEqual(['B', 'D']);
      expect(records[2].type).toBe('short_answer');
      expect(records[2].answerText).toContain('效率不变');
      expect(records[2].explanation).toContain('250');
      expect(records[3].type).toBe('short_answer');
      expect(records[3].answerText).toContain('岗位职责');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
