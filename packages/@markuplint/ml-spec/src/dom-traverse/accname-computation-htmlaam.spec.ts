import { createJSDOMElement as c } from '@markuplint/test-tools';
import { test, expect, describe } from 'vitest';

import { getAccname } from './accname-computation.js';

describe('HTML-AAM §4.1 Accessible Name Computation', () => {
	describe('Elements with aria-label or aria-labelledby (should use accname library)', () => {
		test('aria-label takes precedence', () => {
			expect(getAccname(c('<div aria-label="custom label">text content</div>'))).toBe('custom label');
			expect(getAccname(c('<img alt="alt text" aria-label="custom label" />'))).toBe('custom label');
			expect(getAccname(c('<button aria-label="custom label">button text</button>'))).toBe('custom label');
		});

		test('aria-labelledby references other elements', () => {
			const container = c('<div><span aria-labelledby="ref">text</span><div id="ref">Referenced text</div></div>');
			const spanElement = container.querySelector('span')!;
			expect(getAccname(spanElement)).toBe('Referenced text');
		});
	});

	describe('IMG elements (element-specific logic)', () => {
		test('uses alt attribute', () => {
			expect(getAccname(c('<img alt="image description" />'))).toBe('image description');
			expect(getAccname(c('<img alt="" />'))).toBe('');
			expect(getAccname(c('<img alt="  spaced alt  " />'))).toBe('spaced alt');
		});

		test('falls back to title when no alt', () => {
			expect(getAccname(c('<img title="title text" />'))).toBe('title text');
			expect(getAccname(c('<img title="  spaced title  " />'))).toBe('spaced title');
		});

		test('alt takes precedence over title', () => {
			expect(getAccname(c('<img alt="alt text" title="title text" />'))).toBe('alt text');
		});

		test('returns empty string when no alt or title', () => {
			expect(getAccname(c('<img />'))).toBe('');
		});
	});

	describe('BUTTON elements (element-specific logic)', () => {
		test('uses text content', () => {
			expect(getAccname(c('<button>Click me</button>'))).toBe('Click me');
			expect(getAccname(c('<button>  spaced text  </button>'))).toBe('spaced text');
		});

		test('includes nested element text', () => {
			expect(getAccname(c('<button><span>Nested</span> text</button>'))).toBe('Nested text');
		});

		test('excludes hidden elements', () => {
			expect(getAccname(c('<button>Visible <span aria-hidden="true">Hidden</span> text</button>'))).toBe('Visible  text');
			expect(getAccname(c('<button>Visible <span hidden>Hidden</span> text</button>'))).toBe('Visible  text');
		});

		test('returns empty string for empty button', () => {
			expect(getAccname(c('<button></button>'))).toBe('');
		});
	});

	describe('INPUT elements (element-specific logic)', () => {
		test('uses associated label with for attribute', () => {
			const container = c('<div><label for="input1">Label text</label><input id="input1" type="text" /></div>');
			const inputElement = container.querySelector('input')!;
			expect(getAccname(inputElement)).toBe('Label text');
		});

		test('uses parent label', () => {
			const container = c('<label>Label text <input type="text" /></label>');
			const inputElement = container.querySelector('input')!;
			expect(getAccname(inputElement)).toBe('Label text');
		});

		test('falls back to placeholder', () => {
			expect(getAccname(c('<input type="text" placeholder="Enter text" />'))).toBe('Enter text');
			expect(getAccname(c('<input type="text" placeholder="  spaced placeholder  " />'))).toBe('spaced placeholder');
		});

		test('returns empty string when no label or placeholder', () => {
			expect(getAccname(c('<input type="text" />'))).toBe('');
		});
	});

	describe('TEXTAREA and SELECT elements (element-specific logic)', () => {
		test('textarea uses associated label', () => {
			const container = c('<div><label for="textarea1">Textarea label</label><textarea id="textarea1"></textarea></div>');
			const textareaElement = container.querySelector('textarea')!;
			expect(getAccname(textareaElement)).toBe('Textarea label');
		});

		test('select uses associated label', () => {
			const container = c('<div><label for="select1">Select label</label><select id="select1"><option>Option</option></select></div>');
			const selectElement = container.querySelector('select')!;
			expect(getAccname(selectElement)).toBe('Select label');
		});
	});

	describe('TABLE elements (element-specific logic)', () => {
		test('uses caption element', () => {
			const table = c('<table><caption>Table caption</caption><tr><td>Data</td></tr></table>');
			expect(getAccname(table)).toBe('Table caption');
		});

		test('returns empty string when no caption', () => {
			const table = c('<table><tr><td>Data</td></tr></table>');
			expect(getAccname(table)).toBe('');
		});
	});

	describe('FIELDSET elements (element-specific logic)', () => {
		test('uses legend element', () => {
			const fieldset = c('<fieldset><legend>Fieldset legend</legend><input type="text" /></fieldset>');
			expect(getAccname(fieldset)).toBe('Fieldset legend');
		});

		test('returns empty string when no legend', () => {
			const fieldset = c('<fieldset><input type="text" /></fieldset>');
			expect(getAccname(fieldset)).toBe('');
		});
	});

	describe('Heading elements (element-specific logic)', () => {
		test('uses text content', () => {
			expect(getAccname(c('<h1>Heading 1</h1>'))).toBe('Heading 1');
			expect(getAccname(c('<h2>Heading 2</h2>'))).toBe('Heading 2');
			expect(getAccname(c('<h3><span>Nested</span> heading</h3>'))).toBe('Nested heading');
		});
	});

	describe('Anchor elements (element-specific logic)', () => {
		test('uses text content', () => {
			expect(getAccname(c('<a href="#">Link text</a>'))).toBe('Link text');
			expect(getAccname(c('<a href="#"><span>Nested</span> link</a>'))).toBe('Nested link');
		});
	});

	describe('Other elements (no accessible name without aria attributes)', () => {
		test('div returns empty string', () => {
			expect(getAccname(c('<div>text content</div>'))).toBe('');
		});

		test('span returns empty string', () => {
			expect(getAccname(c('<span>text content</span>'))).toBe('');
		});

		test('p returns empty string', () => {
			expect(getAccname(c('<p>paragraph text</p>'))).toBe('');
		});
	});
});