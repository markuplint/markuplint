import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectAriaCitations } from './aria.ts';
import { parseSpecUrl } from './collect.ts';

const FILE = 'packages/@markuplint/html-spec/index.json';

/** `index.json` as the generator writes it: tab-indented, the three versions each with the four lists. */
const indexOf = (aria: Record<string, Record<string, unknown[]>>) =>
	JSON.stringify({ cites: [], def: { '#aria': aria }, specs: [] }, null, '\t');

const FIXTURE = indexOf({
	'1.3': {
		roles: [
			{ name: 'button', ownedProperties: [{ name: 'aria-pressed' }] },
			{ name: 'checkbox', ownedProperties: [{ name: 'aria-checked' }] },
		],
		props: [{ name: 'aria-checked' }, { name: 'aria-pressed' }],
		graphicsRoles: [{ name: 'graphics-document' }],
		dpubRoles: [{ name: 'doc-abstract' }],
	},
	'1.2': {
		roles: [{ name: 'button' }],
		props: [{ name: 'aria-checked' }],
		graphicsRoles: [{ name: 'graphics-document' }],
		dpubRoles: [{ name: 'doc-abstract' }],
	},
	'1.1': {
		roles: [{ name: 'button' }],
		props: [{ name: 'aria-checked' }],
		graphicsRoles: [{ name: 'graphics-symbol' }],
		dpubRoles: [{ name: 'doc-abstract' }],
	},
});

const urls = (text: string) => collectAriaCitations(text, FILE).map(c => c.url);

describe('the sections of ARIA that the generated data defines', () => {
	test('[aria-001] cites each role and property at the document that the generator reads for its version', () => {
		const found = urls(FIXTURE);
		expect(found).toContain('https://w3c.github.io/aria/#button');
		expect(found).toContain('https://w3c.github.io/aria/#aria-checked');
		expect(found).toContain('https://www.w3.org/TR/wai-aria-1.2/#button');
		expect(found).toContain('https://www.w3.org/TR/wai-aria-1.2/#aria-checked');
		expect(found).toContain('https://www.w3.org/TR/wai-aria-1.1/#button');
		expect(found).toContain('https://www.w3.org/TR/wai-aria-1.1/#aria-checked');
	});

	test('[aria-002] cites the graphics roles at the Graphics ARIA of their version and the DPub roles at DPub ARIA', () => {
		const found = urls(FIXTURE);
		expect(found).toContain('https://w3c.github.io/graphics-aria/#graphics-document');
		expect(found).toContain('https://www.w3.org/TR/graphics-aria-1.0/#graphics-symbol');
		expect(found).toContain('https://w3c.github.io/dpub-aria/#doc-abstract');
	});

	test('[aria-003] cites a section once, however many versions define it', () => {
		const found = urls(FIXTURE);
		expect(found.filter(u => u === 'https://w3c.github.io/dpub-aria/#doc-abstract')).toHaveLength(1);
		expect(found.filter(u => u === 'https://w3c.github.io/graphics-aria/#graphics-document')).toHaveLength(1);
		expect(new Set(found).size).toBe(found.length);
	});

	test('[aria-004] puts a citation on the line of its own entry, not on a line of a role that names it as an owned property', () => {
		const lines = FIXTURE.split('\n');
		const citations = collectAriaCitations(FIXTURE, FILE);
		const at = (url: string) => citations.find(c => c.url === url)?.line;
		// "aria-checked" is named in `checkbox.ownedProperties` before `props` defines it.
		const checked = at('https://w3c.github.io/aria/#aria-checked') ?? 0;
		expect(lines[checked - 1]).toMatch(/^\t+"name": "aria-checked"/);
		expect(lines[checked - 2]).toMatch(/^\t+\{$/);
		expect(lines[checked - 3]).toMatch(/^\t+"props": \[$/);
		const button = at('https://w3c.github.io/aria/#button') ?? 0;
		expect(lines[button - 1]).toMatch(/^\t+"name": "button"/);
		expect(lines[button - 3]).toMatch(/^\t+"roles": \[$/);
	});

	test('[aria-005] reads as citations of the data file, with a fragment and nothing quoted', () => {
		for (const citation of collectAriaCitations(FIXTURE, FILE)) {
			expect(citation).toMatchObject({
				file: FILE,
				page: citation.url.slice(0, citation.url.indexOf('#')),
				textDirective: null,
				secno: null,
				quotes: [],
			});
			expect(citation.fragment).not.toBeNull();
		}
	});

	test('[aria-006] every role and property of the generated data is cited at a URL that the monitor reads', () => {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const text = readFileSync(join(root, FILE), 'utf8');
		const citations = collectAriaCitations(text, FILE);
		const data = JSON.parse(text) as {
			def: { '#aria': Record<string, Record<string, { name: string }[]>> };
		};
		const names = new Set(
			Object.values(data.def['#aria']).flatMap(v => Object.values(v).flatMap(list => list.map(e => e.name))),
		);
		expect(new Set(citations.map(c => c.fragment))).toStrictEqual(names);
		expect(citations.filter(c => parseSpecUrl(c.url) === null).map(c => c.url)).toStrictEqual([]);
		const lines = text.split('\n');
		const misplaced = citations
			.filter(c => !new RegExp(`^\\t+"name": "${c.fragment}",?$`).test(lines[c.line - 1] ?? ''))
			.map(c => `${c.url} at line ${c.line}`);
		expect(misplaced).toStrictEqual([]);
	});

	test('[aria-007] puts every citation on the first line when the file is not indented as the generator writes it, and still cites every section', () => {
		const compact = JSON.stringify(JSON.parse(FIXTURE));
		const citations = collectAriaCitations(compact, FILE);
		expect(citations.map(c => c.url).toSorted()).toStrictEqual(urls(FIXTURE).toSorted());
		expect(new Set(citations.map(c => c.line))).toStrictEqual(new Set([1]));
	});

	test('[aria-008] finds the line of an entry in a file with CRLF line ends', () => {
		const crlf = FIXTURE.replaceAll('\n', '\r\n');
		const at = (text: string) => collectAriaCitations(text, FILE).map(c => c.line);
		expect(at(crlf)).toStrictEqual(at(FIXTURE));
		expect(new Set(at(crlf)).has(1)).toBe(false);
	});

	test('[aria-009] fails on a version of ARIA that the documents of the generator do not name, instead of citing "undefined"', () => {
		const text = indexOf({ '9.9': { roles: [{ name: 'button' }] } });
		expect(() => collectAriaCitations(text, FILE)).toThrow(/9\.9/);
	});
});
