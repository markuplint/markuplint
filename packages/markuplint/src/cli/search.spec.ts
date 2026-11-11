import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

/**
 * A line of the output is `file:line:col`, and a file path may hold a colon (a drive letter), so it
 * is read from the end. The file is compared by its name, as the temporary directory of a runner may
 * be spelled in more than one way.
 *
 * @param output - One line of the output
 * @returns The name of the file, the line and the column
 */
function parseLocation(output: string) {
	const [col, line, ...file] = output.split(':').toReversed();
	return { file: path.basename(file.toReversed().join(':')), line: Number(line), col: Number(col) };
}

describe('--search', { timeout: 30_000 }, () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-search-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	test('[search-tree-001] finds an element in the content of a template and in a declarative shadow root', async () => {
		const target = path.join(tmpDir, 'target.html');
		await fs.writeFile(
			target,
			[
				'<p>a</p>',
				'<template><p>b</p></template>',
				'<div><template shadowrootmode="open"><p>c</p></template></div>',
				'',
			].join('\n'),
		);

		const { stdout, exitCode } = await execa(entryFilePath, ['--no-search-config', '--search', 'p', target], {
			reject: false,
		});

		expect(exitCode).toBe(0);
		expect(stdout.split('\n').map(line => parseLocation(line))).toStrictEqual([
			{ file: 'target.html', line: 1, col: 1 },
			{ file: 'target.html', line: 2, col: 11 },
			{ file: 'target.html', line: 3, col: 38 },
		]);
	});
});
