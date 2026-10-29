import specs from '@markuplint/html-spec';
import { createJSDOMElement as c } from '@markuplint/test-tools';
import { test, expect, describe } from 'vitest';

import { getAccname } from './accname-computation.js';

const version = '1.2' as const;

test('Get accessible name', () => {
	expect(getAccname(c('<button>label</button>'), specs, version)).toBe('label');
	expect(getAccname(c('<div>text</div>'), specs, version)).toBe('');
	expect(getAccname(c('<div aria-label="label">text</div>'), specs, version)).toBe('label');
	expect(getAccname(c('<span aria-label="label">text</span>'), specs, version)).toBe('label');
	expect(getAccname(c('<img alt="alternative-text" />'), specs, version)).toBe('alternative-text');
	expect(getAccname(c('<img title="title" />'), specs, version)).toBe('title');
	expect(getAccname(c('<div><label for="a">label</label><input id="a" /></div>').children[1]!, specs, version)).toBe(
		'label',
	);
});

test('Host language label of an element exposed as presentational', () => {
	expect(getAccname(c('<img src="s.svg" alt="Save" role="none">'), specs, version)).toBe('');
	expect(getAccname(c('<button><img src="s.svg" alt="Save" role="none">Click</button>'), specs, version)).toBe(
		'Click',
	);
	expect(
		getAccname(c('<button><svg role="presentation"><title>Save</title></svg>Click</button>'), specs, version),
	).toBe('Click');
	// Control: the same markup without the role
	expect(getAccname(c('<button><img src="s.svg" alt="Save">Click</button>'), specs, version)).toBe('Save Click');
	expect(getAccname(c('<button><svg><title>Save</title></svg>Click</button>'), specs, version)).toBe('Save Click');
});

/**
 * @see https://w3c.github.io/accname/#comp_hidden_not_referenced
 */
test('Hidden descendants of a node referenced by aria-labelledby', () => {
	// Example 1: the referenced node is hidden, so its hidden descendant is included
	const hiddenRoot = c(
		'<div><div id="el1" role="button" aria-labelledby="el2"></div><div id="el2" hidden><span id="el3" hidden>hello</span></div></div>',
	);
	expect(getAccname(hiddenRoot.children[0]!, specs, version)).toBe('hello');
	// Example 2: the referenced node is not hidden, so its hidden descendant is not
	const visibleRoot = c(
		'<div><div id="el1" role="button" aria-labelledby="el2"></div><div id="el2"><span id="el3" hidden>hello</span></div></div>',
	);
	expect(getAccname(visibleRoot.children[0]!, specs, version)).toBe('');
	const mixed = c(
		'<div><button aria-labelledby="l"></button><div id="l">Save<span aria-hidden="true">x</span></div></div>',
	);
	expect(getAccname(mixed.children[0]!, specs, version)).toBe('Save');
});

test('A hidden embedded control contributes nothing', () => {
	expect(
		getAccname(
			c('<label for="c"><input id="c" type="checkbox">Flash <input type="text" value="5" hidden> times</label>')
				.children[0]!,
			specs,
			version,
		),
	).toBe('Flash times');
});

test('aria-labelledby of an embedded control comes before its value, and aria-label does not', () => {
	const doc = c(
		'<div><div role="checkbox" aria-checked="false">Flash <input type="text" value="5" aria-labelledby="n"> times <input type="text" value="9" aria-label="nine"></div><span id="n">five</span></div>',
	);
	expect(getAccname(doc.children[0]!, specs, version)).toBe('Flash five times 9');
});

test.each([
	['<label for="i"><svg><desc>A floppy disk</desc></svg>Save</label>', 'Save'],
	['<label for="i"><svg role="none"><title>T</title></svg>Save</label>', 'Save'],
	['<label for="i"><span aria-hidden="true">x</span>Save</label>', 'Save'],
	['<label for="i">Flash <input type="text" value="5"> times</label>', 'Flash 5 times'],
])('Label text of %s', (label, name) => {
	const doc = c(`<div><input id="i" type="checkbox">${label}</div>`);
	expect(getAccname(doc.children[0]!, specs, version)).toBe(name);
});

test('SVG title and desc are not content', () => {
	expect(getAccname(c('<button><svg><desc>A floppy disk</desc></svg>Save</button>'), specs, version)).toBe('Save');
});

test('Invisible element', () => {
	expect(getAccname(c('<button>label</button>'), specs, version)).toBe('label');
	expect(getAccname(c('<button aria-disabled="true">label</button>'), specs, version)).toBe('label');
	expect(getAccname(c('<button aria-hidden="true">label</button>'), specs, version)).toBe('');
	expect(getAccname(c('<button hidden>label</button>'), specs, version)).toBe('');
	expect(getAccname(c('<button style="display: none">label</button>'), specs, version)).toBe('');
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
	expect(getAccname(complex.children[0]!, specs, version)).toBe('hello');
	expect(getAccname(complex.children[1]!, specs, version)).toBe('');
	expect(getAccname(complex.children[2]!, specs, version)).toBe('hello');
});

/**
 * @see https://www.w3.org/TR/accname-1.2/#ex-2-example-2-h1-files-h1-ul-li-a-id-file_row1-href-files-documentation-pdf-documentation-pdf-a-span-role-button-tabindex-0-id-del_row1-aria-label-delete-aria-labelledby-del_row1-file_row1-span-li-li-a-id-file_row2-href-files-holidayletter-pdf-holidayletter-pdf-a-span-role-button-tabindex-0-id-del_row2-aria-label-delete-aria-labelledby-del_row2-file_row2-span-li-ul
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
	expect(getAccname(spans[0]!, specs, version)).toBe('Delete Documentation.pdf');
	expect(getAccname(spans[1]!, specs, version)).toBe('Delete HolidayLetter.pdf');
});

/**
 * @see https://www.w3.org/TR/accname-1.2/#ex-3-example-3-div-role-checkbox-aria-checked-false-flash-the-screen-span-role-textbox-aria-multiline-false-5-span-times-div
 */
test('accname-1.2 Example 3', () => {
	const complex = c(
		'<div role="checkbox" aria-checked="false">Flash the screen <span role="textbox" aria-multiline="false"> 5 </span> times</div>',
	);
	expect(getAccname(complex, specs, version)).toBe('Flash the screen 5 times');
});

test('with comment', () => {
	expect(getAccname(c('<button>label</button>'), specs, version)).toBe('label');
	expect(getAccname(c('<button>label<!-- comment --></button>'), specs, version)).toBe('label');
});

describe('Issues', () => {
	test('#1478', () => {
		expect(getAccname(c('<input placeholder=" placeholder text " />'), specs, version)).toBe('placeholder text');
	});
});
