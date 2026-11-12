import type * as NativeCore from '@markuplint/core';

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { cli } from './bootstrap.js';
import { command } from './command.js';

// The native addon, wrapped so that the nodes it is asked to describe can be counted.
const nodeListHtml = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@markuplint/core', async importOriginal => {
	const mod = await importOriginal<typeof NativeCore>();
	return {
		...mod,
		nodeListHtml: (...args: Parameters<typeof mod.nodeListHtml>) => {
			nodeListHtml.calls++;
			return mod.nodeListHtml(...args);
		},
	};
});

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function' && typeof mod.nodeListHtml === 'function',
	() => false,
);

const targetFile = path.resolve(import.meta.dirname, '../../test/suppressions/target.html');

describe.skipIf(!nativeAddonIsBuilt)('command: scoped suppressions on the Rust engine', { timeout: 30_000 }, () => {
	let tmpDir: string;
	let suppressionsFile: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-command-rust-test-'));
		suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');
		nodeListHtml.calls = 0;
		vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	const run = (files: readonly string[], flags: Record<string, unknown>) =>
		command([...files], {
			...cli.flags,
			format: 'json',
			searchConfig: false,
			suppressionsLocation: suppressionsFile,
			...flags,
		} as Parameters<typeof command>[1]);

	const reported = () => {
		const written = vi.mocked(process.stdout.write).mock.calls.map(([chunk]) => String(chunk));
		// A run that suppresses everything prints nothing.
		const violations = (written.length > 0 ? JSON.parse(written.join('')) : []) as {
			ruleId: string;
			line: number;
			col: number;
		}[];
		return violations.map(v => `${v.ruleId} ${v.line}:${v.col}`).toSorted();
	};

	/** What a run of an engine leaves: the violations it printed, and the suppressions file it wrote. */
	const runWith = async (files: readonly string[], flags: Record<string, unknown>, rust: boolean) => {
		vi.mocked(process.stdout.write).mockClear();
		await run(files, { ...flags, experimentalRustCore: rust });
		const written = await fs.readFile(suppressionsFile, 'utf8').catch(() => null);
		return { reported: reported(), suppressions: written && (JSON.parse(written) as unknown) };
	};

	test('[command-rust-001] a run that reads no node does not ask the engine to describe any', async () => {
		await run([targetFile], { experimentalRustCore: true });
		expect(nodeListHtml.calls).toBe(0);
	});

	test('[command-rust-002] --suppress asks for the nodes of the file once', async () => {
		await run([targetFile], { experimentalRustCore: true, suppress: true });
		expect(nodeListHtml.calls).toBe(1);
	});

	// `mergeSuppressions` keeps only the count of an entry, so the scope that `generateSuppressions`
	// computes from the nodes is not what reaches the file; what the engines are compared on is the
	// file that results.
	test('[command-rust-003] --suppress writes the file that the TypeScript engine writes', async () => {
		const file = path.join(tmpDir, 'scoped.html');
		await fs.writeFile(
			file,
			'<main><section id="s" class="x y"><center></center><div><center></center></div></section><p>t</p></main>\n',
			'utf8',
		);
		const config = path.join(tmpDir, 'config.json');
		await fs.writeFile(config, JSON.stringify({ rules: { 'no-obsolete-element': { severity: 'error' } } }), 'utf8');

		const typescript = await runWith([file], { suppress: true, config }, false);
		await fs.rm(suppressionsFile, { force: true });
		const rust = await runWith([file], { suppress: true, config }, true);

		expect(typescript.suppressions).toStrictEqual({ 'scoped.html': { 'no-obsolete-element': { count: 2 } } });
		expect(rust.suppressions).toStrictEqual(typescript.suppressions);
	});

	test('[command-rust-004] an entry with a scope suppresses what the TypeScript engine suppresses', async () => {
		const file = path.join(tmpDir, 'scoped.html');
		// Without the scope the entry would suppress the first violation of the file, which is not in `#a`.
		await fs.writeFile(file, '<center></center><div id="a"><center></center></div>\n', 'utf8');
		const relative = path.relative(tmpDir, file).split(path.sep).join('/');
		const config = path.join(tmpDir, 'config.json');
		await fs.writeFile(config, JSON.stringify({ rules: { 'no-obsolete-element': { severity: 'error' } } }), 'utf8');
		await fs.writeFile(
			suppressionsFile,
			JSON.stringify({ [relative]: { 'no-obsolete-element': { count: 1, scope: '#a' } } }),
			'utf8',
		);

		const typescript = await runWith([file], { config }, false);
		const rust = await runWith([file], { config }, true);

		// The `<center>` outside of `#a` is not covered by the entry.
		expect(typescript.reported).toStrictEqual(['no-obsolete-element 1:1']);
		expect(rust.reported).toStrictEqual(typescript.reported);
	});

	test('[command-rust-005] with --fix, an entry scope is resolved against the fixed code', async () => {
		const config = path.join(tmpDir, 'fix.json');
		await fs.writeFile(
			config,
			JSON.stringify({ rules: { 'attr-value-quotes': true, 'no-obsolete-element': { severity: 'error' } } }),
			'utf8',
		);
		// Fixing `class=c` to `class="c"` moves `<center>` two columns to the right.
		const file = path.join(tmpDir, 'scoped.html');
		await fs.writeFile(file, '<div class=c></div><center></center>\n', 'utf8');
		await fs.writeFile(
			suppressionsFile,
			JSON.stringify({
				[path.relative(tmpDir, file).split(path.sep).join('/')]: {
					'no-obsolete-element': { count: 1, scope: 'center' },
				},
			}),
			'utf8',
		);

		expect(await run([file], { config, fix: true, experimentalRustCore: true })).toBe(false);
		expect(
			vi
				.mocked(process.stderr.write)
				.mock.calls.map(([chunk]) => String(chunk))
				.join(''),
		).not.toContain('unused suppression');
	});
});
