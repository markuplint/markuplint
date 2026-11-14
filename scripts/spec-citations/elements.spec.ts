import { describe, expect, test } from 'vitest';

import { collectElementCitations } from './elements.ts';

const FILE = 'packages/@markuplint/html-spec/index.json';
const OBSOLETE = 'https://html.spec.whatwg.org/multipage/obsolete.html';

const indexOf = (specs: { name: string; cite: string }[]) => JSON.stringify({ cites: [], def: {}, specs }, null, '\t');

const FIXTURE = indexOf([
	{ name: 'a', cite: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a' },
	{ name: 'xmp', cite: `${OBSOLETE}#xmp` },
	{ name: 'marquee', cite: `${OBSOLETE}#non-conforming-features` },
	{ name: 'blink', cite: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/blink' },
]);

describe('the sections that elements without a source file are defined by', () => {
	test('[elements-001] cites the `cite` of an element that has no source file, where the monitor reads it', () => {
		const citations = collectElementCitations(FIXTURE, FILE, name => name === 'a');
		expect(citations.map(c => c.url)).toStrictEqual([`${OBSOLETE}#xmp`, `${OBSOLETE}#non-conforming-features`]);
		expect(citations[0]).toMatchObject({
			file: FILE,
			page: OBSOLETE,
			fragment: 'xmp',
			textDirective: null,
			secno: null,
			quotes: [],
		});
	});

	test('[elements-002] leaves out an element whose definition is cited in its source file', () => {
		const citations = collectElementCitations(FIXTURE, FILE, () => true);
		expect(citations).toStrictEqual([]);
	});

	test('[elements-003] puts a citation on the line of the `cite` of its own element', () => {
		const lines = FIXTURE.split('\n');
		for (const citation of collectElementCitations(FIXTURE, FILE, name => name === 'a')) {
			expect(lines[citation.line - 1]).toContain(`"cite": "${citation.url}"`);
		}
		const [xmp, marquee] = collectElementCitations(FIXTURE, FILE, name => name === 'a');
		expect(xmp?.line).toBeLessThan(marquee?.line ?? 0);
	});

	test('[elements-004] cites a section once, however many elements share it', () => {
		const shared = indexOf([
			{ name: 'marquee', cite: `${OBSOLETE}#non-conforming-features` },
			{ name: 'spacer', cite: `${OBSOLETE}#non-conforming-features` },
		]);
		expect(collectElementCitations(shared, FILE, () => false)).toHaveLength(1);
	});
});
