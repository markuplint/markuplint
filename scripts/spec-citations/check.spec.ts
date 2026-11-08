import { describe, expect, test } from 'vitest';

import type { Citation, Lock, PageResult, Quote } from './types.ts';

import { check } from './check.ts';
import { collectFromSource } from './collect.ts';
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

describe('check: a source file of a framework', () => {
	const RAW = 'https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/util.ts';
	const BLOB = 'https://github.com/withastro/astro/blob/main/packages/astro/src/util.ts';
	const KEY = `${RAW}#addAttribute`;
	const FILE = 'export function addAttribute(value, key) {\n\treturn value;\n}\n\nexport const other = 1;\n';
	const UNIT = 'export function addAttribute(value, key) {\n\treturn value;\n}';

	const cites = (overrides: Partial<Citation> = {}): Citation =>
		cite({ url: `${BLOB}#addAttribute`, page: RAW, fragment: 'addAttribute', ...overrides });
	const lockedAs = (text: string): Lock => ({
		sections: { [KEY]: { hash: hashText(text), text, updatedAt: EARLIER } },
	});

	test('[check-021] stores the declaration as its lines, and reports nothing while it holds', () => {
		const first = run([cites()], { [RAW]: ok(FILE) });
		expect(first.problems).toStrictEqual([]);
		expect(first.lock.sections[KEY]).toStrictEqual({ hash: hashText(UNIT), text: UNIT, updatedAt: NOW });
		expect(run([cites()], { [RAW]: ok(FILE) }, lockedAs(UNIT)).problems).toStrictEqual([]);
	});

	test('[check-022] reports a changed declaration with the changed lines, and a change elsewhere in the file with nothing', () => {
		const changed = FILE.replace('return value;', 'return String(value);');
		const { problems } = run([cites()], { [RAW]: ok(changed) }, lockedAs(UNIT));
		expect(problems.map(p => p.kind)).toStrictEqual(['section-changed']);
		expect(problems[0]?.message).toBe('The cited declaration changed since 2026-09-01');
		expect(problems[0]?.diff).toContain('-\treturn value;');
		expect(problems[0]?.diff).toContain('+\treturn String(value);');

		const elsewhere = `${FILE}\nexport const added = 2;\n`;
		expect(run([cites()], { [RAW]: ok(elsewhere) }, lockedAs(UNIT)).problems).toStrictEqual([]);
	});

	test('[check-023] reports a declaration that the file no longer has, and keeps its entry in the lock', () => {
		const renamed = FILE.replace('addAttribute', 'renderAttribute');
		const { problems, lock } = run([cites()], { [RAW]: ok(renamed) }, lockedAs(UNIT));
		expect(problems.map(p => p.kind)).toStrictEqual(['anchor-missing']);
		expect(problems[0]?.message).toBe(`\`addAttribute\` is not declared at the top level of ${BLOB}`);
		expect(lock.sections[KEY]?.hash).toBe(hashText(UNIT));
	});

	test('[check-024] reports a source file that is gone as a page that no longer exists', () => {
		const { problems } = run([cites()], { [RAW]: { status: 'failed', message: 'HTTP 404', permanent: true } });
		expect(problems.map(p => p.kind)).toStrictEqual(['page-missing']);
		expect(problems[0]?.citation?.url).toBe(`${BLOB}#addAttribute`);
	});

	test('[check-025] looks a quote up in the declaration, and reports one that it does not hold', () => {
		expect(run([cites({ quotes: [quote('return value;')] })], { [RAW]: ok(FILE) }).problems).toStrictEqual([]);
		const { problems } = run([cites({ quotes: [quote('return String(value);')] })], { [RAW]: ok(FILE) });
		expect(problems.map(p => p.kind)).toStrictEqual(['quote-mismatch']);
	});

	test('[check-026] needs the name of the declaration when it quotes the file', () => {
		const { problems } = run([cites({ fragment: null, url: BLOB, quotes: [quote('return value;')] })], {
			[RAW]: ok(FILE),
		});
		expect(problems.map(p => p.kind)).toStrictEqual(['no-fragment']);
	});

	test('[check-030] stores the lines of a declaration as they are, not split into sentences', () => {
		const code = "function f(terse) {\n\treturn terse ? 'a' : 'b'; // end. Next\n}";
		const { lock } = run([cites({ fragment: 'f', url: `${BLOB}#f` })], { [RAW]: ok(`${code}\n`) });
		expect(lock.sections[`${RAW}#f`]?.text).toBe(code);
	});

	test('[check-031] reads the page that collecting a link to a source file names', () => {
		const comment = `/**\n * @see ${BLOB}#addAttribute\n */\nexport const TABLE = {};\n`;
		const [collected] = collectFromSource(comment, 'p/literal-values.ts').citations;
		expect(collected).toBeDefined();
		const { problems, lock } = run(collected === undefined ? [] : [collected], { [RAW]: ok(FILE) });
		expect(problems).toStrictEqual([]);
		expect(Object.keys(lock.sections)).toStrictEqual([KEY]);
	});
});

describe('check: a text fragment without a fragment', () => {
	const whole = (overrides: Partial<Citation> = {}) => cite({ fragment: null, url: PAGE, ...overrides });

	test('[check-027] finds the text fragment of a link to a whole page in the text of the page', () => {
		const { problems, lock } = run(
			[whole({ textDirective: { start: "The element's value attribute", end: 'must be omitted' } })],
			{ [PAGE]: ok() },
		);
		expect(problems).toStrictEqual([]);
		expect(lock.sections).toStrictEqual({});
	});

	test('[check-028] reports the text fragment of a link to a whole page that is no longer on the page', () => {
		const { problems } = run([whole({ textDirective: { start: 'a sentence that was reworded' } })], {
			[PAGE]: ok(),
		});
		expect(problems.map(p => p.kind)).toStrictEqual(['directive-missing']);
		expect(problems[0]?.message).toContain('a sentence that was reworded');
	});

	test('[check-029] reports nothing for a link to a whole page that quotes, numbers and points at nothing', () => {
		expect(run([whole()], { [PAGE]: ok() }).problems).toStrictEqual([]);
	});
});
