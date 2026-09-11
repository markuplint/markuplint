import { describe, expect, test } from 'vitest';

import { computeAccessibleName } from '../compute.js';

import { createTestResolver, element, textNode } from './test-helpers.js';

describe('computeAccessibleName', () => {
	test('empty element returns empty name', () => {
		const el = element('div');
		const resolver = createTestResolver();
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('hidden element returns empty name', () => {
		const el = element('button', {
			attrs: { 'aria-hidden': 'true' },
			children: [textNode('Click me')],
		});
		const resolver = createTestResolver();
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('hidden attribute returns empty name', () => {
		const el = element('button', {
			attrs: { hidden: '' },
			children: [textNode('Click me')],
		});
		const resolver = createTestResolver();
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('aria-label takes precedence over content', () => {
		const el = element('div', {
			attrs: { 'aria-label': 'Custom label' },
			children: [textNode('Content text')],
		});
		const resolver = createTestResolver({ nameFromContent: new Set(['div']) });
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Custom label');
		expect(result.source).toBe('aria-label');
	});

	test('empty aria-label is skipped', () => {
		const el = element('button', {
			attrs: { 'aria-label': '   ' },
			children: [textNode('Click')],
		});
		const resolver = createTestResolver({ nameFromContent: new Set(['button']) });
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Click');
		expect(result.source).toBe('content');
	});

	test('aria-labelledby resolves references', () => {
		const refEl = element('span', {
			attrs: { id: 'ref1' },
			children: [textNode('Reference text')],
		});
		const el = element('input', {
			attrs: { 'aria-labelledby': 'ref1' },
		});
		const resolver = createTestResolver({
			elements: new Map([['ref1', refEl]]),
			nameFromContent: new Set(['span']),
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Reference text');
		expect(result.source).toBe('aria-labelledby');
	});

	test('aria-labelledby with multiple IDs', () => {
		const ref1 = element('span', {
			attrs: { id: 'ref1' },
			children: [textNode('First')],
		});
		const ref2 = element('span', {
			attrs: { id: 'ref2' },
			children: [textNode('Second')],
		});
		const el = element('input', {
			attrs: { 'aria-labelledby': 'ref1 ref2' },
		});
		const resolver = createTestResolver({
			elements: new Map([
				['ref1', ref1],
				['ref2', ref2],
			]),
			nameFromContent: new Set(['span']),
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('First Second');
		expect(result.source).toBe('aria-labelledby');
	});

	test('aria-labelledby with non-existent ID is skipped', () => {
		const el = element('input', {
			attrs: { 'aria-labelledby': 'nonexistent' },
		});
		const resolver = createTestResolver();
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('');
	});

	test('aria-labelledby takes precedence over aria-label', () => {
		const refEl = element('span', {
			attrs: { id: 'ref1' },
			children: [textNode('Labelledby')],
		});
		const el = element('input', {
			attrs: { 'aria-labelledby': 'ref1', 'aria-label': 'Label' },
		});
		const resolver = createTestResolver({
			elements: new Map([['ref1', refEl]]),
			nameFromContent: new Set(['span']),
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Labelledby');
		expect(result.source).toBe('aria-labelledby');
	});

	test('name from content for roles that allow it', () => {
		const el = element('h1', {
			children: [textNode('Heading text')],
		});
		const resolver = createTestResolver({ nameFromContent: new Set(['h1']) });
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Heading text');
		expect(result.source).toBe('content');
	});

	test('nested content with mixed text and elements', () => {
		const inner = element('em', {
			children: [textNode('emphasized')],
		});
		const el = element('h1', {
			children: [textNode('Hello '), inner, textNode(' world')],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1', 'em']),
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Hello emphasized world');
		expect(result.source).toBe('content');
	});

	test('title fallback when no other source available', () => {
		const el = element('div', {
			attrs: { title: 'Title text' },
		});
		const resolver = createTestResolver();
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Title text');
		expect(result.source).toBe('title');
	});

	test('whitespace is collapsed and trimmed', () => {
		const el = element('h1', {
			children: [textNode('  Hello   world  ')],
		});
		const resolver = createTestResolver({ nameFromContent: new Set(['h1']) });
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Hello world');
	});
});

describe('C1: checkbox/radio are not embedded controls', () => {
	test('checkbox is not an embedded control', () => {
		const checkbox = element('input', {
			attrs: { type: 'checkbox' },
			children: [],
		});
		const label = element('label', {
			children: [checkbox, textNode('Accept terms')],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['label']),
		});
		const result = computeAccessibleName(label, resolver);
		// checkbox should NOT be treated as embedded control, so its textContent
		// should not appear separately; the label text is collected normally
		expect(result.name).toBe('Accept terms');
		expect(result.source).toBe('content');
	});

	test('radio is not an embedded control', () => {
		const radio = element('input', {
			attrs: { type: 'radio' },
			children: [],
		});
		const label = element('label', {
			children: [radio, textNode('Option A')],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['label']),
		});
		const result = computeAccessibleName(label, resolver);
		expect(result.name).toBe('Option A');
		expect(result.source).toBe('content');
	});
});

describe('S1: embedded control value extraction', () => {
	describe('range controls (slider/spinbutton)', () => {
		test('slider uses aria-valuetext', () => {
			const slider = element('div', {
				attrs: { role: 'slider', 'aria-valuetext': 'Medium', 'aria-valuenow': '50' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Volume: '), slider],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Volume: Medium');
		});

		test('slider falls back to aria-valuenow', () => {
			const slider = element('div', {
				attrs: { role: 'slider', 'aria-valuenow': '75' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Volume: '), slider],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Volume: 75');
		});

		test('slider falls back to value attr when no aria attributes', () => {
			const slider = element('div', {
				attrs: { role: 'slider', value: '50' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Level: '), slider],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Level: 50');
		});

		test('slider with empty aria-valuetext falls back to aria-valuenow', () => {
			const slider = element('div', {
				attrs: { role: 'slider', 'aria-valuetext': '   ', 'aria-valuenow': '30' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Vol: '), slider],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Vol: 30');
		});

		test('spinbutton uses aria-valuetext', () => {
			const spinbutton = element('div', {
				attrs: { role: 'spinbutton', 'aria-valuetext': 'Three', 'aria-valuenow': '3' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Count: '), spinbutton],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Count: Three');
		});

		test('spinbutton falls back to aria-valuenow', () => {
			const spinbutton = element('div', {
				attrs: { role: 'spinbutton', 'aria-valuenow': '7' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Count: '), spinbutton],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Count: 7');
		});

		test('native input[type=range] uses value', () => {
			const range = element('input', {
				attrs: { type: 'range', value: '42' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Brightness: '), range],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Brightness: 42');
		});
	});

	describe('textbox/combobox/searchbox', () => {
		test('textbox role uses value attr', () => {
			const textbox = element('span', {
				attrs: { role: 'textbox', value: 'typed text' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Input: '), textbox],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Input: typed text');
		});

		test('combobox role uses value attr', () => {
			const combobox = element('div', {
				attrs: { role: 'combobox', value: 'selected' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Choice: '), combobox],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Choice: selected');
		});

		test('searchbox role uses value attr', () => {
			const searchbox = element('div', {
				attrs: { role: 'searchbox', value: 'query' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Search: '), searchbox],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Search: query');
		});

		test('textarea uses textContent', () => {
			const textarea = element('textarea', {
				children: [textNode('typed content')],
			});
			const label = element('h1', {
				children: [textNode('Notes: '), textarea],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Notes: typed content');
		});

		test('textbox with empty value returns empty string', () => {
			const textbox = element('input', {
				attrs: { type: 'text', value: '' },
				children: [],
			});
			const label = element('h1', {
				children: [textNode('Name: '), textbox],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			// value="" is a valid empty value (value != null), returns empty string
			expect(result.name).toBe('Name:');
		});
	});

	describe('listbox/select', () => {
		test('listbox role uses textContent', () => {
			const option = element('div', {
				attrs: { role: 'option' },
				children: [textNode('Option A')],
			});
			const listbox = element('div', {
				attrs: { role: 'listbox' },
				children: [option],
			});
			const label = element('h1', {
				children: [textNode('Pick: '), listbox],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Pick: Option A');
		});

		test('select with single option uses that option text', () => {
			const opt = element('option', {
				children: [textNode('Red')],
			});
			const sel = element('select', {
				children: [opt],
			});
			const label = element('h1', {
				children: [textNode('Color: '), sel],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Color: Red');
		});

		test('select returns selected option, not all options', () => {
			const opt1 = element('option', { children: [textNode('Red')] });
			const opt2 = element('option', {
				attrs: { selected: '' },
				children: [textNode('Green')],
			});
			const opt3 = element('option', { children: [textNode('Blue')] });
			const sel = element('select', {
				children: [opt1, opt2, opt3],
			});
			const label = element('h1', {
				children: [textNode('Color: '), sel],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Color: Green');
		});

		test('select with no selected attr defaults to first non-disabled option', () => {
			const opt1 = element('option', { children: [textNode('Red')] });
			const opt2 = element('option', { children: [textNode('Green')] });
			const sel = element('select', {
				children: [opt1, opt2],
			});
			const label = element('h1', {
				children: [textNode('Color: '), sel],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Color: Red');
		});

		test('select with first option disabled defaults to second option', () => {
			const opt1 = element('option', {
				attrs: { disabled: '' },
				children: [textNode('-- Choose --')],
			});
			const opt2 = element('option', { children: [textNode('Red')] });
			const sel = element('select', {
				children: [opt1, opt2],
			});
			const label = element('h1', {
				children: [textNode('Color: '), sel],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Color: Red');
		});

		test('select multiple with multiple selected options joins texts', () => {
			const opt1 = element('option', {
				attrs: { selected: '' },
				children: [textNode('Red')],
			});
			const opt2 = element('option', { children: [textNode('Green')] });
			const opt3 = element('option', {
				attrs: { selected: '' },
				children: [textNode('Blue')],
			});
			const sel = element('select', {
				attrs: { multiple: '' },
				children: [opt1, opt2, opt3],
			});
			const label = element('h1', {
				children: [textNode('Colors: '), sel],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Colors: Red Blue');
		});

		test('select with optgroup collects options from groups', () => {
			const opt1 = element('option', {
				attrs: { selected: '' },
				children: [textNode('Sedan')],
			});
			const opt2 = element('option', { children: [textNode('SUV')] });
			const optgroup = element('optgroup', {
				attrs: { label: 'Cars' },
				children: [opt1, opt2],
			});
			const sel = element('select', {
				children: [optgroup],
			});
			const label = element('h1', {
				children: [textNode('Vehicle: '), sel],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['h1']),
			});
			const result = computeAccessibleName(label, resolver);
			expect(result.name).toBe('Vehicle: Sedan');
		});
	});
});

describe('C2: isHidden before getPrecomputedName', () => {
	test('hidden element with precomputed name returns empty', () => {
		const el = element('div', {
			attrs: { 'aria-hidden': 'true' },
			children: [textNode('Content')],
		});
		const resolver = createTestResolver({
			getPrecomputedNameFn: () => 'Precomputed',
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('visible element with precomputed name returns that name', () => {
		const el = element('div', {
			children: [textNode('Content')],
		});
		const resolver = createTestResolver({
			getPrecomputedNameFn: () => 'Precomputed',
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Precomputed');
		expect(result.source).toBe('content');
	});

	test('precomputed name null falls through to normal computation', () => {
		const el = element('button', {
			children: [textNode('Click me')],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['button']),
			getPrecomputedNameFn: () => null,
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Click me');
		expect(result.source).toBe('content');
	});

	test('precomputed empty string is returned as-is (not null)', () => {
		const el = element('div', {
			attrs: { title: 'Title fallback' },
		});
		const resolver = createTestResolver({
			getPrecomputedNameFn: () => '',
		});
		const result = computeAccessibleName(el, resolver);
		// empty string is != null, so precomputed path returns it; flattenText normalizes to ''
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('precomputed name wins over aria-labelledby', () => {
		const ref = element('span', {
			attrs: { id: 'ref' },
			children: [textNode('Reference')],
		});
		const el = element('input', {
			attrs: { 'aria-labelledby': 'ref' },
		});
		const resolver = createTestResolver({
			elements: new Map([['ref', ref]]),
			nameFromContent: new Set(['span']),
			getPrecomputedNameFn: () => 'Precomputed',
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Precomputed');
		expect(result.source).toBe('content');
	});

	test('precomputed name wins over aria-label', () => {
		const el = element('div', {
			attrs: { 'aria-label': 'ARIA label' },
		});
		const resolver = createTestResolver({
			getPrecomputedNameFn: () => 'Precomputed',
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Precomputed');
		expect(result.source).toBe('content');
	});
});

describe('T-3: custom isHidden function', () => {
	test('custom isHidden via style detection', () => {
		const el = element('button', {
			attrs: { style: 'display: none' },
			children: [textNode('Hidden button')],
		});
		const resolver = createTestResolver({
			isHiddenFn: target => target.getAttribute('style')?.includes('display: none') ?? false,
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('custom isHidden returns false allows name computation', () => {
		const el = element('button', {
			attrs: { style: 'display: block' },
			children: [textNode('Visible button')],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['button']),
			isHiddenFn: target => target.getAttribute('style')?.includes('display: none') ?? false,
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('Visible button');
		expect(result.source).toBe('content');
	});

	test('custom isHidden hides descendants in content traversal', () => {
		const hidden = element('span', {
			attrs: { class: 'sr-only' },
			children: [textNode('hidden')],
		});
		const visible = element('span', {
			children: [textNode('visible')],
		});
		const el = element('h1', {
			children: [visible, textNode(' '), hidden],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1']),
			isHiddenFn: target => target.getAttribute('class') === 'sr-only',
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('visible');
	});

	test('hidden element with aria-label still returns empty', () => {
		const el = element('button', {
			attrs: { 'aria-hidden': 'true', 'aria-label': 'Accessible label' },
			children: [textNode('Content')],
		});
		const resolver = createTestResolver();
		const result = computeAccessibleName(el, resolver);
		// Hidden check (Step 2A) runs before aria-label (Step 2D)
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('hidden element referenced by aria-labelledby still provides name', () => {
		const hiddenBtn = element('span', {
			attrs: { id: 'hidden-ref', 'aria-hidden': 'true' },
			children: [textNode('Hidden but referenced')],
		});
		const el = element('input', {
			attrs: { 'aria-labelledby': 'hidden-ref' },
		});
		const resolver = createTestResolver({
			elements: new Map([['hidden-ref', hiddenBtn]]),
			nameFromContent: new Set(['span']),
		});
		const result = computeAccessibleName(el, resolver);
		// aria-labelledby sets inLabelledbyTraversal=true, bypassing hidden check
		expect(result.name).toBe('Hidden but referenced');
		expect(result.source).toBe('aria-labelledby');
	});

	test('deeply nested hidden child is skipped in content traversal', () => {
		const deepHidden = element('em', {
			attrs: { hidden: '' },
			children: [textNode('deep-hidden')],
		});
		const inner = element('span', {
			children: [textNode('inner '), deepHidden],
		});
		const el = element('h1', {
			children: [textNode('outer '), inner],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1', 'span', 'em']),
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('outer inner');
	});
});

describe('S2: embedded control ignores aria-label in name-from-content', () => {
	test('embedded control with aria-label ignores it per spec and uses value', () => {
		const textbox = element('input', {
			attrs: { type: 'text', 'aria-label': 'Search query', value: 'hello' },
			children: [],
		});
		const label = element('h1', {
			children: [textNode('Search: '), textbox],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1']),
		});
		const result = computeAccessibleName(label, resolver);
		// Per AccName spec: embedded controls in name-from-content recursion
		// must ignore aria-label and use their value directly
		expect(result.name).toBe('Search: hello');
	});

	test('embedded control without aria-label uses value', () => {
		const textbox = element('input', {
			attrs: { type: 'text', value: 'hello' },
			children: [],
		});
		const label = element('h1', {
			children: [textNode('Search: '), textbox],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1']),
		});
		const result = computeAccessibleName(label, resolver);
		expect(result.name).toBe('Search: hello');
	});
});

describe('collectTextContent behavior', () => {
	test('hidden descendants are skipped in text collection', () => {
		const hidden = element('span', {
			attrs: { 'aria-hidden': 'true' },
			children: [textNode('hidden')],
		});
		const visible = element('span', {
			children: [textNode('visible')],
		});
		const el = element('h1', {
			children: [visible, hidden],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1']),
		});
		const result = computeAccessibleName(el, resolver);
		expect(result.name).toBe('visible');
	});

	test('aria-labelledby references hidden element and gets its name', () => {
		const hiddenEl = element('span', {
			attrs: { id: 'hidden-label', 'aria-hidden': 'true' },
			children: [textNode('Hidden label text')],
		});
		const el = element('input', {
			attrs: { 'aria-labelledby': 'hidden-label' },
		});
		const resolver = createTestResolver({
			elements: new Map([['hidden-label', hiddenEl]]),
			nameFromContent: new Set(['span']),
		});
		const result = computeAccessibleName(el, resolver);
		// aria-labelledby can reference hidden elements
		expect(result.name).toBe('Hidden label text');
		expect(result.source).toBe('aria-labelledby');
	});
});

describe('T4-1: input[type=hidden] with aria-label — Step 2D precedes Step 2E', () => {
	test('aria-label is resolved before element-specific handler returns empty', () => {
		const el = element('input', {
			attrs: { type: 'hidden', 'aria-label': 'Hidden field label' },
		});
		const resolver = createTestResolver();
		const result = computeAccessibleName(el, resolver);
		// Step 2D (aria-label) runs before Step 2E (input[hidden] → empty).
		// So aria-label should provide the name.
		expect(result.name).toBe('Hidden field label');
		expect(result.source).toBe('aria-label');
	});
});

describe('T4-4: aria-labelledby cycle prevention (A→B→A)', () => {
	test('mutual reference resolves without infinite loop', () => {
		const elA = element('h2', {
			attrs: { id: 'a', 'aria-labelledby': 'b' },
			children: [textNode('Heading A')],
		});
		const elB = element('span', {
			attrs: { id: 'b', 'aria-labelledby': 'a' },
			children: [textNode('Label B')],
		});
		const resolver = createTestResolver({
			elements: new Map([
				['a', elA],
				['b', elB],
			]),
			nameFromContent: new Set(['h2', 'span']),
		});
		// A references B; B references A but A is already visited → uses B's content
		const result = computeAccessibleName(elA, resolver);
		expect(result.name).toBe('Label B');
		expect(result.source).toBe('aria-labelledby');
	});
});

describe('T4-5: input[type=range] with no value attributes', () => {
	test('range with no aria-valuetext/aria-valuenow/value falls back to textContent', () => {
		const range = element('input', {
			attrs: { type: 'range' },
			children: [],
		});
		const label = element('h1', {
			children: [textNode('Volume: '), range],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1']),
		});
		const result = computeAccessibleName(label, resolver);
		// input has no textContent, so embedded control value is empty
		expect(result.name).toBe('Volume:');
	});
});

describe('T4-6: select with all options disabled', () => {
	test('returns empty when all options are disabled and none selected', () => {
		const opt1 = element('option', {
			attrs: { disabled: '' },
			children: [textNode('Option A')],
		});
		const opt2 = element('option', {
			attrs: { disabled: '' },
			children: [textNode('Option B')],
		});
		const sel = element('select', {
			children: [opt1, opt2],
		});
		const label = element('h1', {
			children: [textNode('Choice: '), sel],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['h1']),
		});
		const result = computeAccessibleName(label, resolver);
		// No selected option and no non-disabled option → empty
		expect(result.name).toBe('Choice:');
	});
});

describe('T4-8: nested fieldset with legend', () => {
	test('outer fieldset gets name from its own legend, not inner legend', () => {
		const innerLegend = element('legend', {
			children: [textNode('Inner Legend')],
		});
		const innerFieldset = element('fieldset', {
			children: [innerLegend],
		});
		const outerLegend = element('legend', {
			children: [textNode('Outer Legend')],
		});
		const outerFieldset = element('fieldset', {
			children: [outerLegend, innerFieldset],
		});
		const resolver = createTestResolver({
			nameFromContent: new Set(['legend']),
		});
		const result = computeAccessibleName(outerFieldset, resolver);
		expect(result.name).toBe('Outer Legend');
		expect(result.source).toBe('legend');
	});
});

describe('T4-9: label containing embedded control', () => {
	test('label text includes embedded control value', () => {
		// The labeled element must be the SAME object in both the label's
		// children and the computation target, so collectLabelText can
		// exclude it via reference equality (childEl === labeledElement).
		const target = element('input', {
			attrs: { id: 'amount', type: 'text', value: '50' },
		});
		const label = element('label', {
			attrs: { for: 'amount' },
			children: [textNode('Donate '), target, textNode(' dollars')],
		});
		const resolver = createTestResolver({
			labels: new Map([['amount', [label]]]),
			nameFromContent: new Set(['label']),
		});
		const result = computeAccessibleName(target, resolver);
		// The labeled element itself is excluded from label text collection,
		// so only "Donate" and "dollars" remain
		expect(result.name).toBe('Donate dollars');
		expect(result.source).toBe('label');
	});

	test('non-labeled embedded control inside label — computeFn resolves its name, not value', () => {
		const target = element('input', {
			attrs: { id: 'name', type: 'text' },
		});
		const otherInput = element('input', {
			attrs: { type: 'text', value: '50', title: 'Amount' },
		});
		const label = element('label', {
			attrs: { for: 'name' },
			children: [textNode('Donate '), otherInput, textNode(' dollars')],
		});
		const resolver = createTestResolver({
			labels: new Map([['name', [label]]]),
			nameFromContent: new Set(['label']),
		});
		const result = computeAccessibleName(target, resolver);
		// collectLabelText calls computeFn (full AccName algorithm) on child
		// elements, NOT resolveNameFromContent. So the input's accessible name
		// (from title fallback) is used, not its embedded control value.
		expect(result.name).toBe('Donate Amount dollars');
		expect(result.source).toBe('label');
	});
});

describe('T4-10: aria-labelledby referencing a container with embedded control', () => {
	test('embedded control value is collected during name-from-content of referenced element', () => {
		const textbox = element('input', {
			attrs: { type: 'text', value: 'markuplint' },
		});
		const wrapper = element('div', {
			attrs: { id: 'search-group' },
			children: [textNode('Search: '), textbox],
		});
		const el = element('button', {
			attrs: { 'aria-labelledby': 'search-group' },
			children: [textNode('Go')],
		});
		const resolver = createTestResolver({
			elements: new Map([['search-group', wrapper]]),
			nameFromContent: new Set(['button']),
		});
		const result = computeAccessibleName(el, resolver);
		// aria-labelledby references wrapper → name-from-content traversal
		// → embedded control (textbox) value is collected
		expect(result.name).toBe('Search: markuplint');
		expect(result.source).toBe('aria-labelledby');
	});
});

describe('aria-labelledby enables name-from-content regardless of role', () => {
	test('element with non-nameFromContent role provides text when referenced by aria-labelledby', () => {
		// role="group" does NOT allow nameFrom: ["content"], but when directly
		// referenced by aria-labelledby, its descendant text should be collected
		// per AccName 1.2 §4.3.2 Step 2F.
		const group = element('div', {
			attrs: { id: 'group1', role: 'group' },
			children: [textNode('Important Section')],
		});
		const button = element('button', {
			attrs: { 'aria-labelledby': 'group1' },
			children: [textNode('Click')],
		});
		const resolver = createTestResolver({
			elements: new Map([['group1', group]]),
			nameFromContent: new Set(['button']),
		});
		const result = computeAccessibleName(button, resolver);
		expect(result.name).toBe('Important Section');
		expect(result.source).toBe('aria-labelledby');
	});

	test('element without any role provides text when referenced by aria-labelledby', () => {
		const div = element('div', {
			attrs: { id: 'desc' },
			children: [textNode('Description text')],
		});
		const input = element('input', {
			attrs: { 'aria-labelledby': 'desc' },
		});
		const resolver = createTestResolver({
			elements: new Map([['desc', div]]),
			nameFromContent: new Set(),
		});
		const result = computeAccessibleName(input, resolver);
		expect(result.name).toBe('Description text');
		expect(result.source).toBe('aria-labelledby');
	});
});
