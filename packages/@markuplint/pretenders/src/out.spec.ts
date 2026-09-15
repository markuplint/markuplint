import type { Pretender } from '@markuplint/ml-config';

import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, test, expect } from 'vitest';

import { out } from './out.js';

let tmpDir: string;

beforeEach(async () => {
	tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-out-'));
});

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

describe('out', () => {
	test('rebases filePath to be relative to the output file location, not the scan cwd', async () => {
		// Scan was run from `cwd`, so filePath is relative to it: `components/Button.tsx:1:6`.
		// The output JSON is written one directory below `cwd` (`dist/pretenders.json`),
		// so a consumer resolving filePath relative to the JSON's own location needs
		// `../components/Button.tsx:1:6`, not the scan-time-relative path.
		const cwd = path.join(tmpDir, 'project');
		const outFile = path.join(cwd, 'dist', 'pretenders.json');
		const data: Pretender[] = [{ selector: 'Button', as: 'button', filePath: 'components/Button.tsx:1:6' }];

		await mkdir(path.dirname(outFile), { recursive: true });
		await out(outFile, data, cwd);

		const written = JSON.parse(await readFile(outFile, 'utf8'));
		expect(written.data).toStrictEqual([
			{ selector: 'Button', as: 'button', filePath: '../components/Button.tsx:1:6' },
		]);
	});

	test('defaults to process.cwd() when no cwd is given (backward compat)', async () => {
		const outFile = path.join(tmpDir, 'pretenders.json');
		const data: Pretender[] = [{ selector: 'Button', as: 'button' }];

		await out(outFile, data);

		const written = JSON.parse(await readFile(outFile, 'utf8'));
		expect(written.data).toStrictEqual([{ selector: 'Button', as: 'button' }]);
	});

	test('leaves entries without a filePath untouched', async () => {
		const outFile = path.join(tmpDir, 'pretenders.json');
		const data: Pretender[] = [{ selector: 'Button', as: 'button' }];

		await out(outFile, data, tmpDir);

		const written = JSON.parse(await readFile(outFile, 'utf8'));
		expect(written.data).toStrictEqual([{ selector: 'Button', as: 'button' }]);
	});

	test('writes the package version', async () => {
		const outFile = path.join(tmpDir, 'pretenders.json');

		await out(outFile, []);

		const written = JSON.parse(await readFile(outFile, 'utf8'));
		expect(typeof written.version).toBe('string');
		expect(written.version.length).toBeGreaterThan(0);
	});
});
