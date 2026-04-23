import { describe, expect, test } from 'vitest';

import { compare } from './compare.ts';
import type {
	CompareInputs,
	MarkuplintSnapshot,
	NuMessage,
	NuValidatorSnapshot,
} from './types.ts';

function nuSnap(path: string, messages: readonly Partial<NuMessage>[] = []): NuValidatorSnapshot {
	return {
		source: { path, sha256: 'x'.repeat(64), filenameHint: 'other' },
		nuValidator: {
			imageDigest: 'sha256:test',
			messages: messages.map((m, i) => ({
				id: m.id ?? `nv-${'a'.repeat(11)}${i}`,
				type: m.type ?? 'error',
				subType: m.subType ?? null,
				message: m.message ?? 'default',
				firstLine: m.firstLine ?? null,
				lastLine: m.lastLine ?? null,
				firstColumn: m.firstColumn ?? null,
				lastColumn: m.lastColumn ?? null,
				extract: m.extract ?? null,
				hiliteStart: m.hiliteStart ?? null,
				hiliteLength: m.hiliteLength ?? null,
			})),
		},
	};
}

function mlSnap(
	path: string,
	violations: readonly { ruleId?: string; severity?: 'error' | 'warning' | 'info' }[] = [],
): MarkuplintSnapshot {
	return {
		source: { path, sha256: 'x'.repeat(64) },
		markuplint: {
			version: '4.x',
			configId: 'all-rules',
			violations: violations.map(v => ({
				ruleId: v.ruleId ?? 'invalid-attr',
				severity: v.severity ?? 'error',
				message: 'm',
				line: 1,
				col: 1,
				raw: '',
			})),
			parseError: false,
			parseErrorMessage: null,
		},
	};
}

function inputs(
	nu: readonly NuValidatorSnapshot[],
	ml: readonly MarkuplintSnapshot[],
	excludedIds: readonly string[] = [],
	excludedPatterns: readonly { messageContains: string }[] = [],
): CompareInputs {
	return {
		nuSnapshots: new Map(nu.map(s => [s.source.path, s])),
		mlSnapshots: new Map(ml.map(s => [s.source.path, s])),
		excludedIds: new Set(excludedIds),
		excludedPatterns: excludedPatterns.map(p => ({
			messageContains: p.messageContains,
			reason: 'test',
			specUrl: 'https://example.test/',
			addedAt: '2026-04-23',
			addedBy: 'test',
		})),
	};
}

describe('compare', () => {
	test('both flag an error → match-error', () => {
		const out = compare(
			inputs(
				[nuSnap('html/elements/a.html', [{ type: 'error', message: 'e' }])],
				[mlSnap('html/elements/a.html', [{}])],
			),
		);
		expect(out.coverage.entries).toHaveLength(1);
		expect(out.coverage.entries[0]?.verdict).toBe('match-error');
		expect(out.mlOverDetection).toHaveLength(0);
		expect(out.nuOverDetection).toHaveLength(0);
	});

	test('both clean → match-clean', () => {
		const out = compare(inputs([nuSnap('html/elements/a.html')], [mlSnap('html/elements/a.html')]));
		expect(out.coverage.entries[0]?.verdict).toBe('match-clean');
	});

	test('ml flags, nu clean → ml-over', () => {
		const out = compare(
			inputs([nuSnap('html/elements/a.html')], [mlSnap('html/elements/a.html', [{ ruleId: 'invalid-attr' }])]),
		);
		expect(out.coverage.entries[0]?.verdict).toBe('ml-over');
		expect(out.mlOverDetection).toHaveLength(1);
		expect(out.mlOverDetection[0]?.ruleIds).toEqual(['invalid-attr']);
	});

	test('nu flags, ml clean → nu-over', () => {
		const out = compare(
			inputs(
				[nuSnap('html/elements/a.html', [{ id: 'nv-xxx', type: 'error', message: 'e' }])],
				[mlSnap('html/elements/a.html')],
			),
		);
		expect(out.coverage.entries[0]?.verdict).toBe('nu-over');
		expect(out.nuOverDetection[0]?.nuMessageIds).toEqual(['nv-xxx']);
	});

	test('excluded ids collapse nu-over into match-clean', () => {
		const out = compare(
			inputs(
				[nuSnap('html/elements/a.html', [{ id: 'nv-excluded', type: 'error' }])],
				[mlSnap('html/elements/a.html')],
				['nv-excluded'],
			),
		);
		expect(out.coverage.entries[0]?.verdict).toBe('match-clean');
		expect(out.coverage.entries[0]?.excludedIds).toEqual(['nv-excluded']);
		expect(out.nuOverDetection).toHaveLength(0);
	});

	test('pattern exclusion matches any nu message containing the substring', () => {
		const out = compare(
			inputs(
				[
					nuSnap('html/elements/a.html', [
						{ id: 'nv-p1', type: 'error', message: 'Something Fragment is not allowed for data: URIs foo' },
					]),
					nuSnap('html/elements/b.html', [{ id: 'nv-p2', type: 'error', message: 'unrelated' }]),
				],
				[mlSnap('html/elements/a.html'), mlSnap('html/elements/b.html')],
				[],
				[{ messageContains: 'Fragment is not allowed for data:' }],
			),
		);
		const byPath = Object.fromEntries(out.coverage.entries.map(e => [e.path, e]));
		expect(byPath['html/elements/a.html']?.verdict).toBe('match-clean');
		expect(byPath['html/elements/a.html']?.excludedIds).toEqual(['nv-p1']);
		expect(byPath['html/elements/b.html']?.verdict).toBe('nu-over');
	});

	test('pattern and id exclusions compose — both record the message id as excluded', () => {
		const out = compare(
			inputs(
				[
					nuSnap('html/elements/a.html', [
						{ id: 'nv-first', type: 'error', message: 'must be less than or equal to max' },
						{ id: 'nv-second', type: 'error', message: 'other' },
					]),
				],
				[mlSnap('html/elements/a.html')],
				['nv-second'],
				[{ messageContains: 'must be less than or equal to' }],
			),
		);
		expect(out.coverage.entries[0]?.verdict).toBe('match-clean');
		expect(out.coverage.entries[0]?.excludedIds.sort()).toEqual(['nv-first', 'nv-second']);
	});

	test('non-error nu messages (warnings/info) do not count as an error', () => {
		// nu-validator often emits a "Consider adding a lang attribute" info/warning pair.
		const out = compare(
			inputs(
				[nuSnap('html/elements/a.html', [{ type: 'info', message: 'consider lang' }])],
				[mlSnap('html/elements/a.html')],
			),
		);
		expect(out.coverage.entries[0]?.verdict).toBe('match-clean');
	});

	test('ml warnings do not count as an error', () => {
		const out = compare(
			inputs(
				[nuSnap('html/elements/a.html')],
				[mlSnap('html/elements/a.html', [{ severity: 'warning' }])],
			),
		);
		expect(out.coverage.entries[0]?.verdict).toBe('match-clean');
	});

	test('unpaired snapshots are reported via compare().unpaired', () => {
		const out = compare(
			inputs(
				[nuSnap('html/elements/a.html'), nuSnap('html/elements/b.html')],
				[mlSnap('html/elements/a.html')],
			),
		);
		expect(out.coverage.entries.map(e => e.path)).toEqual(['html/elements/a.html']);
		expect(out.unpaired.nuOnly).toEqual(['html/elements/b.html']);
		expect(out.unpaired.mlOnly).toEqual([]);
	});

	test('category is populated from inferCategory', () => {
		const out = compare(
			inputs(
				[nuSnap('html-aria/role-button.html', [{ type: 'error' }])],
				[mlSnap('html-aria/role-button.html', [{}])],
			),
		);
		expect(out.coverage.entries[0]?.category).toBe('aria');
	});

	test('ml over-detection groups unique ruleIds in sorted order', () => {
		const out = compare(
			inputs(
				[nuSnap('html/elements/a.html')],
				[
					mlSnap('html/elements/a.html', [
						{ ruleId: 'permitted-contents' },
						{ ruleId: 'invalid-attr' },
						{ ruleId: 'invalid-attr' },
					]),
				],
			),
		);
		expect(out.mlOverDetection[0]?.ruleIds).toEqual(['invalid-attr', 'permitted-contents']);
	});
});
