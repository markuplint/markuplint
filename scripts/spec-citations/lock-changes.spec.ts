import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import type { Lock } from './types.ts';

import { containsKey, describeLockChanges, diffLocks, findCitations, grepKeys } from './lock-changes.ts';

const entry = (hash: string) => ({ hash, text: hash, updatedAt: '2026-11-01T00:00:00.000Z' });
const lock = (sections: Record<string, string>): Lock => ({
	sections: Object.fromEntries(Object.entries(sections).map(([key, hash]) => [key, entry(hash)])),
});

const A = 'https://example.test/a#one';
const B = 'https://example.test/b#two';
const C = 'https://example.test/c#three';

describe('diffLocks', () => {
	test('[lock-changes-001] tells the sections added, removed and changed, each in order', () => {
		const before = lock({ [B]: 'b1', [C]: 'c1', [A]: 'a1' });
		const after = lock({
			[C]: 'c2',
			[A]: 'a1',
			'https://example.test/d#four': 'd1',
			'https://example.test/0#zero': 'z1',
		});
		expect(diffLocks(before, after)).toStrictEqual({
			added: ['https://example.test/0#zero', 'https://example.test/d#four'],
			removed: [B],
			changed: [C],
		});
	});

	test('[lock-changes-002] has nothing to tell when the locks are the same', () => {
		const same = lock({ [A]: 'a1' });
		expect(diffLocks(same, same)).toStrictEqual({ added: [], removed: [], changed: [] });
	});
});

describe('describeLockChanges', () => {
	test('[lock-changes-003] is empty when nothing changed', () => {
		expect(describeLockChanges({ added: [], removed: [], changed: [] }, () => [])).toBe('');
	});

	test('[lock-changes-004] lists what was removed, added and changed under a heading each', () => {
		const text = describeLockChanges({ added: [A], removed: [B], changed: [C] }, () => []);
		expect(text).toContain('Sections removed from the lock (1)');
		expect(text).toContain('Sections whose text changed (1)');
		expect(text).toContain('Sections added to the lock (1)');
		expect(text).toContain(`- \`${A}\``);
		expect(text).toContain(`- \`${B}\``);
		expect(text).toContain(`- \`${C}\``);
		expect(text.indexOf('removed')).toBeLessThan(text.indexOf('changed'));
		expect(text.indexOf('changed')).toBeLessThan(text.indexOf('added'));
	});

	test('[lock-changes-005] names where a removed section is still cited, and warns before the list', () => {
		const stillCited = (key: string) => (key === B ? ['packages/x/src/a.ts:12', 'packages/x/src/b.ts:3'] : []);
		const text = describeLockChanges({ added: [], removed: [A, B], changed: [] }, stillCited);
		expect(text).toContain(`- \`${B}\` — still cited in \`packages/x/src/a.ts:12\`, \`packages/x/src/b.ts:3\``);
		expect(text).toContain(`- \`${A}\``);
		expect(text).toContain('1 of them is still cited');
		expect(text.indexOf('1 of them is still cited')).toBeLessThan(text.indexOf(`- \`${B}\``));
		expect(text.indexOf(`- \`${B}\``)).toBeLessThan(text.indexOf(`- \`${A}\``));
	});

	test('[lock-changes-015] names a removed section that is still cited even when a long list is cut', () => {
		const removed = Array.from({ length: 5 }, (_, i) => `https://example.test/p${i}#x`);
		const text = describeLockChanges(
			{ added: [], removed, changed: [] },
			key => (key.includes('p4') ? ['a.ts:1'] : []),
			2,
		);
		expect(text).toContain('`https://example.test/p4#x` — still cited in `a.ts:1`');
		expect(text).toContain('- …and 3 more');
	});

	test('[lock-changes-006] says nothing of a warning when no removed section is still cited', () => {
		const text = describeLockChanges({ added: [], removed: [A], changed: [] }, () => []);
		expect(text).not.toContain('still cited');
	});

	test('[lock-changes-007] cuts a long list and says how many were left out', () => {
		const added = Array.from({ length: 5 }, (_, i) => `https://example.test/p${i}#x`);
		const text = describeLockChanges({ added, removed: [], changed: [] }, () => [], 3);
		expect(text).toContain('Sections added to the lock (5)');
		expect(text).toContain('- …and 2 more');
		expect(text).not.toContain('p3#x');
	});

	test('[lock-changes-008] shows the first three places of a section that is cited in more', () => {
		const places = ['a.ts:1', 'b.ts:2', 'c.ts:3', 'd.ts:4', 'e.ts:5'];
		const text = describeLockChanges({ added: [], removed: [A], changed: [] }, () => places);
		expect(text).toContain('`a.ts:1`, `b.ts:2`, `c.ts:3` and 2 more');
		expect(text).not.toContain('d.ts:4');
	});

	test('[lock-changes-013] says "are" when several removed sections are still cited, and cuts the removed list too', () => {
		const removed = [A, B, C];
		const text = describeLockChanges({ added: [], removed, changed: [C, B, A] }, () => ['x.ts:1'], 2);
		expect(text).toContain('3 of them are still cited');
		expect(text).toContain('Sections removed from the lock (3)');
		expect(text).toContain('Sections whose text changed (3)');
		expect(text.match(/- …and 1 more/g)).toHaveLength(2);
	});
});

describe('containsKey', () => {
	const key = 'https://example.test/a#attr-a';

	test('[lock-changes-009] finds the key where it ends, and where a text directive or a punctuation mark follows', () => {
		expect(containsKey(`@see ${key}`, key)).toBe(true);
		expect(containsKey(`see ${key}.`, key)).toBe(true);
		expect(containsKey(`(${key})`, key)).toBe(true);
		expect(containsKey(`${key}:~:text=x`, key)).toBe(true);
		expect(containsKey(`[a](${key} "title")`, key)).toBe(true);
	});

	test('[lock-changes-010] does not take the key for the start of a longer fragment', () => {
		expect(containsKey(`${key}b`, key)).toBe(false);
		expect(containsKey(`${key}-b`, key)).toBe(false);
		expect(containsKey(`${key}_b`, key)).toBe(false);
		expect(containsKey(`${key}.b`, key)).toBe(false);
		expect(containsKey(`${key}-b and then ${key}`, key)).toBe(true);
	});
});

describe('grepKeys', () => {
	test('[lock-changes-014] is an error, and not "nothing cites it", when git cannot run there', () => {
		const missing = join(tmpdir(), 'spec-citations-no-such-directory');
		expect(() => grepKeys(missing, [A])).toThrow();
	});
});

describe('findCitations', () => {
	const root = fileURLToPath(new URL('../../', import.meta.url));

	test('[lock-changes-011] finds the citation that #4558 lost, in a file that the monitor reads', () => {
		const key =
			'https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#rules-for-parsing-non-negative-integers';
		const found = findCitations(root, [key]).get(key) ?? [];
		const place = 'packages/@markuplint/ml-spec/src/algorithm/html/select-display-size.ts:';
		expect(found.some(p => p.startsWith(place))).toBe(true);
	});

	test('[lock-changes-012] finds a URL that only a file the monitor does not read holds, and nothing for a URL nobody cites', () => {
		const inReadme = 'https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)';
		// Built from parts: a literal would be a citation of the URL that this very file holds.
		const nobody = ['https://example.test', 'nobody-cites-this#section'].join('/');
		const found = findCitations(root, [inReadme, nobody]);
		expect(found.get(inReadme)?.some(p => p.startsWith('packages/@markuplint/types/README.md:'))).toBe(true);
		expect(found.get(nobody)).toStrictEqual([]);
	});
});
