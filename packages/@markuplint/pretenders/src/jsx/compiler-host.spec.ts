import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { createCachingCompilerHost, clearSourceFileCache } from './compiler-host.js';

describe('createCachingCompilerHost', () => {
	let tmpDir: string;
	let filePath: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'compiler-host-cache-'));
		filePath = path.join(tmpDir, 'Component.tsx');
		await writeFile(filePath, 'export const A = () => <div>x</div>;');
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
		clearSourceFileCache();
	});

	test('returns the same SourceFile instance when the file content is unchanged', () => {
		const host = createCachingCompilerHost({});
		const first = host.getSourceFile(filePath, ts.ScriptTarget.Latest);
		const second = host.getSourceFile(filePath, ts.ScriptTarget.Latest);
		expect(second).toBe(first);
	});

	test('reparses (new instance) once the file content changes', async () => {
		const host = createCachingCompilerHost({});
		const before = host.getSourceFile(filePath, ts.ScriptTarget.Latest);

		await writeFile(filePath, 'export const A = () => <span>x</span>;');
		const after = host.getSourceFile(filePath, ts.ScriptTarget.Latest);

		expect(after).not.toBe(before);
		expect(after?.text).toContain('span');
	});

	test('a fresh host still reuses the module-level cache across instances', () => {
		const first = createCachingCompilerHost({}).getSourceFile(filePath, ts.ScriptTarget.Latest);
		const second = createCachingCompilerHost({}).getSourceFile(filePath, ts.ScriptTarget.Latest);
		expect(second).toBe(first);
	});

	test('clearSourceFileCache forces a reparse even when content is unchanged', () => {
		const host = createCachingCompilerHost({});
		const before = host.getSourceFile(filePath, ts.ScriptTarget.Latest);

		clearSourceFileCache();
		const after = host.getSourceFile(filePath, ts.ScriptTarget.Latest);

		expect(after).not.toBe(before);
		expect(after?.text).toBe(before?.text);
	});
});
