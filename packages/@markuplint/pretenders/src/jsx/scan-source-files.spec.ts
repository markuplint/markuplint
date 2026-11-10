import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { normalizePath } from '../import-resolver/resolve-module-file.js';

import { readScanSourceFiles, clearSourceFileCache } from './scan-source-files.js';

describe('readScanSourceFiles', () => {
	let tmpDir: string;
	let filePath: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'scan-source-files-'));
		filePath = path.join(tmpDir, 'Component.tsx');
		await writeFile(filePath, 'export const A = () => <div>x</div>;');
	});

	function scan(sources?: ReadonlyMap<string, string>) {
		return readScanSourceFiles([filePath], { noLib: true, types: [] }, sources).find(
			sourceFile => normalizePath(sourceFile.fileName) === normalizePath(filePath),
		);
	}

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
		clearSourceFileCache();
	});

	test('returns the same SourceFile instance when the file content is unchanged', () => {
		const first = scan();
		const second = scan();
		expect(second).toBe(first);
	});

	test('reads the new text once the file content changes', async () => {
		expect(scan()?.text).toContain('div');

		await writeFile(filePath, 'export const A = () => <span>x</span>;');

		expect(scan()?.text).toContain('span');
	});

	test('reads the in-memory content in place of the file on disk', () => {
		const sources = new Map([[normalizePath(filePath), 'export const A = () => <span>x</span>;']]);

		expect(scan(sources)?.text).toContain('span');
		expect(scan()?.text).toContain('div');
	});

	test('clearSourceFileCache keeps the content that is read when it is unchanged', () => {
		const before = scan();

		clearSourceFileCache();
		const after = scan();

		expect(after?.text).toBe(before?.text);
	});
});
