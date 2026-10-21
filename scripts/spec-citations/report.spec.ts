import { describe, expect, test } from 'vitest';

import type { Citation, Problem, Quote } from './types.ts';

import { REPORT_MARKER, renderReport } from './report.ts';

const WHATWG = 'https://html.spec.whatwg.org/multipage/syntax.html';
const MOMDO = 'https://momdo.github.io/html/syntax.html';
const DATE = '2026-10-18';

const cite = (overrides: Partial<Citation> = {}): Citation => ({
	file: 'packages/@markuplint/rules/src/case-sensitive-attr-name/README.md',
	line: 12,
	url: `${WHATWG}#attributes-2`,
	page: WHATWG,
	fragment: 'attributes-2',
	textDirective: null,
	secno: null,
	quotes: [],
	...overrides,
});

const jaCite = cite({
	file: 'packages/@markuplint/rules/src/case-sensitive-attr-name/README.ja.md',
	line: 13,
	url: `${MOMDO}#attributes-2`,
	page: MOMDO,
});

const quote = (text: string): Quote => ({ text, file: 'r/README.md', line: 9, group: 'g' });

const problem = (overrides: Partial<Problem> = {}): Problem => ({
	kind: 'anchor-missing',
	citation: cite(),
	message: 'The anchor is gone',
	...overrides,
});

describe('renderReport', () => {
	test('[report-001] starts with the marker the workflow uses to find the Issue', () => {
		expect(renderReport([problem()], [cite()], { date: DATE }).summary.startsWith(`${REPORT_MARKER}\n`)).toBe(true);
	});

	test('[report-002] names the rule, the place and the source of each finding', () => {
		const { summary } = renderReport([problem()], [cite()], { date: DATE });
		expect(summary).toContain('`case-sensitive-attr-name`');
		expect(summary).toContain('`packages/@markuplint/rules/src/case-sensitive-attr-name/README.md:12`');
		expect(summary).toContain(`<${WHATWG}#attributes-2>`);
		expect(summary).toContain('The anchor is gone');
	});

	test('[report-003] groups findings under a heading per kind, with a count', () => {
		const problems = [
			problem(),
			problem({ citation: cite({ line: 30 }) }),
			problem({ kind: 'secno-stale', message: 'Cites §1' }),
		];
		const { summary } = renderReport(problems, [cite()], { date: DATE });
		expect(summary).toContain('3 findings.\n\n### Anchor not found (2)');
		expect(summary).toContain('### Section number is out of date (1)');
		expect(summary.indexOf('Anchor not found')).toBeLessThan(summary.indexOf('Section number is out of date'));
	});

	test('[report-004] lists the same citation in the other language, matching momdo to the original page', () => {
		const { summary } = renderReport([problem()], [cite(), jaCite], { date: DATE });
		expect(summary).toContain(
			'Also cited at: `packages/@markuplint/rules/src/case-sensitive-attr-name/README.ja.md:13`',
		);
	});

	test('[report-005] shows a quote in a fence that a backtick fence inside it cannot close', () => {
		const p = problem({
			kind: 'quote-mismatch',
			message: 'The quoted text is not in the cited section',
			quote: quote('Use ```code``` and @someone and #123.'),
		});
		const { summary } = renderReport([p], [cite()], { date: DATE });
		expect(summary).toContain("  ```text\n  Use '''code''' and @someone and #123.\n  ```");
	});

	test('[report-006] puts a diff in a collapsed block and cuts a long one', () => {
		const diff = Array.from({ length: 10 }, (_, i) => `+line ${i}`).join('\n');
		const p = problem({ kind: 'section-changed', message: 'The cited section changed since 2026-09-01', diff });
		const { summary, full } = renderReport([p], [cite()], { date: DATE, maxDiffLines: 4 });
		expect(summary).toContain('<details><summary>Diff of the cited section</summary>');
		expect(summary).toContain('  ```diff\n  +line 0\n  +line 1\n  +line 2\n  +line 3\n  … 6 more lines\n  ```');
		expect(full).toContain('+line 9');
	});

	test('[report-007] keeps the summary under the size limit and says how many findings it left out', () => {
		const problems = Array.from({ length: 50 }, (_, i) =>
			problem({ citation: cite({ line: i + 1 }), message: 'x'.repeat(200) }),
		);
		const { summary, full } = renderReport(problems, [cite()], { date: DATE, maxChars: 3000 });
		expect(summary.length).toBeLessThan(3500);
		expect(summary).toMatch(/\d+ more findings? in the full report/);
		expect(full.length).toBeGreaterThan(10_000);
		expect(full).not.toMatch(/more findings? in the full report/);
	});

	test('[report-008] counts a page that could not be fetched as a failure, not a finding', () => {
		const result = renderReport(
			[problem({ kind: 'fetch-failed', citation: null, message: 'https://example.com: HTTP 503' })],
			[],
			{ date: DATE },
		);
		expect(result).toMatchObject({ findings: 0, failures: 1 });
		expect(result.summary).toContain('1 page could not be fetched');
	});

	test('[report-009] says so when there is nothing to report', () => {
		const result = renderReport([], [], { date: DATE });
		expect(result).toMatchObject({ findings: 0, failures: 0 });
		expect(result.summary).toContain('No findings');
	});
});
