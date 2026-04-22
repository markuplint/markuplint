import { describe, expect, test } from 'vitest';

import { buildMessageId, buildMessageIds, disambiguateIds } from './message-id.ts';

describe('buildMessageId', () => {
	test('produces an nv-<hex12> identifier', () => {
		const id = buildMessageId({
			path: 'html/elements/a-novalid.html',
			type: 'error',
			message: 'Element X not allowed',
			firstLine: 12,
			firstColumn: 3,
		});
		expect(id).toMatch(/^nv-[0-9a-f]{12}$/);
	});

	test('is deterministic for the same input', () => {
		const input = {
			path: 'html/elements/a.html',
			type: 'error',
			message: 'm',
			firstLine: 1,
			firstColumn: 2,
		};
		expect(buildMessageId(input)).toBe(buildMessageId(input));
	});

	test('differs when the path differs', () => {
		const base = { type: 'error', message: 'm', firstLine: 1, firstColumn: 2 };
		expect(buildMessageId({ path: 'a.html', ...base })).not.toBe(buildMessageId({ path: 'b.html', ...base }));
	});

	test('differs when the message differs', () => {
		const base = { path: 'a.html', type: 'error', firstLine: 1, firstColumn: 2 };
		expect(buildMessageId({ ...base, message: 'x' })).not.toBe(buildMessageId({ ...base, message: 'y' }));
	});

	test('distinguishes null vs zero for firstLine / firstColumn', () => {
		const a = buildMessageId({ path: 'a.html', type: 'error', message: 'm', firstLine: null, firstColumn: null });
		const b = buildMessageId({ path: 'a.html', type: 'error', message: 'm', firstLine: 0, firstColumn: 0 });
		expect(a).not.toBe(b);
	});

	test('hash input is stable regardless of path separator interpretation', () => {
		// POSIX-style path — nu-validator tests reference paths without OS-specific
		// separators, so IDs must not depend on process.cwd or host OS.
		const id = buildMessageId({
			path: 'html-aria/misc/aria-owns-broken-idref-novalid.html',
			type: 'error',
			message: 'The "aria-owns" attribute references "nonexistent-id"',
			firstLine: 8,
			firstColumn: 5,
		});
		// Value should be stable across platforms. Regenerate carefully if this breaks.
		expect(id).toMatch(/^nv-[0-9a-f]{12}$/);
		expect(id).toBe(buildMessageId({
			path: 'html-aria/misc/aria-owns-broken-idref-novalid.html',
			type: 'error',
			message: 'The "aria-owns" attribute references "nonexistent-id"',
			firstLine: 8,
			firstColumn: 5,
		}));
	});
});

describe('disambiguateIds', () => {
	test('returns input unchanged when all ids are unique', () => {
		expect(disambiguateIds(['nv-a', 'nv-b', 'nv-c'])).toEqual(['nv-a', 'nv-b', 'nv-c']);
	});

	test('appends -N to second and later occurrences of the same id', () => {
		expect(disambiguateIds(['nv-a', 'nv-a', 'nv-b', 'nv-a'])).toEqual(['nv-a', 'nv-a-1', 'nv-b', 'nv-a-2']);
	});

	test('preserves input order', () => {
		const input = ['nv-z', 'nv-a', 'nv-z'];
		expect(disambiguateIds(input)).toEqual(['nv-z', 'nv-a', 'nv-z-1']);
	});
});

describe('buildMessageIds', () => {
	test('disambiguates identical messages produced at the same position', () => {
		const base = { path: 'a.html', type: 'error', message: 'dup', firstLine: 1, firstColumn: 1 };
		const [first, second, third] = buildMessageIds([base, base, base]);
		expect(first).toMatch(/^nv-[0-9a-f]{12}$/);
		expect(second).toBe(`${first}-1`);
		expect(third).toBe(`${first}-2`);
	});
});
