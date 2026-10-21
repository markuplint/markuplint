import { describe, expect, test } from 'vitest';

import { splitSentences, unifiedDiff } from './diff.ts';

describe('splitSentences', () => {
	test('[diff-001] puts each sentence on its own line', () => {
		expect(splitSentences('One thing. Another thing! 属性は名前を持つ。値も持つ。')).toBe(
			'One thing.\nAnother thing!\n属性は名前を持つ。\n値も持つ。',
		);
	});

	test('[diff-002] does not split inside a number or an abbreviation without a following space', () => {
		expect(splitSentences('See 4.10.5.1.17 and e.g.the rest.')).toBe('See 4.10.5.1.17 and e.g.the rest.');
	});
});

describe('unifiedDiff', () => {
	test('[diff-003] returns an empty string for equal texts', () => {
		expect(unifiedDiff('a\nb', 'a\nb')).toBe('');
	});

	test('[diff-004] shows a changed line with its context', () => {
		const before = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].join('\n');
		const after = ['one', 'two', 'three', 'FOUR', 'five', 'six', 'seven'].join('\n');
		expect(unifiedDiff(before, after, 2)).toBe(
			['@@ -2,5 +2,5 @@', ' two', ' three', '-four', '+FOUR', ' five', ' six'].join('\n'),
		);
	});

	test('[diff-005] shows an added and a removed line', () => {
		expect(unifiedDiff('a\nb', 'a\nb\nc', 1)).toBe(['@@ -2,1 +2,2 @@', ' b', '+c'].join('\n'));
		expect(unifiedDiff('a\nb\nc', 'a\nc', 1)).toBe(['@@ -1,3 +1,2 @@', ' a', '-b', ' c'].join('\n'));
	});

	test('[diff-006] separates far-apart changes into two hunks', () => {
		const before = Array.from({ length: 12 }, (_, i) => `l${i}`).join('\n');
		const after = before.replace('l1', 'X1').replace('l10', 'X10');
		const hunks = unifiedDiff(before, after, 1)
			.split('\n')
			.filter(l => l.startsWith('@@'));
		expect(hunks).toHaveLength(2);
	});

	test('[diff-007] falls back to replacing the whole text when the texts are too large to align', () => {
		const a = Array.from({ length: 3000 }, (_, i) => `a${i}`).join('\n');
		const b = Array.from({ length: 3000 }, (_, i) => `b${i}`).join('\n');
		const out = unifiedDiff(a, b, 1);
		expect(out.startsWith('@@ -1,3000 +1,3000 @@')).toBe(true);
		expect(out.split('\n')).toHaveLength(6001);
	});
});
