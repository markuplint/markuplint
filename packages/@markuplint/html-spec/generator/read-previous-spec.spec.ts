import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { readPreviousSpec } from './index.ts';

let dir: string;

beforeAll(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'ml-html-spec-prev-'));
});

afterAll(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe('readPreviousSpec', () => {
	test('returns the parsed spec when the file exists and is valid JSON', async () => {
		const file = path.join(dir, 'valid.json');
		writeFileSync(file, JSON.stringify({ cites: ['x'], specs: [{ name: 'div' }] }));
		const result = await readPreviousSpec(file);
		expect(result).toStrictEqual({ cites: ['x'], specs: [{ name: 'div' }] });
	});

	test('returns null without warning when the file does not exist (first generation)', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = await readPreviousSpec(path.join(dir, 'does-not-exist.json'));
		expect(result).toBeNull();
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	test('warns and returns null when the file exists but is not valid JSON', async () => {
		const file = path.join(dir, 'broken.json');
		writeFileSync(file, '{ this is not valid json');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = await readPreviousSpec(file);
		expect(result).toBeNull();
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[0]).toContain('Could not parse the previous spec');
		warn.mockRestore();
	});
});
