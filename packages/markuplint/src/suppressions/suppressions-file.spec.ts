import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
	readSuppressionsFile,
	writeSuppressionsFile,
	resolveSuppressionsPath,
	toRelativePath,
	toAbsolutePath,
} from './suppressions-file.js';

describe('suppressions-file', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe('readSuppressionsFile', () => {
		it('returns empty object when file does not exist', async () => {
			const result = await readSuppressionsFile(path.join(tmpDir, 'nonexistent.json'));
			expect(result).toStrictEqual({});
		});

		it('parses a valid JSON file', async () => {
			const data = {
				'src/index.html': {
					'attr-duplication': { count: 3 },
				},
			};
			const filePath = path.join(tmpDir, 'suppressions.json');
			await fs.writeFile(filePath, JSON.stringify(data), 'utf8');

			const result = await readSuppressionsFile(filePath);
			expect(result).toStrictEqual(data);
		});

		it('throws a descriptive error on malformed JSON', async () => {
			const filePath = path.join(tmpDir, 'bad.json');
			await fs.writeFile(filePath, '{invalid json', 'utf8');

			await expect(readSuppressionsFile(filePath)).rejects.toThrow('Failed to parse suppressions file');
		});
	});

	describe('writeSuppressionsFile', () => {
		it('writes sorted JSON with tab indentation', async () => {
			const filePath = path.join(tmpDir, 'out.json');
			const data = {
				'src/b.html': { 'z-rule': { count: 1 } },
				'src/a.html': { 'a-rule': { count: 2 } },
			};

			await writeSuppressionsFile(filePath, data);

			const content = await fs.readFile(filePath, 'utf8');
			const parsed = JSON.parse(content);

			// Keys should be sorted
			const keys = Object.keys(parsed);
			expect(keys).toStrictEqual(['src/a.html', 'src/b.html']);

			// Nested keys should be sorted too
			expect(Object.keys(parsed['src/a.html'])).toStrictEqual(['a-rule']);
		});

		it('deletes the file when data is empty', async () => {
			const filePath = path.join(tmpDir, 'out.json');
			await fs.writeFile(filePath, '{}', 'utf8');

			await writeSuppressionsFile(filePath, {});

			await expect(fs.access(filePath)).rejects.toThrow();
		});
	});

	describe('resolveSuppressionsPath', () => {
		it('defaults to markuplint-suppressions.json in CWD', () => {
			const result = resolveSuppressionsPath();
			expect(result).toBe(path.resolve(process.cwd(), 'markuplint-suppressions.json'));
		});

		it('resolves a relative custom path from CWD', () => {
			const result = resolveSuppressionsPath('custom/path.json');
			expect(result).toBe(path.resolve(process.cwd(), 'custom/path.json'));
		});

		it('passes through an absolute path', () => {
			const absPath = '/absolute/path/suppressions.json';
			const result = resolveSuppressionsPath(absPath);
			expect(result).toBe(absPath);
		});
	});

	describe('toRelativePath / toAbsolutePath', () => {
		it('round-trips correctly', () => {
			// Use path.resolve to get platform-native absolute paths
			const suppressionsPath = path.resolve('/project', 'markuplint-suppressions.json');
			const absFilePath = path.resolve('/project', 'src', 'index.html');

			const rel = toRelativePath(absFilePath, suppressionsPath);
			expect(rel).toBe('src/index.html');

			const abs = toAbsolutePath(rel, suppressionsPath);
			expect(abs).toBe(absFilePath);
		});

		it('uses forward slashes (POSIX)', () => {
			const suppressionsPath = path.resolve('/project', 'markuplint-suppressions.json');
			const absFilePath = path.resolve('/project', 'src', 'deep', 'nested', 'file.html');

			const rel = toRelativePath(absFilePath, suppressionsPath);
			expect(rel).not.toContain('\\');
			expect(rel).toBe('src/deep/nested/file.html');
		});
	});
});
