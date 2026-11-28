import * as cheerio from 'cheerio';
import { describe, test, expect } from 'vitest';

import { readAriaInHtml } from './aria.ts';

/**
 * The shape of the table of ARIA in HTML §4.2 that `readAriaInHtml` reads: one row per native attribute, the first
 * link of the first cell names the attribute, and the first `code` of the second cell is the ARIA attribute it
 * stands for.
 *
 * @see https://www.w3.org/TR/html-aria/#requirements-for-use-of-aria-attributes-in-place-of-equivalent-html-attributes
 */
function table(...rows: readonly (readonly [attr: string, aria: string])[]) {
	const body = rows
		.map(
			([attr, aria]) =>
				`<tr><th>Element with <a href="#${attr}">${attr}</a></th><td><code>${aria}</code></td><td>Guidance</td></tr>`,
		)
		.join('');
	return cheerio.load(
		`<section id="requirements-for-use-of-aria-attributes-in-place-of-equivalent-html-attributes"><table><tbody>${body}</tbody></table></section>`,
	);
}

describe('readAriaInHtml', () => {
	test('reads the ARIA attribute and the value that a native attribute stands for', () => {
		const { implicitProps } = readAriaInHtml(
			table(['disabled', 'aria-disabled="true"'], ['placeholder', 'aria-placeholder="..."']),
		);
		expect(implicitProps).toStrictEqual([
			{ name: 'aria-disabled', value: 'true', htmlAttrName: 'disabled' },
			{ name: 'aria-placeholder', value: null, htmlAttrName: 'placeholder' },
		]);
	});

	test('reads the contenteditable row, whose condition is the editable state and not the presence of the attribute', () => {
		// > Element with contenteditable=true or element without contenteditable attribute whose closest ancestor with a contenteditable attribute has contenteditable="true".
		// @see https://www.w3.org/TR/html-aria/#docconformance-attr
		const { implicitProps } = readAriaInHtml(
			table(['readonly', 'aria-readonly="true"'], ['contenteditable', 'aria-readonly="false"']),
		);
		expect(implicitProps).toStrictEqual([
			{ name: 'aria-readonly', value: 'true', htmlAttrName: 'readonly' },
			{ name: 'aria-readonly', value: 'false', htmlAttrName: 'contenteditable', condition: 'editable' },
		]);
	});

	test('skips a row that names no ARIA attribute', () => {
		expect(readAriaInHtml(table(['hidden', ''])).implicitProps).toStrictEqual([]);
	});
});
