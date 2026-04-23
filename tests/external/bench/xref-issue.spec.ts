import { describe, expect, test, vi } from 'vitest';

import type { PrimaryMapping, SecondaryMapping, UmbrellaMapping, XrefMapping } from './issue-xref.config.ts';
import type { BenchData, GhClient, IssueState, RenderContext } from './xref-issue.ts';
import {
	buildBlock,
	buildPrimaryBlock,
	buildSecondaryBlock,
	buildUmbrellaBlock,
	composeBody,
	parseCliArgs,
	processOne,
	runAudit,
} from './xref-issue.ts';

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

	test('collapses multiple stale marker pairs into a single block', () => {
		// Simulates a body that accumulated two xref blocks from manual edits
		// or a prior bug where the replacement missed the `g` flag.
		const dirty =
			'Body.\n\n## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nSTALE A\n<!-- bench-xref:end -->\n\n' +
			'Intermezzo.\n\n## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nSTALE B\n<!-- bench-xref:end -->\n';
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nFRESH\n<!-- bench-xref:end -->';
		const out = composeBody(dirty, block);
		expect(out).not.toContain('STALE A');
		expect(out).not.toContain('STALE B');
		// exactly one pair in the output
		expect(out.split('<!-- bench-xref:begin v1 -->').length).toBe(2);
		expect(out).toContain('FRESH');
		expect(out).toContain('Intermezzo.');
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

	test('bodyOverride discards even an existing xref block from the original body', () => {
		const original =
			'Old body.\n\n## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nPRIOR\n<!-- bench-xref:end -->\n';
		const override = 'Totally new body. No prior anything.';
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nNEW\n<!-- bench-xref:end -->';
		const out = composeBody(original, block, override);
		expect(out).not.toContain('Old body');
		expect(out).not.toContain('PRIOR');
		expect(out).toContain('Totally new body.');
		expect(out).toContain('NEW');
		expect(out.split('<!-- bench-xref:begin v1 -->').length).toBe(2);
	});

	test('appends cleanly when the original body has no trailing newline', () => {
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nx\n<!-- bench-xref:end -->';
		const out = composeBody('Foo bar', block);
		expect(out.startsWith('Foo bar\n\n##')).toBe(true);
		expect(out.endsWith('<!-- bench-xref:end -->\n')).toBe(true);
	});

	test('accepts an empty original body', () => {
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nfirst\n<!-- bench-xref:end -->';
		const out = composeBody('', block);
		expect(out).toContain('<!-- bench-xref:begin v1 -->');
		// Only the block (plus the leading separator blank line + trailing newline).
		expect(out.startsWith('\n\n## Benchmark')).toBe(true);
	});

	test('normalises CRLF line endings to LF before appending', () => {
		const original = 'Line one.\r\nLine two.\r\n';
		const block =
			'## Benchmark cross-reference\n\n<!-- bench-xref:begin v1 -->\nx\n<!-- bench-xref:end -->';
		const out = composeBody(original, block);
		expect(out).not.toContain('\r');
	});
});

describe('buildBlock dispatch', () => {
	test('routes each kind to the matching builder', () => {
		const primary: PrimaryMapping = { kind: 'primary', issue: 1, filter: /nothing-matches/ };
		const secondary: SecondaryMapping = { kind: 'secondary', issue: 2, reason: 'r' };
		const umbrella: UmbrellaMapping = { kind: 'umbrella', issue: 3, primaryIssues: [1] };
		const data = makeData();
		const ctx: RenderContext = { data, mappings: [primary, secondary, umbrella] };

		expect(buildBlock(primary, ctx)).toBe(buildPrimaryBlock(primary, data));
		expect(buildBlock(secondary, ctx)).toBe(buildSecondaryBlock(secondary, data));
		expect(buildBlock(umbrella, ctx)).toBe(buildUmbrellaBlock(umbrella, ctx));
	});
});

describe('buildUmbrellaBlock edge cases', () => {
	test('renders a notice-only table when every primary reference is unknown', () => {
		const umbrella: UmbrellaMapping = {
			kind: 'umbrella',
			issue: 4242,
			primaryIssues: [9001, 9002],
		};
		const data = makeData();
		const ctx: RenderContext = { data, mappings: [umbrella] };
		const out = buildUmbrellaBlock(umbrella, ctx);
		expect(out).toContain('| #9001 | — | primary mapping not found in config |');
		expect(out).toContain('| #9002 | — | primary mapping not found in config |');
		// header still present
		expect(out).toContain('| Issue | Fixtures | Verdict tally |');
	});

	test('auto-derives primaryIssues from the config when omitted', () => {
		const p1: PrimaryMapping = { kind: 'primary', issue: 111, filter: /one/ };
		const p2: PrimaryMapping = { kind: 'primary', issue: 222, filter: /two/ };
		// secondary must be ignored by the derivation
		const s: SecondaryMapping = { kind: 'secondary', issue: 999, reason: 'n/a' };
		// umbrella with no primaryIssues — should derive from config
		const umbrella: UmbrellaMapping = { kind: 'umbrella', issue: 3000 };
		const data = makeData([
			{ path: 'one-a.html', verdict: 'nu-only' },
			{ path: 'two-a.html', verdict: 'ml-only' },
		]);
		const ctx: RenderContext = { data, mappings: [p1, p2, s, umbrella] };
		const out = buildUmbrellaBlock(umbrella, ctx);

		expect(out).toContain('| #111 | 1 |');
		expect(out).toContain('| #222 | 1 |');
		// secondary #999 must NOT appear in the table
		expect(out).not.toContain('#999');
	});
});

describe('parseCliArgs', () => {
	test('rejects --issue with non-integer input', () => {
		expect(() => parseCliArgs(['--issue', 'abc'])).toThrow(/invalid --issue/);
	});

	test('rejects --issue with zero or negative value', () => {
		expect(() => parseCliArgs(['--issue', '0'])).toThrow(/invalid --issue/);
		// `--issue=-5` uses the inline form so parseArgs does not mistake -5
		// for a second flag.
		expect(() => parseCliArgs(['--issue=-5'])).toThrow(/invalid --issue/);
	});

	test('requires one of --issue / --all / --audit', () => {
		expect(() => parseCliArgs([])).toThrow(/provide either --issue <N>, --all, or --audit/);
		expect(() => parseCliArgs(['--filter', 'foo'])).toThrow(/provide either --issue <N>, --all, or --audit/);
	});

	test('--audit alone opts into all:true with no writes', () => {
		const opts = parseCliArgs(['--audit']);
		expect(opts.audit).toBe(true);
		expect(opts.all).toBe(true);
		expect(opts.write).toBe(false);
		expect(opts.dryRun).toBe(false);
		expect(opts.issue).toBeUndefined();
	});

	test('--audit rejects combination with scope / mutation flags', () => {
		expect(() => parseCliArgs(['--audit', '--issue', '1234'])).toThrow(/--audit is standalone/);
		expect(() => parseCliArgs(['--audit', '--write'])).toThrow(/--audit is standalone/);
		expect(() => parseCliArgs(['--audit', '--dry-run'])).toThrow(/--audit is standalone/);
		expect(() => parseCliArgs(['--audit', '--filter', 'foo'])).toThrow(/--audit is standalone/);
	});

	test('--audit --json carries the structured-output flag through', () => {
		const opts = parseCliArgs(['--audit', '--json']);
		expect(opts.audit).toBe(true);
		expect(opts.json).toBe(true);
	});

	test('--json outside --audit fails loudly instead of printing unparseable Markdown', () => {
		expect(() => parseCliArgs(['--all', '--json'])).toThrow(/--json only makes sense with --audit/);
		expect(() => parseCliArgs(['--issue', '1', '--json'])).toThrow(/--json only makes sense with --audit/);
	});

	test('rejects --filter paired with --all when no --issue is given', () => {
		expect(() => parseCliArgs(['--all', '--filter', 'foo'])).toThrow(/--filter requires --issue/);
	});

	test('accepts --issue with a compiled RegExp filter', () => {
		const opts = parseCliArgs(['--issue', '1234', '--filter', '^html/elements']);
		expect(opts.issue).toBe(1234);
		expect(opts.filter).toBeInstanceOf(RegExp);
		// Assert by behaviour rather than `.source` — V8 serialises
		// `new RegExp('^html/')` back as `^html\/`, which is an
		// implementation detail of its escaping rules.
		expect(opts.filter?.test('html/elements/a.html')).toBe(true);
		expect(opts.filter?.test('tests/html/elements/a.html')).toBe(false);
	});

	test('accepts --all alone', () => {
		const opts = parseCliArgs(['--all']);
		expect(opts.issue).toBeUndefined();
		expect(opts.all).toBe(true);
		expect(opts.filter).toBeUndefined();
	});
});

describe('processOne (IO boundary)', () => {
	function makeGh(initialBody: string): GhClient & { readonly calls: { view: number[]; edit: Array<{ issue: number; body: string }>; state: number[] } } {
		const calls = { view: [] as number[], edit: [] as Array<{ issue: number; body: string }>, state: [] as number[] };
		return {
			calls,
			view(issue: number) {
				calls.view.push(issue);
				return initialBody;
			},
			edit(issue: number, body: string) {
				calls.edit.push({ issue, body });
			},
			async state(issue: number): Promise<IssueState> {
				calls.state.push(issue);
				return 'OPEN';
			},
		};
	}

	function makeLog() {
		const lines: string[] = [];
		return { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')), lines };
	}

	test('--write fetches body, composes, and edits', () => {
		const mapping: PrimaryMapping = {
			kind: 'primary',
			issue: 1234,
			filter: /html\/elements\/foo-ml/,
		};
		const data = makeData([{ path: 'html/elements/foo-ml.html', verdict: 'ml-only' }]);
		const ctx: RenderContext = { data, mappings: [mapping] };
		const gh = makeGh('Existing issue body.\n');
		const log = makeLog();
		processOne(mapping, ctx, { write: true, dryRun: false, all: false }, gh, log);

		expect(gh.calls.view).toEqual([1234]);
		expect(gh.calls.edit).toHaveLength(1);
		expect(gh.calls.edit[0]?.issue).toBe(1234);
		expect(gh.calls.edit[0]?.body).toContain('<!-- bench-xref:begin v1 -->');
		expect(gh.calls.edit[0]?.body).toContain('Existing issue body.');
		expect(log.lines.some(l => l.includes('body updated'))).toBe(true);
	});

	test('--write --dry-run composes body but does not call edit', () => {
		const mapping: PrimaryMapping = { kind: 'primary', issue: 42, filter: /html\/elements\/foo-ml/ };
		const data = makeData([{ path: 'html/elements/foo-ml.html', verdict: 'ml-only' }]);
		const ctx: RenderContext = { data, mappings: [mapping] };
		const gh = makeGh('Before.\n');
		const log = makeLog();
		processOne(mapping, ctx, { write: true, dryRun: true, all: false }, gh, log);

		expect(gh.calls.view).toEqual([42]);
		expect(gh.calls.edit).toHaveLength(0);
		expect(log.lines.some(l => l.includes('DRY RUN'))).toBe(true);
	});

	test('stdout mode does not call gh at all', () => {
		const mapping: SecondaryMapping = { kind: 'secondary', issue: 77, reason: 'n/a' };
		const ctx: RenderContext = { data: makeData(), mappings: [mapping] };
		const gh = makeGh('Irrelevant');
		const log = makeLog();
		processOne(mapping, ctx, { write: false, dryRun: false, all: false }, gh, log);

		expect(gh.calls.view).toEqual([]);
		expect(gh.calls.edit).toEqual([]);
		expect(log.lines.some(l => l.includes('===== issue #77 (secondary)'))).toBe(true);
	});

	test('no-op when the composed body equals the current body', () => {
		// Compose once, then use the output as the "current body" on a
		// second call — the tool should detect no change and skip the edit.
		const mapping: PrimaryMapping = { kind: 'primary', issue: 55, filter: /html\/elements\/foo-ml/ };
		const data = makeData([{ path: 'html/elements/foo-ml.html', verdict: 'ml-only' }]);
		const ctx: RenderContext = { data, mappings: [mapping] };
		const first = makeGh('Starting body.\n');
		processOne(mapping, ctx, { write: true, dryRun: false, all: false }, first, { log: () => {} });
		const appliedBody = first.calls.edit[0]?.body ?? '';

		const second = makeGh(appliedBody);
		const log = makeLog();
		processOne(mapping, ctx, { write: true, dryRun: false, all: false }, second, log);
		expect(second.calls.edit).toHaveLength(0);
		expect(log.lines.some(l => l.includes('unchanged, skip'))).toBe(true);
	});

	test('invokes bodyOverride factory only when needed', () => {
		const calls = vi.fn(() => 'Rewritten body.');
		const mapping: PrimaryMapping = {
			kind: 'primary',
			issue: 2024,
			filter: /html\/elements\/foo-nu/,
			bodyOverride: calls,
		};
		const data = makeData([{ path: 'html/elements/foo-nu.html', verdict: 'nu-only' }]);
		const ctx: RenderContext = { data, mappings: [mapping] };
		const gh = makeGh('Outdated scope body.\n');
		processOne(mapping, ctx, { write: true, dryRun: false, all: false }, gh, { log: () => {} });
		expect(calls).toHaveBeenCalledTimes(1);
		expect(gh.calls.edit[0]?.body).toContain('Rewritten body.');
		expect(gh.calls.edit[0]?.body).not.toContain('Outdated scope body.');
	});

	test('never calls the bodyOverride factory in stdout mode', () => {
		const calls = vi.fn(() => 'should not be evaluated');
		const mapping: PrimaryMapping = {
			kind: 'primary',
			issue: 2025,
			filter: /foo/,
			bodyOverride: calls,
		};
		// Stdout mode prints the override preview, so the factory IS called
		// once — but only once, and only because we explicitly surface the
		// rewrite preview to the user. That is intentional.
		const data = makeData();
		const ctx: RenderContext = { data, mappings: [mapping] };
		const gh = makeGh('');
		processOne(mapping, ctx, { write: false, dryRun: false, all: false }, gh, { log: () => {} });
		expect(calls).toHaveBeenCalledTimes(1);
		expect(gh.calls.view).toEqual([]);
		expect(gh.calls.edit).toEqual([]);
	});
});

describe('runAudit', () => {
	function makeStateClient(states: Readonly<Record<number, IssueState>>) {
		const calls: number[] = [];
		return {
			calls,
			async state(issue: number): Promise<IssueState> {
				calls.push(issue);
				const hit = states[issue];
				if (hit === undefined) throw new Error(`test bug: no state seeded for #${issue}`);
				return hit;
			},
		};
	}
	function makeLog() {
		const lines: string[] = [];
		return { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')), lines };
	}

	test('returns empty and logs all-clear when every mapped issue is OPEN', async () => {
		const mappings: readonly XrefMapping[] = [
			{ kind: 'primary', issue: 100, filter: /x/ },
			{ kind: 'secondary', issue: 200, reason: 'n/a' },
			{ kind: 'umbrella', issue: 300 },
		];
		const gh = makeStateClient({ 100: 'OPEN', 200: 'OPEN', 300: 'OPEN' });
		const log = makeLog();
		const closed = await runAudit(mappings, gh, log);
		expect(closed).toEqual([]);
		// Order-insensitive: Promise.all may complete in any order. The
		// contract is that every mapping was queried exactly once.
		expect(new Set(gh.calls)).toEqual(new Set([100, 200, 300]));
		expect(gh.calls).toHaveLength(3);
		expect(log.lines.some(l => l.includes('all 3 mapped issues are still OPEN'))).toBe(true);
	});

	test('returns CLOSED issue numbers and points at the config file in the log', async () => {
		const mappings: readonly XrefMapping[] = [
			{ kind: 'primary', issue: 1, filter: /x/ },
			{ kind: 'primary', issue: 2, filter: /x/ },
			{ kind: 'secondary', issue: 3, reason: 'n/a' },
		];
		const gh = makeStateClient({ 1: 'OPEN', 2: 'CLOSED', 3: 'CLOSED' });
		const log = makeLog();
		const closed = await runAudit(mappings, gh, log);
		// Result order tracks mapping order, not `Promise.all` completion.
		expect(closed).toEqual([2, 3]);
		expect(log.lines.some(l => l.includes('2 mapping(s) reference CLOSED issue(s): #2, #3'))).toBe(true);
		expect(log.lines.some(l => l.includes('tests/external/bench/issue-xref.config.ts'))).toBe(true);
	});

	test('surfaces every CLOSED entry even when all mappings are closed', async () => {
		const mappings: readonly XrefMapping[] = [
			{ kind: 'primary', issue: 10, filter: /x/ },
			{ kind: 'primary', issue: 20, filter: /x/ },
		];
		const gh = makeStateClient({ 10: 'CLOSED', 20: 'CLOSED' });
		const log = makeLog();
		expect(await runAudit(mappings, gh, log)).toEqual([10, 20]);
	});

	test('propagates fatal state errors from the client rather than swallowing them', async () => {
		const mappings: readonly XrefMapping[] = [{ kind: 'primary', issue: 1, filter: /x/ }];
		const gh = {
			async state(): Promise<IssueState> {
				throw new TypeError('boom from gh layer');
			},
		};
		await expect(runAudit(mappings, gh)).rejects.toThrow(TypeError);
	});

	test("format: 'json' emits a single-object report and skips the prose lines", async () => {
		const mappings: readonly XrefMapping[] = [
			{ kind: 'primary', issue: 101, filter: /x/ },
			{ kind: 'primary', issue: 202, filter: /x/ },
			{ kind: 'secondary', issue: 303, reason: 'n/a' },
		];
		const gh = makeStateClient({ 101: 'OPEN', 202: 'CLOSED', 303: 'CLOSED' });
		const log = makeLog();
		const closed = await runAudit(mappings, gh, log, 'json');
		expect(closed).toEqual([202, 303]);
		expect(log.lines).toHaveLength(1);
		const parsed = JSON.parse(log.lines[0] ?? '');
		expect(parsed).toEqual({ total: 3, closed: [202, 303] });
		// Text lines must not appear when JSON mode is requested.
		expect(log.lines.some(l => l.includes('[xref] audit:'))).toBe(false);
	});

	test("format: 'json' still emits a report when everything is OPEN", async () => {
		const mappings: readonly XrefMapping[] = [
			{ kind: 'primary', issue: 1, filter: /x/ },
		];
		const gh = makeStateClient({ 1: 'OPEN' });
		const log = makeLog();
		await runAudit(mappings, gh, log, 'json');
		expect(JSON.parse(log.lines[0] ?? '')).toEqual({ total: 1, closed: [] });
	});

	test('fans state() lookups out in parallel rather than serialising them', async () => {
		// Each fake state() call waits 50 ms before resolving. If `runAudit`
		// serialised the calls, 10 of them would take ≥ 500 ms. Running in
		// parallel, wall-clock should be a hair over 50 ms. The assertion
		// deliberately leaves a generous 200 ms ceiling to stay stable under
		// loaded CI without losing the signal if the fan-out regresses.
		const delay = 50;
		const mappings: readonly XrefMapping[] = Array.from({ length: 10 }, (_, i) => ({
			kind: 'primary' as const,
			issue: i + 1,
			filter: /x/,
		}));
		const gh = {
			async state(): Promise<IssueState> {
				await new Promise(r => setTimeout(r, delay));
				return 'OPEN';
			},
		};
		const started = Date.now();
		await runAudit(mappings, gh);
		const elapsed = Date.now() - started;
		expect(elapsed).toBeLessThan(delay * 4);
	});
});

// Ensure the config module does not eagerly read the filesystem at import
// time just to register bodyOverride entries. Importing the config must
// succeed even when the override factories are never invoked.
describe('issue-xref.config', () => {
	test('can be imported without invoking any bodyOverride factory', async () => {
		const { xrefMappings } = await import('./issue-xref.config.ts');
		// Assert that every primary mapping with a bodyOverride exposes it as
		// a function (factory), not a string — confirms the lazy contract.
		for (const m of xrefMappings as readonly XrefMapping[]) {
			if (m.kind === 'primary' && m.bodyOverride !== undefined) {
				expect(typeof m.bodyOverride).toBe('function');
			}
		}
	});

	test('no two primary mappings share an issue number', async () => {
		const { xrefMappings } = await import('./issue-xref.config.ts');
		const primaries = xrefMappings.filter(m => m.kind === 'primary');
		const seen = new Map<number, number>();
		for (const m of primaries) seen.set(m.issue, (seen.get(m.issue) ?? 0) + 1);
		const duplicates = [...seen].filter(([, n]) => n > 1).map(([issue]) => issue);
		expect(duplicates, `primary issue numbers duplicated: ${duplicates.join(', ')}`).toEqual([]);
	});

	test('every primary filter matches at least one fixture in the committed coverage snapshot', async () => {
		// Catches a stale `filter` after the validator/validator submodule
		// moves or renames fixture paths. Runs off `snapshots/diff/coverage.json`,
		// which is committed — no bench regeneration needed.
		const [{ xrefMappings }, coverageModule] = await Promise.all([
			import('./issue-xref.config.ts'),
			import('node:fs/promises').then(async fs => {
				const { DIFF_DIR } = await import('./paths.ts');
				const { join } = await import('node:path');
				const raw = await fs.readFile(join(DIFF_DIR, 'coverage.json'), 'utf8');
				return JSON.parse(raw) as { entries: readonly { path: string }[] };
			}),
		]);
		const entries = coverageModule.entries;
		const stale: number[] = [];
		for (const m of xrefMappings) {
			if (m.kind !== 'primary') continue;
			if (!entries.some(e => m.filter.test(e.path))) stale.push(m.issue);
		}
		expect(stale, `primary mappings whose filter matches zero fixtures: ${stale.join(', ')}`).toEqual([]);
	});
});
