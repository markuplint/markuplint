// The README is what npm shows, and it carries a copy of `--help`. Nothing else keeps the copy
// in step with `help` in `bootstrap.ts`, so it drifted (a missing option, a stale default).
import fs from 'node:fs/promises';

import { describe, test, expect } from 'vitest';

import { help } from './bootstrap.js';

const README_PATH = new URL('../../README.md', import.meta.url);

describe('README', () => {
	test('the `--help` block is the real help', async () => {
		// A checkout with `core.autocrlf` turns the line feeds of the README into CRLF.
		const readme = (await fs.readFile(README_PATH, 'utf8')).replaceAll('\r\n', '\n');
		const [, block] = /\$ npx markuplint --help\n\n([\s\S]*?)\n```/.exec(readme) ?? [];
		expect(block).toBeDefined();
		expect(block!.trim()).toBe(help.trim());
	});
});
