import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { isCliEntry } from './entry.ts';

describe('isCliEntry', () => {
	let dir = '';
	let module = '';
	const argv1 = process.argv[1];

	beforeEach(() => {
		// The real path, as `import.meta.url` has it: on macOS `tmpdir()` is itself behind a link.
		dir = realpathSync(mkdtempSync(join(tmpdir(), 'spec-citations-entry-')));
		mkdirSync(join(dir, 'real'));
		module = join(dir, 'real', 'module.ts');
		writeFileSync(module, '');
	});

	afterEach(() => {
		process.argv[1] = argv1 as string;
		rmSync(dir, { recursive: true, force: true });
	});

	test('[entry-001] is true for the file that node was started with', () => {
		process.argv[1] = module;
		expect(isCliEntry(pathToFileURL(module).href)).toBe(true);
	});

	test('[entry-002] is false for another module', () => {
		process.argv[1] = module;
		expect(isCliEntry(pathToFileURL(join(dir, 'real', 'other.ts')).href)).toBe(false);
	});

	test('[entry-003] is false when there is no entry file (`node -e`)', () => {
		process.argv.length = 1;
		expect(isCliEntry(pathToFileURL(module).href)).toBe(false);
	});

	test('[entry-004] is true when the entry file is reached through a symbolic link, which `import.meta.url` resolves', () => {
		symlinkSync(join(dir, 'real'), join(dir, 'link'), 'junction');
		process.argv[1] = join(dir, 'link', 'module.ts');
		expect(isCliEntry(pathToFileURL(module).href)).toBe(true);
	});
});
