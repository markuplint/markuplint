import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function' && typeof mod.searchHtml === 'function',
	() => false,
);

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

const escape = (value: string) => value.replaceAll('\\', '\\\\'); // For Windows

/**
 * A line of the output is `file:line:col`, and a file path may hold a colon (a drive letter), so it
 * is read from the end. The file is named by its base name, as the temporary directory of a runner
 * may be spelled in more than one way.
 *
 * @param stdout - The output of `--search`
 * @returns `file:line:col` of each line, the file by its base name
 */
const located = (stdout: string) =>
	stdout
		.split('\n')
		.filter(line => line !== '')
		.map(line => {
			const [col, row, ...file] = line.split(':').toReversed();
			return `${path.basename(file.toReversed().join(':'))}:${row}:${col}`;
		});

/** `line:col` of each line of the output. */
const places = (stdout: string) => located(stdout).map(location => location.slice(location.indexOf(':') + 1));

/**
 * `markuplint --search` on the Rust engine finds what it finds on the TypeScript engine: each test
 * says what that is, and that the Rust one found the same.
 */
describe.skipIf(!nativeAddonIsBuilt)('--search on the Rust engine', { timeout: 60_000 }, () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-search-rust-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	const write = async (name: string, content: string) => {
		const file = path.join(tmpDir, name);
		await fs.writeFile(file, content);
		return file;
	};

	const run = async (rust: boolean, args: readonly string[]) => {
		const { stdout, stderr, exitCode } = await execa(
			entryFilePath,
			[...args, ...(rust ? ['--experimental-rust-core'] : [])],
			{ reject: false },
		);
		return { stdout, stderr, exitCode };
	};

	/** Runs the same search on both engines, and checks that the Rust one did the search. */
	const both = async (args: readonly string[]) => {
		const expected = await run(false, args);
		const actual = await run(true, args);
		expect(actual.stderr).not.toContain('[experimental-rust-core]');
		return { expected, actual };
	};

	test('[search-rust-001] finds an element in the content of a template and in a declarative shadow root', async () => {
		const target = await write(
			'target.html',
			[
				'<p>a</p>',
				'<template><p>b</p></template>',
				'<div><template shadowrootmode="open"><p>c</p></template></div>',
				'',
			].join('\n'),
		);

		const { expected, actual } = await both(['--no-search-config', '--search', 'p', escape(target)]);

		expect(places(expected.stdout)).toStrictEqual(['1:1', '2:11', '3:38']);
		expect(actual).toStrictEqual(expected);
	});

	test.each([
		[
			'a selector that does not reach out of the content of a template',
			'section p',
			'<section><p></p><template><p></p></template></section>',
			['1:10'],
		],
		['a child combinator in the content of a template', 'template > p', '<template><p></p></template>', []],
		['a relational selector', 'section:has(p)', '<section><template><p></p></template></section>', []],
		['a child relational selector', 'template:has(> p)', '<template><p></p></template>', []],
		['a nested template', 'p', '<template><template><p></p></template><p></p></template>', ['1:21', '1:39']],
		[
			'closest in the content of a template',
			'p:closest(section)',
			'<section><template><p></p></template></section>',
			[],
		],
		['closest', 'p:closest(section)', '<section><div><p></p></div></section>', ['1:15']],
		['a role', ':role(button)', '<div role="button"></div><button></button><a href="/"></a>', ['1:1', '1:26']],
		[
			'a content model category',
			':model(interactive)',
			'<button></button><p></p><a href="/"></a>',
			['1:1', '1:25'],
		],
		['the scope', ':scope > p', '<p></p><div><p></p></div>', ['1:1']],
		['a descendant of the scope', ':scope p', '<p></p><div><p></p></div>', ['1:1', '1:13']],
		['the scope below an element', 'div :scope > p', '<p></p><div><p></p></div>', []],
		['the scope as a sibling', ':scope + p', '<p></p><p></p>', []],
		['the scope twice', ':scope > :scope', '<p></p>', []],
		['an attribute', '[id^="a"]', '<p id="ab"></p><p id="b"></p><span id="a"></span>', ['1:1', '1:30']],
		['no element', 'table', '<p></p>', []],
		['the root of a fragment', ':root', '<p></p><template><html></html></template>', []],
		[
			'the root of a document',
			':root',
			'<!DOCTYPE html><html lang="en"><head><title>t</title></head><body></body></html>',
			['1:16'],
		],
		['a file with a comment only', 'p', '<!-- c -->', []],
	])('[search-rust-002] finds what the TypeScript engine finds for %s', async (_name, selector, html, found) => {
		const target = await write('target.html', html);

		const { expected, actual } = await both(['--no-search-config', '--search', selector, escape(target)]);

		expect(places(expected.stdout)).toStrictEqual(found);
		expect(actual).toStrictEqual(expected);
	});

	test('[search-rust-003] finds an element a pretender stands for', async () => {
		const target = await write('target.html', '<MyButton>x</MyButton><p></p>');
		const config = await write(
			'.markuplintrc',
			JSON.stringify({ pretenders: [{ selector: 'MyButton', as: { element: 'button' } }] }),
		);

		const { expected, actual } = await both(['--config', escape(config), '--search', 'button', escape(target)]);

		expect(places(expected.stdout)).toStrictEqual(['1:1']);
		expect(actual).toStrictEqual(expected);
	});

	test('[search-rust-004] reads the files of a framework parser', async () => {
		const target = await write('target.vue', '<template>\n\t<p>a</p>\n\t<div><p>b</p></div>\n</template>\n');
		const config = await write(
			'.markuplintrc',
			JSON.stringify({ parser: { '\\.vue$': '@markuplint/vue-parser' } }),
		);

		const { expected, actual } = await both(['--config', escape(config), '--search', 'p', escape(target)]);

		expect(places(expected.stdout)).toStrictEqual(['2:2', '3:7']);
		expect(actual).toStrictEqual(expected);
	});

	test('[search-rust-005] does not report the rules of the config', async () => {
		const target = await write('target.html', '<div id="a"></div><div id="a"></div>');
		const config = await write('.markuplintrc', JSON.stringify({ rules: { 'no-duplicate-id': true } }));

		const { expected, actual } = await both(['--config', escape(config), '--search', 'div', escape(target)]);

		expect(places(expected.stdout)).toStrictEqual(['1:1', '1:19']);
		expect(actual.stdout).not.toContain('no-duplicate-id');
		expect(actual).toStrictEqual(expected);
	});

	test('[search-rust-006] reports no warning about the rules of the config', async () => {
		const target = await write('target.html', '<p></p>');
		const config = await write(
			'.markuplintrc',
			JSON.stringify({
				extends: ['markuplint:recommended'],
				rules: { 'no-such-rule': true, 'code-styles/no-such-base': true },
			}),
		);

		const { expected, actual } = await both(['--config', escape(config), '--search', 'p', escape(target)]);

		expect(places(expected.stdout)).toStrictEqual(['1:1']);
		expect(expected.stderr).toBe('');
		expect(actual).toStrictEqual(expected);
	});

	test.each([['p['], [':model(no-such-category)']])(
		'[search-rust-007] fails as the TypeScript engine does for the selector it cannot read: %s',
		async selector => {
			const target = await write('target.html', '<p></p>');

			const { expected, actual } = await both(['--no-search-config', '--search', selector, escape(target)]);

			expect(expected.exitCode).not.toBe(0);
			expect(expected.stderr).toContain('InvalidSelectorError: ');
			expect(actual.exitCode).toBe(expected.exitCode);
			expect(actual.stdout).toBe(expected.stdout);
			// The first line, which says what is wrong: the rest is a stack trace.
			expect(actual.stderr.split('\n')[0]).toBe(expected.stderr.split('\n')[0]);
		},
	);

	test('[search-rust-008] reports the plugin that the config still names as removed, as the TypeScript engine does', async () => {
		const target = await write('target.html', '<p></p>');
		const config = await write('.markuplintrc', JSON.stringify({ plugins: ['a-plugin'] }));

		const { expected, actual } = await both(['--config', escape(config), '--search', 'p', escape(target)]);

		expect(places(expected.stdout)).toStrictEqual(['1:1']);
		expect(expected.stderr).toContain('"plugins" is not supported');
		expect(expected.stderr).toContain('/docs/migration/v5-to-v6/plugins');
		expect(actual).toStrictEqual(expected);
	});

	test('[search-rust-009] searches every file in the order they are given', async () => {
		const first = await write('a.html', '<p></p>');
		const second = await write('b.html', '<div><p></p></div>');

		const { expected, actual } = await both(['--no-search-config', '--search', 'p', escape(first), escape(second)]);

		expect(located(expected.stdout)).toStrictEqual(['a.html:1:1', 'b.html:1:6']);
		expect(actual).toStrictEqual(expected);
	});
});
