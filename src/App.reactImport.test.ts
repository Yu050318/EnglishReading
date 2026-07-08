import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('App imports React default for production JSX compatibility', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8');

  expect(appSource).toMatch(/import\s+React\s*,\s*\{/);
});
