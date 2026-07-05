import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateQuestionCollection } from '../src/data/questionSchema';

const path = resolve(import.meta.dirname, '../public/questions.json');
const result = validateQuestionCollection(JSON.parse(await readFile(path, 'utf8')));
if (!result.ok) { console.error(result.errors.join('\n')); process.exit(1); }
console.log('题库校验通过');
