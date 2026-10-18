import { describe, expect, test } from 'vitest';

import type { Citation, Lock, PageResult, Quote } from './types.ts';

import { check } from './check.ts';
import { splitSentences } from './diff.ts';
import { EMPTY_LOCK } from './lockfile.ts';
import { hashText, normalizeSpecText } from './normalize.ts';

const PAGE = 'https://html.spec.whatwg.org/multipage/input.html';
const OTHER = 'https://html.spec.whatwg.org/multipage/other.html';
const NOW = '2026-10-18T00:00:00.000Z';
const EARLIER = '2026-09-01T00:00:00.000Z';

const HTML = `<body>
<h4 id="sec"><span class="secno">4.10.5.1.17</span> File Upload state</h4>
<p>The element's value attribute must be omitted. A second sentence follows.</p>
<h4 id="next"><span class="secno">4.10.6</span> Next</h4>
<p>Next text.</p>
</body>`;
const SEC_UNIT = normalizeSpecText(
	"File Upload state The element's value attribute must be omitted. A second sentence follows.",
);

const quote = (text: string, group = `r/README.md:${text.length}`): Quote => ({
	text,
	file: 'r/README.md',
	line: 9,
	group,
});

const cite = (overrides: Partial<Citation> = {}): Citation => ({
	file: 'rules/src/r/README.md',
	line: 8,
	url: `${PAGE}#sec`,
	page: PAGE,
	fragment: 'sec',
	textDirective: null,
	secno: null,
	quotes: [],
	...overrides,
});

const ok = (html = HTML): PageResult => ({ status: 'ok', html });
const lockOf = (entries: Record<string, { text: string; updatedAt?: string }>): Lock => ({
	sections: Object.fromEntries(
		Object.entries(entries).map(([key, { text, updatedAt }]) => [
			key,
			{
				hash: hashText(normalizeSpecText(text)),
				text: splitSentences(normalizeSpecText(text)),
				updatedAt: updatedAt ?? EARLIER,
			},
		]),
	),
});

const run = (
	citations: Citation[],
	pages: Record<string, PageResult>,
	lock: Lock = EMPTY_LOCK,
	extra: { orphanQuotes?: Quote[]; inlineQuotes?: Quote[] } = {},
) =>
	check({
		citations,
		orphanQuotes: extra.orphanQuotes ?? [],
		inlineQuotes: extra.inlineQuotes ?? [],
		pages: new Map(Object.entries(pages)),
		lock,
		now: NOW,
	});

describe('check', () => {
	test('[check-001] reports nothing when the quote, the section number and the hash all hold', () => {
		const lock = lockOf({ [`${PAGE}#sec`]: { text: SEC_UNIT } });
		const { problems } = run(
			[cite({ secno: '4.10.5.1', quotes: [quote("The element's value attribute must be omitted.")] })],
			{ [PAGE]: ok() },
			lock,
		);
		expect(problems).toStrictEqual([]);
	});

	test('[check-002] reports an anchor that is not on the page', () => {
		const { problems } = run([cite({ fragment: 'gone' })], { [PAGE]: ok() });
		expect(problems.map(p => p.kind)).toStrictEqual(['anchor-missing']);
	});

	test('[check-003] reports a quote whose wording is not in the section', () => {
		const { problems } = run(
			[
				cite({
					quotes: [quote('The value attribute, if specified, must have a value that is the empty string.')],
				}),
			],
			{ [PAGE]: ok() },
		);
		expect(problems.map(p => p.kind)).toStrictEqual(['quote-mismatch']);
		expect(problems[0]?.quote?.text).toContain('if specified');
	});

	test('[check-004] passes a quote found in any section of its group', () => {
		const shared = quote('Next text.', 'r/index.ts:3');
		const citations = [
			cite({ file: 'r/index.ts', quotes: [shared] }),
			cite({ file: 'r/index.ts', page: OTHER, url: `${OTHER}#next`, fragment: 'next', quotes: [shared] }),
		];
		const { problems } = run(citations, { [PAGE]: ok(), [OTHER]: ok() });
		expect(problems).toStrictEqual([]);
	});

	test('[check-005] does not report a quote when every section of its group is missing', () => {
		const { problems } = run([cite({ fragment: 'gone', quotes: [quote('Anything.')] })], { [PAGE]: ok() });
		expect(problems.map(p => p.kind)).toStrictEqual(['anchor-missing']);
	});

	test('[check-006] checks a text directive against the whole page, ignoring case', () => {
		const present = cite({ textDirective: { start: "THE ELEMENT'S VALUE", end: 'next text.' } });
		expect(run([present], { [PAGE]: ok() }).problems).toStrictEqual([]);
		const absent = cite({ textDirective: { start: "The element's value", end: 'no such ending' } });
		expect(run([absent], { [PAGE]: ok() }).problems.map(p => p.kind)).toStrictEqual(['directive-missing']);
	});

	test('[check-007] accepts a cited section number that is the section or an ancestor of it', () => {
		for (const secno of ['4.10.5.1.17', '4.10.5.1', '4.10']) {
			expect(run([cite({ secno })], { [PAGE]: ok() }).problems).toStrictEqual([]);
		}
	});

	test('[check-008] reports a section number the section no longer has', () => {
		for (const secno of ['4.10.5.1.18', '4.10.5.1.17.1', '4.1']) {
			const { problems } = run([cite({ secno })], { [PAGE]: ok() });
			expect(problems.map(p => p.kind)).toStrictEqual(['secno-stale']);
			expect(problems[0]?.message).toContain('4.10.5.1.17');
		}
	});

	test('[check-009] skips the section number when the page does not number its headings', () => {
		const html = '<body><h4 id="sec">File Upload state</h4><p>Text.</p></body>';
		expect(run([cite({ secno: '9.9' })], { [PAGE]: ok(html) }).problems).toStrictEqual([]);
	});

	test('[check-010] reports a changed section with a sentence diff and refreshes the lock entry', () => {
		const lock = lockOf({
			[`${PAGE}#sec`]: {
				text: "File Upload state The element's value attribute may be omitted. A second sentence follows.",
			},
		});
		const { problems, lock: next } = run([cite()], { [PAGE]: ok() }, lock);
		expect(problems.map(p => p.kind)).toStrictEqual(['section-changed']);
		expect(problems[0]?.diff).toContain("-File Upload state The element's value attribute may be omitted.");
		expect(problems[0]?.diff).toContain("+File Upload state The element's value attribute must be omitted.");
		expect(next.sections[`${PAGE}#sec`]).toStrictEqual({
			hash: hashText(SEC_UNIT),
			text: splitSentences(SEC_UNIT),
			updatedAt: NOW,
		});
	});

	test('[check-011] keeps the lock entry, and its date, when the section is unchanged', () => {
		const lock = lockOf({ [`${PAGE}#sec`]: { text: SEC_UNIT, updatedAt: EARLIER } });
		const { lock: next } = run([cite()], { [PAGE]: ok() }, lock);
		expect(next).toStrictEqual(lock);
	});

	test('[check-012] adds a section the lock has not seen without reporting it', () => {
		const { problems, lock } = run([cite()], { [PAGE]: ok() });
		expect(problems).toStrictEqual([]);
		expect(lock.sections[`${PAGE}#sec`]).toMatchObject({ hash: hashText(SEC_UNIT), updatedAt: NOW });
	});

	test('[check-013] drops a lock entry that no citation uses any more', () => {
		const lock = lockOf({ [`${PAGE}#old`]: { text: 'x' }, [`${PAGE}#sec`]: { text: SEC_UNIT } });
		expect(Object.keys(run([cite()], { [PAGE]: ok() }, lock).lock.sections)).toStrictEqual([`${PAGE}#sec`]);
	});

	test('[check-014] reports a failed page once and keeps its lock entries', () => {
		const lock = lockOf({ [`${PAGE}#sec`]: { text: SEC_UNIT } });
		const citations = [cite(), cite({ line: 20, fragment: 'next', url: `${PAGE}#next` })];
		const { problems, lock: next } = run(citations, { [PAGE]: { status: 'failed', message: 'HTTP 503' } }, lock);
		expect(problems.map(p => [p.kind, p.message])).toStrictEqual([['fetch-failed', `${PAGE}: HTTP 503`]]);
		expect(next).toStrictEqual(lock);
	});

	test('[check-020] reports a page that no longer exists as a finding, and keeps its lock entries', () => {
		const lock = lockOf({ [`${PAGE}#sec`]: { text: SEC_UNIT } });
		const citations = [cite(), cite({ line: 20, fragment: 'next', url: `${PAGE}#next` })];
		const { problems, lock: next } = run(
			citations,
			{ [PAGE]: { status: 'failed', message: 'HTTP 404', permanent: true } },
			lock,
		);
		expect(problems.map(p => [p.kind, p.citation?.line])).toStrictEqual([['page-missing', 8]]);
		expect(next).toStrictEqual(lock);
	});

	test('[check-015] reports an unprocessed ReSpec source once and does not check its anchors', () => {
		const html =
			'<script class="remove" src="https://www.w3.org/Tools/respec/respec-w3c"></script><h2 id="other">x</h2>';
		const citations = [cite({ fragment: 'dfn-naming-prohibited' }), cite({ line: 30, fragment: 'docconformance' })];
		expect(run(citations, { [PAGE]: ok(html) }).problems.map(p => p.kind)).toStrictEqual(['unprocessed-source']);
	});

	test('[check-016] reports a whole-page link only when something about it needs a section', () => {
		const bare = cite({ fragment: null, url: PAGE });
		expect(run([bare], { [PAGE]: ok() }).problems).toStrictEqual([]);
		expect(run([{ ...bare, secno: '7.6' }], { [PAGE]: ok() }).problems.map(p => p.kind)).toStrictEqual([
			'no-fragment',
		]);
		expect(
			run([{ ...bare, quotes: [quote('A quote.')] }], { [PAGE]: ok() }).problems.map(p => p.kind),
		).toStrictEqual(['no-fragment']);
	});

	test('[check-017] passes orphan and inline quotes through', () => {
		const { problems } = run(
			[],
			{},
			{ sections: {} },
			{ orphanQuotes: [quote('orphan')], inlineQuotes: [quote('inline')] },
		);
		expect(problems.map(p => p.kind)).toStrictEqual(['orphan-quote', 'inline-quote']);
	});

	test('[check-019] reports an anchor that has no text, which could never be seen to change', () => {
		const html =
			'<body><div id="alias"></div><h4 id="sec"><span class="secno">4.1</span> Title</h4><p>Text.</p></body>';
		const { problems, lock } = run([cite({ fragment: 'alias', url: `${PAGE}#alias` })], { [PAGE]: ok(html) });
		expect(problems.map(p => p.kind)).toStrictEqual(['anchor-empty']);
		expect(lock.sections).toStrictEqual({});
	});

	test('[check-018] orders problems by how directly they say the citation is wrong', () => {
		const lock = lockOf({ [`${PAGE}#sec`]: { text: 'File Upload state something else entirely' } });
		const citations = [
			cite({
				line: 1,
				secno: '9.9',
				quotes: [quote('A quote that is not there.')],
				textDirective: { start: 'no such text' },
			}),
			cite({ line: 2, fragment: 'gone' }),
		];
		expect(run(citations, { [PAGE]: ok() }, lock).problems.map(p => p.kind)).toStrictEqual([
			'anchor-missing',
			'quote-mismatch',
			'directive-missing',
			'secno-stale',
			'section-changed',
		]);
	});
});
