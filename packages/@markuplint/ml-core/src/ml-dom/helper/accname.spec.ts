import { parser } from '@markuplint/html-parser';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { test, expect } from 'vitest';

import { convertRuleset } from '../../index.js';
import { dummySchemas } from '../../test/index.js';
import { MLDocument } from '../node/document.js';
import type { MLElement } from '../node/element.js';

import { getAccname, getAccnameVisits, getHostLanguageLabelSource } from './accname.js';
import { createNode } from './create-node.js';

function c(sourceCode: string) {
	const ast = parser.parse(sourceCode);
	const astNode = ast.nodeList[0]!;
	const ruleset = convertRuleset({});
	const document = new MLDocument(ast, ruleset, dummySchemas(), { ariaVersion: ARIA_RECOMMENDED_VERSION });
	const node = createNode(astNode, document) as MLElement<any, any>;
	if (node.is(node.ELEMENT_NODE)) {
		return node;
	}
	throw new Error();
}

test('Get accessible name', () => {
	expect(getAccname(c('<button>label</button>'), '1.2')).toBe('label');
	expect(getAccname(c('<div>text</div>'), '1.2')).toBe('');
	expect(getAccname(c('<div aria-label="label">text</div>'), '1.2')).toBe('label');
	expect(getAccname(c('<span aria-label="label">text</span>'), '1.2')).toBe('label');
	expect(getAccname(c('<img alt="alternative-text" />'), '1.2')).toBe('alternative-text');
	expect(getAccname(c('<img title="title" />'), '1.2')).toBe('title');
	expect(getAccname(c('<div><label for="a">label</label><input id="a" /></div>').children[1]!, '1.2')).toBe('label');
});

test('Invisible element', () => {
	expect(getAccname(c('<button>label</button>'), '1.2')).toBe('label');
	expect(getAccname(c('<button aria-disabled="true">label</button>'), '1.2')).toBe('label');
	expect(getAccname(c('<button aria-hidden="true">label</button>'), '1.2')).toBe('');
	expect(getAccname(c('<button hidden>label</button>'), '1.2')).toBe('');
	expect(getAccname(c('<button style="display: none">label</button>'), '1.2')).toBe('label'); // Do not support the style attribute yet.
});

/**
 * @see https://www.w3.org/TR/accname-1.2/#ex-1-example-1-element1-id-el1-aria-labelledby-el3-element2-id-el2-aria-labelledby-el1-element3-id-el3-hello-element3
 */
test('accname-1.2 Example 1', () => {
	const complex = c(`<div>
<input id="el1" aria-labelledby="el3" />
<input id="el2" aria-labelledby="el1" />
<h1 id="el3"> hello </h1>
</div>`);
	expect(getAccname(complex.children[0]!, '1.2')).toBe('hello');
	expect(getAccname(complex.children[1]!, '1.2')).toBe('');
	expect(getAccname(complex.children[2]!, '1.2')).toBe('hello');
});

/**
 * https://www.w3.org/TR/accname-1.2/#ex-2-example-2-h1-files-h1-ul-li-a-id-file_row1-href-files-documentation-pdf-documentation-pdf-a-span-role-button-tabindex-0-id-del_row1-aria-label-delete-aria-labelledby-del_row1-file_row1-span-li-li-a-id-file_row2-href-files-holidayletter-pdf-holidayletter-pdf-a-span-role-button-tabindex-0-id-del_row2-aria-label-delete-aria-labelledby-del_row2-file_row2-span-li-ul
 */
test('accname-1.2 Example 2', () => {
	const complex = c(`<ul>
	<li>
		<a id="file_row1" href="./files/Documentation.pdf">Documentation.pdf</a>
		<span role="button" tabindex="0" id="del_row1" aria-label="Delete" aria-labelledby="del_row1 file_row1"></span>
	</li>
	<li>
		<a id="file_row2" href="./files/HolidayLetter.pdf">HolidayLetter.pdf</a>
		<span role="button" tabindex="0" id="del_row2" aria-label="Delete" aria-labelledby="del_row2 file_row2"></span>
	</li>
</ul>`);
	const spans = complex.querySelectorAll('span');
	expect(getAccname(spans[0]!, '1.2')).toBe('Delete Documentation.pdf');
	expect(getAccname(spans[1]!, '1.2')).toBe('Delete HolidayLetter.pdf');
});

/**
 * https://www.w3.org/TR/accname-1.2/#ex-3-example-3-div-role-checkbox-aria-checked-false-flash-the-screen-span-role-textbox-aria-multiline-false-5-span-times-div
 */
test('accname-1.2 Example 3', () => {
	const complex = c(
		'<div role="checkbox" aria-checked="false">Flash the screen <span role="textbox" aria-multiline="false"> 5 </span> times</div>',
	);
	expect(getAccname(complex, '1.2')).toBe('Flash the screen 5 times');
});

test('with comment', () => {
	expect(getAccname(c('<button>label</button>'), '1.2')).toBe('label');
	expect(getAccname(c('<button>label<!-- comment --></button>'), '1.2')).toBe('label');
});

test.each([
	['<img src="s.svg" alt="Save" role="none">', ''],
	['<button><img src="s.svg" alt="Save" role="none">Click</button>', 'Click'],
	['<button><svg role="presentation"><title>Save</title></svg>Click</button>', 'Click'],
	// The same markup without the role
	['<button><img src="s.svg" alt="Save">Click</button>', 'Save Click'],
	['<button><svg><title>Save</title></svg>Click</button>', 'Save Click'],
])('the name of %s, where a presentational role drops a host language label', (html, name) => {
	expect(getAccname(c(html), '1.2')).toBe(name);
});

test.each([
	['<img src="s.svg" alt="Save" role="none">', 'alt'],
	['<svg role="none"><title>Save</title></svg>', 'svg-title'],
	['<img src="s.svg" alt="">', null],
	['<fieldset title="t"></fieldset>', null],
])('the host language label source of %s', (html, source) => {
	expect(getHostLanguageLabelSource(c(html), '1.2')).toBe(source);
});

test('SVG title and desc are not content', () => {
	expect(getAccname(c('<button><svg><desc>A floppy disk</desc></svg>Save</button>'), '1.2')).toBe('Save');
});

function visited(el: MLElement<any, any>, asReferenced = false) {
	return [...getAccnameVisits(el, '1.2', asReferenced)].map(([target, visits]) => [
		target.localName,
		visits.map(v => [v.hidden, v.embeddedControl, v.inLabelledbyTraversal]),
	]);
}

test('the elements the computation of a name reaches', () => {
	expect(
		visited(c('<button><span aria-hidden="true"><b>x</b></span><i aria-label="y"><u>z</u></i></button>')),
	).toStrictEqual([
		['button', [[false, false, false]]],
		['span', [[true, false, false]]],
		['i', [[false, false, false]]],
	]);
});

test('the computation of a name not from content reaches only the element', () => {
	expect(visited(c('<div role="img"><span>x</span></div>'))).toStrictEqual([['div', [[false, false, false]]]]);
});

test('the computation as a referenced node reaches the content', () => {
	expect(visited(c('<div role="img"><span>x</span></div>'), true)).toStrictEqual([
		['div', [[false, false, true]]],
		['span', [[false, false, true]]],
	]);
});

test('an embedded control is reached as one', () => {
	expect(
		visited(c('<div role="checkbox">a <input type="text" value="v"> <input type="text" aria-hidden="true"></div>')),
	).toStrictEqual([
		['div', [[false, false, false]]],
		['input', [[false, true, false]]],
		['input', [[true, true, false]]],
	]);
});

test('MLElement memoizes the visits and the host language label source', () => {
	const button = c('<button><svg role="none"><title>Save</title></svg>Click</button>');
	// Compared by identity: the maps hold MLElements, which the matchers cannot compare
	const visits = button.getAccessibleNameVisits('1.2');
	expect([
		visits === button.getAccessibleNameVisits('1.2'),
		visits === button.getAccessibleNameVisits('1.2', true),
	]).toStrictEqual([true, false]);
	const svg = button.children[0]!;
	expect(svg.getHostLanguageLabelSource('1.2')).toBe('svg-title');
	expect(svg.getHostLanguageLabelSource('1.2')).toBe(svg.getHostLanguageLabelSource('1.2'));
});
