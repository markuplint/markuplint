import { describe, expect, test } from 'vitest';

import type { PrimaryMapping, SecondaryMapping, UmbrellaMapping } from './issue-xref.config.ts';
import type { BenchData, RenderContext } from './xref-issue.ts';
import { buildPrimaryBlock, buildSecondaryBlock, buildUmbrellaBlock, composeBody } from './xref-issue.ts';

function baseMeta() {
	return {
		generatedAt: '2026-04-22T23:43:45.466Z',
		submoduleSha: '1429313954120000000000000000000000000001',
		nuValidatorImage: 'ghcr.io/validator/validator@sha256:59b0e97e2664755f1597ba9b6a0ecbdc4c67bd1518d1318acd29d9a08900389b',
		markuplintVersion: '5.0.0-rc.4',
		nodeVersion: '24.14.1',
		totalFilesNu: 5442,
		totalFilesMl: 5442,
		totalNuMessages: 9734,
		totalMlViolations: 9775,
		totalNuFailures: 0,
	};
}

function makeData(entries: readonly { path: string; verdict: 'match-error' | 'match-clean' | 'ml-only' | 'nu-only' | 'nu-over'; category?: string }[] = []): BenchData {
	return {
		coverage: {
			entries: entries.map(e => ({
				path: e.path,
				category: e.category ?? 'invalid-attr',
				nu: e.verdict === 'nu-only' || e.verdict === 'match-error' ? 'error' : 'clean',
				ml: e.verdict === 'ml-only' || e.verdict === 'match-error' ? 'error' : 'clean',
				verdict: e.verdict,
				excludedIds: [],
			})),
		},
		mlOnly: [
			{ path: 'html/elements/foo-ml.html', category: 'invalid-attr', ruleIds: ['invalid-attr', 'deprecated-attr'] },
		],
		nuOnly: [
			{ path: 'html/elements/foo-nu.html', category: 'invalid-attr', nuMessageIds: ['nv-deadbeef0001'] },
		],
		nuOver: [
			{ path: 'html/elements/foo-over.html', category: 'invalid-attr', nuMessageIds: ['nv-excluded00001'] },
		],
		meta: baseMeta(),
	};
}

describe('buildPrimaryBlock', () => {
	test('renders heading, markers, filter, tally, and rows for matching fixtures', () => {
		const mapping: PrimaryMapping = {
			kind: 'primary',
			issue: 1234,
			filter: /html\/elements\/foo-/,
		};
		const data = makeData([
			{ path: 'html/elements/foo-ml.html', verdict: 'ml-only' },
			{ path: 'html/elements/foo-nu.html', verdict: 'nu-only' },
			{ path: 'html/elements/foo-over.html', verdict: 'nu-over' },
		]);
		const out = buildPrimaryBlock(mapping, data);

		expect(out).toContain('## Benchmark cross-reference');
		expect(out).toContain('<!-- bench-xref:begin v1 -->');
		expect(out).toContain('<!-- bench-xref:end -->');
		expect(out).toContain('html\\/elements\\/foo-'); // regex source appears in "Filter:"
		expect(out).toContain('**3** fixtures');
		expect(out).toContain('match-error=0');
		expect(out).toContain('ml-only=1');
		expect(out).toContain('nu-only=1');
		expect(out).toContain('nu-over=1');
		// ruleId / message IDs appear as code spans
		expect(out).toContain('`invalid-attr`, `deprecated-attr`');
		expect(out).toContain('`nv-deadbeef0001`');
		expect(out).toContain('`nv-excluded00001`');
	});

	test('notes that nothing matched when the filter finds zero fixtures', () => {
		const mapping: PrimaryMapping = {
			kind: 'primary',
			issue: 9999,
			filter: /never-matches-anything/,
		};
		const data = makeData([{ path: 'html/elements/foo-ml.html', verdict: 'ml-only' }]);
		const out = buildPrimaryBlock(mapping, data);
		expect(out).toContain('**0** fixtures');
		expect(out).toContain('_No fixtures matched the filter._');
		expect(out).not.toContain('| fixture | verdict |');
	});

	test('embeds the optional note verbatim', () => {
		const mapping: PrimaryMapping = {
			kind: 'primary',
			issue: 42,
			filter: /foo/,
			note: 'This is a distinct note that must appear in the block.',
		};
		const data = makeData([{ path: 'html/elements/foo-ml.html', verdict: 'ml-only' }]);
		const out = buildPrimaryBlock(mapping, data);
		expect(out).toContain('This is a distinct note that must appear in the block.');
	});
});

describe('buildSecondaryBlock', () => {
	test('labels the fixture as not verifiable and includes the reason', () => {
		const mapping: SecondaryMapping = {
			kind: 'secondary',
			issue: 100,
			reason: 'nu has no fixture for this scenario.',
		};
		const out = buildSecondaryBlock(mapping, makeData());
		expect(out).toContain('## Benchmark cross-reference');
		expect(out).toContain('Not directly verifiable');
		expect(out).toContain('nu has no fixture for this scenario.');
		expect(out).toContain('<!-- bench-xref:begin v1 -->');
		expect(out).toContain('<!-- bench-xref:end -->');
	});
});

describe('buildUmbrellaBlock', () => {
	test('renders a row per primary issue listed and omits unknown numbers gracefully', () => {
		const primary1: PrimaryMapping = { kind: 'primary', issue: 1001, filter: /one/ };
		const primary2: PrimaryMapping = { kind: 'primary', issue: 1002, filter: /two/ };
		const umbrella: UmbrellaMapping = {
			kind: 'umbrella',
			issue: 999,
			primaryIssues: [1001, 1002, 1003],
		};
		const data = makeData([
			{ path: 'one-a.html', verdict: 'nu-only' },
			{ path: 'one-b.html', verdict: 'match-error' },
			{ path: 'two-a.html', verdict: 'ml-only' },
		]);
		const ctx: RenderContext = { data, mappings: [primary1, primary2, umbrella] };
		const out = buildUmbrellaBlock(umbrella, ctx);

		expect(out).toContain('| #1001 | 2 |');
		expect(out).toContain('| #1002 | 1 |');
		expect(out).toContain('| #1003 | — | primary mapping not found');
		expect(out).toContain('<!-- bench-xref:begin v1 -->');
	});
});

describe('composeBody', () => {
	test('appends the xref block when no marker is present', () => {
		const block = '## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nsync info\n<!-- bench-xref:end -->';
		const out = composeBody('Original body.\n', block);
		expect(out.startsWith('Original body.')).toBe(true);
		expect(out).toContain('<!-- bench-xref:begin v1 -->');
		expect(out).toContain('<!-- bench-xref:end -->');
		expect(out.split('<!-- bench-xref:begin v1 -->').length).toBe(2);
	});

	test('replaces an existing xref block in-place (idempotent)', () => {
		const original =
			'Original body.\n\n## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nOLD content\n<!-- bench-xref:end -->\n';
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nNEW content\n<!-- bench-xref:end -->';
		const first = composeBody(original, block);
		expect(first).toContain('NEW content');
		expect(first).not.toContain('OLD content');

		const second = composeBody(first, block);
		expect(second).toBe(first);
	});

	test('uses bodyOverride as the base when provided, replacing the original body entirely', () => {
		const original = 'Outdated body that should be thrown away.';
		const override = 'Rewritten scope. Short and to the point.';
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nfresh\n<!-- bench-xref:end -->';
		const out = composeBody(original, block, override);
		expect(out).not.toContain('Outdated body');
		expect(out).toContain('Rewritten scope.');
		expect(out).toContain('<!-- bench-xref:begin v1 -->');
	});

	test('normalises CRLF line endings to LF before appending', () => {
		const original = 'Line one.\r\nLine two.\r\n';
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nx\n<!-- bench-xref:end -->';
		const out = composeBody(original, block);
		expect(out).not.toContain('\r');
	});
});
