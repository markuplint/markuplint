import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { isFatalError } from '@markuplint/shared';

import { readJson } from './fs-utils.ts';
import { isCliEntry } from './is-cli-entry.ts';
import { xrefMappings, type PrimaryMapping, type SecondaryMapping, type UmbrellaMapping, type XrefMapping } from './issue-xref.config.ts';
import { DIFF_DIR, META_PATH } from './paths.ts';
import { join } from 'node:path';
import type { Coverage, CoverageEntry, Meta, OverDetectionEntry, Verdict } from './types.ts';

const BEGIN_MARKER = '<!-- bench-xref:begin v1 -->';
const END_MARKER = '<!-- bench-xref:end -->';
const SECTION_HEADING = '## Benchmark cross-reference';

type Entries<T> = { readonly entries: readonly T[] };

export type BenchData = {
	readonly coverage: Coverage;
	readonly mlOnly: readonly OverDetectionEntry[];
	readonly nuOnly: readonly OverDetectionEntry[];
	readonly nuOver: readonly OverDetectionEntry[];
	readonly meta: Meta;
};

export type RenderContext = {
	readonly data: BenchData;
	readonly mappings: readonly XrefMapping[];
};

/** Load every derivative JSON + meta. Throws if any are missing. */
export async function loadBenchData(): Promise<BenchData> {
	const coveragePath = join(DIFF_DIR, 'coverage.json');
	const mlOnlyPath = join(DIFF_DIR, 'markuplint-only.json');
	const nuOnlyPath = join(DIFF_DIR, 'nu-only.json');
	const nuOverPath = join(DIFF_DIR, 'nu-over.json');
	for (const p of [coveragePath, mlOnlyPath, nuOnlyPath, nuOverPath, META_PATH]) {
		if (!existsSync(p)) {
			throw new Error(`missing benchmark artefact ${p}; run yarn bench:update (or at least yarn bench:compare) first`);
		}
	}
	const [coverage, mlOnly, nuOnly, nuOver, meta] = await Promise.all([
		readJson<Coverage>(coveragePath),
		readJson<Entries<OverDetectionEntry>>(mlOnlyPath),
		readJson<Entries<OverDetectionEntry>>(nuOnlyPath),
		readJson<Entries<OverDetectionEntry>>(nuOverPath),
		readJson<Meta>(META_PATH),
	]);
	return { coverage, mlOnly: mlOnly.entries, nuOnly: nuOnly.entries, nuOver: nuOver.entries, meta };
}

/** Short, human-friendly sync-time reference line used in every block. */
export function buildSyncLine(meta: Meta): string {
	const submoduleShort = meta.submoduleSha.slice(0, 7);
	const imageDigestShort = meta.nuValidatorImage.includes('@sha256:')
		? meta.nuValidatorImage.split('@sha256:')[1]?.slice(0, 12) ?? '?'
		: meta.nuValidatorImage;
	const when = meta.generatedAt.slice(0, 19).replace('T', ' ');
	return `_Sync'd from \`tests/external/snapshots/\` (submodule=${submoduleShort}, nu-validator@sha256:${imageDigestShort}, markuplint=${meta.markuplintVersion}, generated=${when} UTC)._`;
}

function tallyVerdicts(entries: readonly CoverageEntry[]): Record<Verdict, number> {
	const base: Record<Verdict, number> = {
		'match-error': 0,
		'match-clean': 0,
		'ml-only': 0,
		'nu-only': 0,
		'nu-over': 0,
	};
	for (const e of entries) base[e.verdict] += 1;
	return base;
}

function findIds(path: string, mlOnly: readonly OverDetectionEntry[], nuOnly: readonly OverDetectionEntry[], nuOver: readonly OverDetectionEntry[]): string {
	const ml = mlOnly.find(e => e.path === path);
	if (ml?.ruleIds?.length) return ml.ruleIds.map(id => `\`${id}\``).join(', ');
	const only = nuOnly.find(e => e.path === path);
	if (only?.nuMessageIds?.length) return only.nuMessageIds.map(id => `\`${id}\``).join(', ');
	const over = nuOver.find(e => e.path === path);
	if (over?.nuMessageIds?.length) return over.nuMessageIds.map(id => `\`${id}\``).join(', ');
	return '—';
}

/** Primary block: a verdict tally + one row per matched fixture. */
export function buildPrimaryBlock(mapping: PrimaryMapping, data: BenchData): string {
	const matches = data.coverage.entries.filter(e => mapping.filter.test(e.path));
	const tally = tallyVerdicts(matches);
	const rows = matches
		.slice()
		.sort((a, b) => a.path.localeCompare(b.path))
		.map(e => `| \`${e.path}\` | ${e.verdict} | ${findIds(e.path, data.mlOnly, data.nuOnly, data.nuOver)} |`)
		.join('\n');

	const lines = [
		SECTION_HEADING,
		'',
		BEGIN_MARKER,
		buildSyncLine(data.meta),
		'',
		`Filter: \`${mapping.filter.source}\` → **${matches.length}** fixtures. Verdict tally: match-error=${tally['match-error']}, match-clean=${tally['match-clean']}, ml-only=${tally['ml-only']}, nu-only=${tally['nu-only']}, nu-over=${tally['nu-over']}.`,
	];
	if (mapping.note) {
		lines.push('', mapping.note);
	}
	if (matches.length > 0) {
		lines.push(
			'',
			'| fixture | verdict | nu id / ml rule |',
			'| --- | --- | --- |',
			rows,
		);
	} else {
		lines.push('', '_No fixtures matched the filter._');
	}
	lines.push(
		'',
		'Reproduce: see [`tests/external/CLAUDE.md`](https://github.com/markuplint/markuplint/blob/dev/tests/external/CLAUDE.md) "Auditing a claim against the benchmark".',
		END_MARKER,
	);
	return lines.join('\n');
}

/** Secondary block: explicit "not bench-auditable" stub. */
export function buildSecondaryBlock(mapping: SecondaryMapping, data: BenchData): string {
	return [
		SECTION_HEADING,
		'',
		BEGIN_MARKER,
		buildSyncLine(data.meta),
		'',
		`**Not directly verifiable against the current nu-validator fixture suite.** Reason: ${mapping.reason}`,
		'',
		'Fixtures could be authored manually under a separate tree, or contributed upstream to [`validator/validator`](https://github.com/validator/validator). See [`tests/external/CLAUDE.md`](https://github.com/markuplint/markuplint/blob/dev/tests/external/CLAUDE.md) "Auditing a claim against the benchmark" for the audit workflow.',
		END_MARKER,
	].join('\n');
}

/** Umbrella block: roll-up of every primary issue's headline numbers. */
export function buildUmbrellaBlock(mapping: UmbrellaMapping, ctx: RenderContext): string {
	const primaryByNumber = new Map<number, PrimaryMapping>();
	for (const m of ctx.mappings) {
		if (m.kind === 'primary') primaryByNumber.set(m.issue, m);
	}

	const rows: string[] = [];
	for (const issue of mapping.primaryIssues) {
		const p = primaryByNumber.get(issue);
		if (!p) {
			rows.push(`| #${issue} | — | primary mapping not found in config |`);
			continue;
		}
		const matches = ctx.data.coverage.entries.filter(e => p.filter.test(e.path));
		const tally = tallyVerdicts(matches);
		const tallyCells = `match-error=${tally['match-error']}, match-clean=${tally['match-clean']}, ml-only=${tally['ml-only']}, nu-only=${tally['nu-only']}, nu-over=${tally['nu-over']}`;
		rows.push(`| #${issue} | ${matches.length} | ${tallyCells} |`);
	}

	return [
		SECTION_HEADING,
		'',
		BEGIN_MARKER,
		buildSyncLine(ctx.data.meta),
		'',
		'Triage roll-up across the primary issues covered by this benchmark:',
		'',
		'| Issue | Fixtures | Verdict tally |',
		'| --- | ---: | --- |',
		...rows,
		'',
		'Each row links to the per-issue cross-reference block inside that issue. See [`tests/external/CLAUDE.md`](https://github.com/markuplint/markuplint/blob/dev/tests/external/CLAUDE.md) for the workflow.',
		END_MARKER,
	].join('\n');
}

export function buildBlock(mapping: XrefMapping, ctx: RenderContext): string {
	switch (mapping.kind) {
		case 'primary':
			return buildPrimaryBlock(mapping, ctx.data);
		case 'secondary':
			return buildSecondaryBlock(mapping, ctx.data);
		case 'umbrella':
			return buildUmbrellaBlock(mapping, ctx);
	}
}

/**
 * Compose the final issue body.
 *
 * 1. If `bodyOverride` is set (primary only), that becomes the new base.
 * 2. If a prior `<!-- bench-xref:begin v1 --> ... <!-- bench-xref:end -->`
 *    range exists, replace it (and its immediate `## Benchmark
 *    cross-reference` heading if adjacent) with `block`.
 * 3. Otherwise, append `\n\n${block}\n` at the end.
 *
 * Idempotent: repeat calls with the same inputs produce the same output.
 */
export function composeBody(currentBody: string, block: string, bodyOverride?: string): string {
	const base = bodyOverride ?? currentBody;
	const trimmed = base.replace(/\r\n/g, '\n').replace(/\s+$/, '');

	// Remove every existing xref section (heading + marker range) to rebuild.
	// `g` flag is required so a body that accumulated multiple marker pairs
	// (manual edits, merge conflicts, prior buggy runs) collapses to one.
	const stripped = trimmed.replace(
		new RegExp(
			// optional preceding heading
			`(\\n*## Benchmark cross-reference\\n*)?` +
				// begin marker through end marker, incl. everything between
				`\\n*${escapeRegExp(BEGIN_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}\\n*`,
			'g',
		),
		'\n\n',
	).replace(/\s+$/, '');

	return `${stripped}\n\n${block}\n`;
}

function escapeRegExp(source: string): string {
	return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// IO + CLI (side-effectful, not unit-tested directly).
// ---------------------------------------------------------------------------

function ghJson<T>(args: readonly string[]): T {
	const out = execFileSync('gh', args as string[], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	return JSON.parse(out) as T;
}

function fetchIssueBody(issue: number): string {
	const { body } = ghJson<{ body: string }>(['issue', 'view', String(issue), '--json', 'body']);
	return body ?? '';
}

function writeIssueBody(issue: number, body: string): void {
	// Pass the body through stdin rather than as an argv string so Windows'
	// 32KB CreateProcess limit does not cap the maximum issue length we can
	// sync, and so body text containing shell-meaningful characters never
	// needs to round-trip through the command line.
	execFileSync('gh', ['issue', 'edit', String(issue), '--body-file', '-'], {
		input: body,
		stdio: ['pipe', 'inherit', 'inherit'],
	});
}

type CliOptions = {
	readonly issue?: number;
	readonly all: boolean;
	readonly dryRun: boolean;
	readonly write: boolean;
	readonly filter?: RegExp;
};

export function parseCliArgs(args: readonly string[] = process.argv.slice(2)): CliOptions {
	const { values } = parseArgs({
		args: [...args],
		options: {
			issue: { type: 'string' },
			all: { type: 'boolean' },
			'dry-run': { type: 'boolean' },
			write: { type: 'boolean' },
			filter: { type: 'string' },
		},
	});
	let issue: number | undefined;
	if (values.issue !== undefined) {
		const parsed = Number.parseInt(values.issue, 10);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			throw new Error(`invalid --issue ${JSON.stringify(values.issue)}: expected a positive integer`);
		}
		issue = parsed;
	}
	const all = values.all ?? false;
	if (issue === undefined && !all) {
		throw new Error('provide either --issue <N> or --all');
	}
	if (all && values.filter !== undefined && issue === undefined) {
		// --filter is an ad-hoc override that only makes sense paired with a
		// single --issue. Silently applying it across --all would mask the
		// configured per-issue filters.
		throw new Error('--filter requires --issue; drop --all or drop --filter');
	}
	return {
		issue,
		all,
		dryRun: values['dry-run'] ?? false,
		write: values.write ?? false,
		filter: values.filter ? new RegExp(values.filter) : undefined,
	};
}

function processOne(mapping: XrefMapping, ctx: RenderContext, opts: CliOptions): void {
	const block = buildBlock(mapping, ctx);
	const override = mapping.kind === 'primary' ? mapping.bodyOverride : undefined;

	if (!opts.write) {
		// stdout mode (default and --dry-run)
		console.log(`\n===== issue #${mapping.issue} (${mapping.kind}) =====\n`);
		console.log(block);
		if (override !== undefined) {
			console.log('\n----- bodyOverride present (issue body will be replaced under --write) -----\n');
			console.log(override);
		}
		return;
	}

	const currentBody = fetchIssueBody(mapping.issue);
	const nextBody = composeBody(currentBody, block, override);
	if (opts.dryRun) {
		console.log(`\n===== DRY RUN #${mapping.issue} (${mapping.kind}) — new body preview =====\n`);
		console.log(nextBody);
		return;
	}
	if (currentBody === nextBody) {
		console.log(`[xref] #${mapping.issue}: unchanged, skip`);
		return;
	}
	writeIssueBody(mapping.issue, nextBody);
	console.log(`[xref] #${mapping.issue}: body updated`);
}

async function main(): Promise<void> {
	const opts = parseCliArgs();
	const data = await loadBenchData();
	const ctx: RenderContext = { data, mappings: xrefMappings };

	const adhoc = opts.filter && opts.issue !== undefined
		? ({
				kind: 'primary',
				issue: opts.issue,
				filter: opts.filter,
			} satisfies PrimaryMapping)
		: null;

	if (adhoc) {
		processOne(adhoc, ctx, opts);
		return;
	}

	const selected = opts.all
		? xrefMappings
		: xrefMappings.filter(m => m.issue === opts.issue);

	if (selected.length === 0) {
		throw new Error(`no mapping for issue ${opts.issue}; add one to issue-xref.config.ts`);
	}

	for (const mapping of selected) {
		try {
			processOne(mapping, ctx, opts);
		} catch (error) {
			if (isFatalError(error)) throw error;
			console.error(`[xref] #${mapping.issue} failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

if (isCliEntry(import.meta.url)) {
	main().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
