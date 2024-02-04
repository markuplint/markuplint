import { parser } from '@markuplint/html-parser';
import { test, expect } from 'vitest';

import { convertRuleset } from '../../index.js';
import { dummySchemas } from '../../test/index.js';
import { MLDocument } from '../node/document.js';

import { getAccname } from './accname.js';
import { createNode } from './create-node.js';

function c(sourceCode: string) {
	const ast = parser.parse(sourceCode);
	const astNode = ast.nodeList[0]!;
	const ruleset = convertRuleset({});
	const document = new MLDocument(ast, ruleset, dummySchemas());
	const node = createNode(astNode, document);
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
	expect(getAccname(c('<div><label for="a">label</label><input id="a" /></div>').children[1], '1.2')).toBe('label');
});

test('Invisible element', () => {
	expect(getAccname(c('<button>label</button>'), '1.2')).toBe('label');
	expect(getAccname(c('<button aria-disabled="true">label</button>'), '1.2')).toBe('label');
	expect(getAccname(c('<button aria-hidden="true">label</button>'), '1.2')).toBe('');
	expect(getAccname(c('<button hidden>label</button>'), '1.2')).toBe('');
	expect(getAccname(c('<button style="display: none">label</button>'), '1.2')).toBe('label'); // Do not support the style attribute yet.
});

/**
 * @see https://www.w3.org/TR/accname-1.1/#ex-1-example-1-element1-id-el1-aria-labelledby-el3-element2-id-el2-aria-labelledby-el1-element3-id-el3-hello-element3
 */
test('accname-1.1 Example 1', () => {
	const complex = c(`<div>
<input id="el1" aria-labelledby="el3" />
<input id="el2" aria-labelledby="el1" />
<h1 id="el3"> hello </h1>
</div>`);
	expect(getAccname(complex.children[0], '1.2')).toBe('hello');
	expect(getAccname(complex.children[1], '1.2')).toBe('');
	expect(getAccname(complex.children[2], '1.2')).toBe('hello');
});

/**
 * https://www.w3.org/TR/accname-1.1/#ex-2-example-2-h1-files-h1-ul-li-a-id-file_row1-href-files-documentation-pdf-documentation-pdf-a-span-role-button-tabindex-0-id-del_row1-aria-label-delete-aria-labelledby-del_row1-file_row1-span-li-li-a-id-file_row2-href-files-holidayletter-pdf-holidayletter-pdf-a-span-role-button-tabindex-0-id-del_row2-aria-label-delete-aria-labelledby-del_row2-file_row2-span-li-ul
 */
test('accname-1.1 Example 2', () => {
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
	expect(getAccname(spans[0], '1.2')).toBe('Delete Documentation.pdf');
	expect(getAccname(spans[1], '1.2')).toBe('Delete HolidayLetter.pdf');
});

/**
 * https://www.w3.org/TR/accname-1.1/#ex-3-example-3-div-role-checkbox-aria-checked-false-flash-the-screen-span-role-textbox-aria-multiline-false-5-span-times-div
 */
test('accname-1.1 Example 3', () => {
	const complex = c(
		'<div role="checkbox" aria-checked="false">Flash the screen <span role="textbox" aria-multiline="false"> 5 </span> times</div>',
	);
	expect(getAccname(complex, '1.2')).toBe('Flash the screen 5 times');
});

test('with comment', () => {
	expect(getAccname(c('<button>label</button>'), '1.2')).toBe('label');
	expect(getAccname(c('<button>label<!-- comment --></button>'), '1.2')).toBe('label');
});
