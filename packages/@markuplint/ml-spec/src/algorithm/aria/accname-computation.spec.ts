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
