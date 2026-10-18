import type { Citation, Problem, ProblemKind } from './types.ts';

/** First line of every report; the workflow finds its Issue by it. */
export const REPORT_MARKER = '<!-- spec-citation-watch -->';

export type ReportOptions = {
	readonly date: string;
	/** Size of the summary, kept under GitHub's 65,536-character limit on an Issue body or comment. */
	readonly maxChars?: number;
	readonly maxDiffLines?: number;
};

export type RenderedReport = {
	/** Fits an Issue comment: long diffs are cut and findings past the size limit are left out. */
	readonly summary: string;
	/** Everything, for the job summary. */
	readonly full: string;
	readonly findings: number;
	readonly failures: number;
};

const HEADINGS: Readonly<Record<ProblemKind, string>> = {
	'unprocessed-source': 'Cited ReSpec source is not rendered',
	'page-missing': 'Page no longer exists',
	'anchor-missing': 'Anchor not found',
	'anchor-empty': 'Anchor has no text',
	'quote-mismatch': 'Quoted text not found in the cited section',
	'orphan-quote': 'Blockquote without a specification link',
	'inline-quote': 'Specification sentence quoted inline',
	'no-fragment': 'Citation without a fragment',
	'directive-missing': 'Text fragment no longer matches',
	'secno-stale': 'Section number is out of date',
	'section-changed': 'Cited section changed',
	'fetch-failed': 'Page could not be fetched',
};

/**
 * The translation at momdo.github.io has the pages and ids of the original, so
 * a citation of one and a citation of the other are the same citation, and a
 * report on either should point at both.
 */
function canonicalKey(citation: Citation): string {
	const page = citation.page.replace('https://momdo.github.io/html/', 'https://html.spec.whatwg.org/multipage/');
	return `${page}#${citation.fragment ?? ''}`;
}

function ruleOf(file: string): string | null {
	return /^packages\/@markuplint\/rules\/src\/([^/]+)\//.exec(file)?.[1] ?? null;
}

function indent(lines: readonly string[]): string {
	return lines.map(line => (line === '' ? '' : `  ${line}`)).join('\n');
}

function renderItem(problem: Problem, citations: readonly Citation[], maxDiffLines: number): string {
	const own = problem.citation;
	const place = own === null ? problem.quote : own;
	const where = place === undefined ? null : `${place.file}:${place.line}`;
	const rule = place === undefined ? null : ruleOf(place.file);
	const head = [rule === null ? null : `\`${rule}\``, where === null ? null : `\`${where}\``]
		.filter(part => part !== null)
		.join(' ');
	const lines = [head === '' ? `- ${problem.message}` : `- ${head}`];
	const body: string[] = head === '' ? [] : [problem.message];

	if (own !== null) {
		body.push(`Source: <${own.url}>`);
		const others = citations
			.filter(c => canonicalKey(c) === canonicalKey(own) && !(c.file === own.file && c.line === own.line))
			.map(c => `\`${c.file}:${c.line}\``);
		if (others.length > 0) {
			body.push(`Also cited at: ${others.join(', ')}`);
		}
	}
	if (problem.quote !== undefined) {
		body.push('```text', problem.quote.text.replaceAll('```', "'''"), '```');
	}
	if (problem.diff !== undefined) {
		const diffLines = problem.diff.split('\n');
		const shown =
			diffLines.length > maxDiffLines
				? [...diffLines.slice(0, maxDiffLines), `… ${diffLines.length - maxDiffLines} more lines`]
				: diffLines;
		body.push(
			'',
			'<details><summary>Diff of the cited section</summary>',
			'',
			'```diff',
			...shown,
			'```',
			'',
			'</details>',
		);
	}
	return [...lines, indent(body)].filter(part => part !== '').join('\n');
}

type Block = { readonly text: string; readonly isFinding: boolean };

function blocksOf(problems: readonly Problem[], citations: readonly Citation[], maxDiffLines: number): Block[] {
	const blocks: Block[] = [];
	for (const kind of new Set(problems.map(p => p.kind))) {
		const group = problems.filter(p => p.kind === kind);
		for (const [i, problem] of group.entries()) {
			const heading = i === 0 ? `### ${HEADINGS[kind]} (${group.length})\n\n` : '';
			blocks.push({
				text: `${heading}${renderItem(problem, citations, maxDiffLines)}\n`,
				isFinding: kind !== 'fetch-failed',
			});
		}
	}
	return blocks;
}

function assemble(intro: string, blocks: readonly Block[], limit: number): string {
	let text = intro;
	for (const [i, block] of blocks.entries()) {
		if (text.length + block.text.length > limit) {
			const left = blocks.slice(i).filter(b => b.isFinding).length;
			return left === 0
				? text
				: `${text}_${left} more ${left === 1 ? 'finding' : 'findings'} in the full report._\n`;
		}
		text += `${block.text}\n`;
	}
	return text;
}

/**
 * Renders the findings as the Markdown the workflow posts to an Issue.
 *
 * Text that comes from a spec or from a quote is placed in code spans and
 * fences: spec prose contains `@` and `#123`, which GitHub would turn into a
 * mention and a cross-reference.
 */
export function renderReport(
	problems: readonly Problem[],
	citations: readonly Citation[],
	options: ReportOptions,
): RenderedReport {
	const { date, maxChars = 60_000, maxDiffLines = 60 } = options;
	const failures = problems.filter(p => p.kind === 'fetch-failed').length;
	const findings = problems.length - failures;

	const title = [REPORT_MARKER, `## Specification citations (${date})`, ''];
	if (problems.length === 0) {
		const text = [...title, 'No findings.', ''].join('\n');
		return { summary: text, full: text, findings, failures };
	}
	const counts = [
		findings > 0 ? `${findings} ${findings === 1 ? 'finding' : 'findings'}` : null,
		failures > 0 ? `${failures} ${failures === 1 ? 'page' : 'pages'} could not be fetched` : null,
	].filter(part => part !== null);
	const intro = [...title, `${counts.join(', ')}.`, '', ''].join('\n');

	return {
		summary: assemble(intro, blocksOf(problems, citations, maxDiffLines), maxChars),
		full: assemble(intro, blocksOf(problems, citations, Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY),
		findings,
		failures,
	};
}
