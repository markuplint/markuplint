import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';

import { MLDocument } from './document.js';

function createDocument(sourceCode: string) {
	return new MLDocument(parser.parse(sourceCode), convertRuleset(), [spec as unknown as MLMLSpec, {}], {
		ariaVersion: ARIA_RECOMMENDED_VERSION,
	});
}

/** `nodeName` of the node at `line`:`col`, or `null`. */
function nodeNameAt(sourceCode: string, line: number, col: number) {
	return createDocument(sourceCode).searchNodeByLocation(line, col)?.nodeName ?? null;
}

describe('searchNodeByLocation', () => {
	// `<div id="a">` is 1:1–1:13, `<p class="x">` 1:13–1:26, the text `a\n b` 1:26–2:3
	const source = '<div id="a"><p class="x">a\n b</p></div>';

	test('the first column of a start tag is its element', () => {
		expect(nodeNameAt(source, 1, 1)).toBe('DIV');
	});

	test('a column inside a start tag is its element', () => {
		expect(nodeNameAt(source, 1, 6)).toBe('DIV');
		expect(nodeNameAt(source, 1, 12)).toBe('DIV');
	});

	test('the end of a range belongs to the next node, not the one before', () => {
		expect(nodeNameAt(source, 1, 13)).toBe('P');
		expect(nodeNameAt(source, 1, 26)).toBe('#text');
	});

	test('a position on a later line of a node that spans lines is that node', () => {
		expect(nodeNameAt(source, 2, 2)).toBe('#text');
	});

	test('a position in an end tag is its element', () => {
		// `</p>` is 2:3–2:7, and `</div>` 2:7–2:13
		expect(nodeNameAt(source, 2, 3)).toBe('P');
		expect(nodeNameAt(source, 2, 6)).toBe('P');
		expect(nodeNameAt(source, 2, 7)).toBe('DIV');
	});

	test('an omitted element with an empty source does not hide the element at its start', () => {
		// The omitted `<tbody>` starts where `<tr>` does, at 1:8
		expect(nodeNameAt('<table><tr><td>a</td></tr></table>', 1, 8)).toBe('TR');
	});

	test('an attribute of a nested start tag is the innermost element', () => {
		expect(nodeNameAt(source, 1, 18)).toBe('P');
	});

	test('a whitespace text between elements is the text', () => {
		expect(nodeNameAt('<div></div> <p></p>', 1, 12)).toBe('#text');
	});

	test('a position on the first line of a start tag that spans lines, after the column its end is at', () => {
		// `<p class="aaaaaaaa"\n class="b">` is 1:1–2:12; the old check compared 1:20 with the end column 12
		expect(nodeNameAt('<p class="aaaaaaaa"\n class="b">t</p>', 1, 20)).toBe('P');
	});

	test('a position after every node is no node', () => {
		expect(nodeNameAt(source, 9, 1)).toBeNull();
	});
});
