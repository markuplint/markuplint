import { describe, test, expect } from 'vitest';

import { parseBlamePorcelain } from '../../../../vscode/src/server/suppression-support.js';

// 40-char hex SHAs for test data
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_ZERO = '0'.repeat(40);

describe('parseBlamePorcelain', () => {
	test('parses a single entry', () => {
		const output = [
			`${SHA_A} 10 10 1`,
			'author John Doe',
			'author-mail <john@example.com>',
			'author-time 1700000000',
			'author-tz +0000',
			'committer John Doe',
			'committer-mail <john@example.com>',
			'committer-time 1700000000',
			'committer-tz +0000',
			'summary fix something',
			'filename test.html',
			'\t<div class="a" class="b">',
		].join('\n');

		const result = parseBlamePorcelain(output);

		expect(result.size).toBe(1);
		expect(result.get(10)).toEqual(new Date(1_700_000_000 * 1000));
	});

	test('parses multiple entries from different commits', () => {
		const output = [
			`${SHA_A} 5 5 1`,
			'author Alice',
			'author-mail <alice@example.com>',
			'author-time 1600000000',
			'author-tz +0000',
			'committer Alice',
			'committer-mail <alice@example.com>',
			'committer-time 1600000000',
			'committer-tz +0000',
			'summary first commit',
			'filename test.html',
			'\t<p id="x" id="y">',
			`${SHA_B} 10 10 1`,
			'author Bob',
			'author-mail <bob@example.com>',
			'author-time 1700000000',
			'author-tz +0000',
			'committer Bob',
			'committer-mail <bob@example.com>',
			'committer-time 1700000000',
			'committer-tz +0000',
			'summary second commit',
			'filename test.html',
			'\t<span title="a" title="b">',
		].join('\n');

		const result = parseBlamePorcelain(output);

		expect(result.size).toBe(2);
		expect(result.get(5)).toEqual(new Date(1_600_000_000 * 1000));
		expect(result.get(10)).toEqual(new Date(1_700_000_000 * 1000));
	});

	test('handles repeated commit SHA (abbreviated header without author-time)', () => {
		const output = [
			`${SHA_A} 15 15 1`,
			'author Alice',
			'author-mail <alice@example.com>',
			'author-time 1600000000',
			'author-tz +0000',
			'committer Alice',
			'committer-mail <alice@example.com>',
			'committer-time 1600000000',
			'committer-tz +0000',
			'summary some commit',
			'filename test.html',
			'\t<div class="a" class="b">',
			`${SHA_A} 16 16`,
			'filename test.html',
			'\t<p id="x" id="y">',
		].join('\n');

		const result = parseBlamePorcelain(output);

		expect(result.size).toBe(2);
		expect(result.get(15)).toEqual(new Date(1_600_000_000 * 1000));
		expect(result.get(16)).toEqual(new Date(1_600_000_000 * 1000));
	});

	test('handles uncommitted lines (all-zero SHA)', () => {
		const output = [
			`${SHA_ZERO} 19 19 1`,
			'author Not Committed Yet',
			'author-mail <not.committed.yet>',
			'author-time 1711756800',
			'author-tz +0000',
			'committer Not Committed Yet',
			'committer-mail <not.committed.yet>',
			'committer-time 1711756800',
			'committer-tz +0000',
			'summary uncommitted',
			'filename test.html',
			'\t<span title="a" title="b">new</span>',
		].join('\n');

		const result = parseBlamePorcelain(output);

		expect(result.size).toBe(1);
		expect(result.get(19)).toEqual(new Date(1_711_756_800 * 1000));
	});

	test('handles mixed committed and uncommitted lines', () => {
		const output = [
			`${SHA_A} 15 15 1`,
			'author Alice',
			'author-mail <alice@example.com>',
			'author-time 1600000000',
			'author-tz +0000',
			'committer Alice',
			'committer-mail <alice@example.com>',
			'committer-time 1600000000',
			'committer-tz +0000',
			'summary old commit',
			'filename test.html',
			'\t<div class="a" class="b">old</div>',
			`${SHA_A} 16 16`,
			'filename test.html',
			'\t<p id="x" id="y">old 2</p>',
			`${SHA_ZERO} 19 19 1`,
			'author Not Committed Yet',
			'author-mail <not.committed.yet>',
			'author-time 1800000000',
			'author-tz +0000',
			'committer Not Committed Yet',
			'committer-mail <not.committed.yet>',
			'committer-time 1800000000',
			'committer-tz +0000',
			'summary uncommitted',
			'filename test.html',
			'\t<span title="a" title="b">new</span>',
			`${SHA_ZERO} 20 20`,
			'filename test.html',
			'\t<a href="#" href="/">new 2</a>',
		].join('\n');

		const result = parseBlamePorcelain(output);

		expect(result.size).toBe(4);
		expect(result.get(15)).toEqual(new Date(1_600_000_000 * 1000));
		expect(result.get(16)).toEqual(new Date(1_600_000_000 * 1000));
		expect(result.get(19)).toEqual(new Date(1_800_000_000 * 1000));
		expect(result.get(20)).toEqual(new Date(1_800_000_000 * 1000));
	});

	test('returns empty map for empty input', () => {
		const result = parseBlamePorcelain('');

		expect(result.size).toBe(0);
	});
});
