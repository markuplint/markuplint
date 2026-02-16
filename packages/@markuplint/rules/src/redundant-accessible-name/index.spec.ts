import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('No violations (single source)', () => {
	test('label only (explicit)', async () => {
		const { violations } = await mlRuleTest(rule, '<input id="x" type="text"><label for="x">Label</label>');
		expect(violations).toStrictEqual([]);
	});

	test('content only (button)', async () => {
		const { violations } = await mlRuleTest(rule, '<button>Click</button>');
		expect(violations).toStrictEqual([]);
	});

	test('alt only (img)', async () => {
		const { violations } = await mlRuleTest(rule, '<img alt="Photo">');
		expect(violations).toStrictEqual([]);
	});

	test('aria-label only', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text" aria-label="X">');
		expect(violations).toStrictEqual([]);
	});

	test('aria-labelledby only', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text" aria-labelledby="y"><span id="y">Y</span>');
		expect(violations).toStrictEqual([]);
	});

	test('hidden input is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="hidden">');
		expect(violations).toStrictEqual([]);
	});

	test('aria-hidden element is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-hidden="true" aria-label="X">Text</div>');
		expect(violations).toStrictEqual([]);
	});

	test('no accessible name at all', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text">');
		expect(violations).toStrictEqual([]);
	});
});

describe('Violations (override detected)', () => {
	test('aria-labelledby + explicit label', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input id="x" type="text" aria-labelledby="y"><label for="x">L</label><span id="y">Y</span>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toContain('aria-labelledby');
		expect(violations[0]?.message).toContain('label');
	});

	test('aria-labelledby + implicit label', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<label><input type="text" aria-labelledby="y">L</label><span id="y">Y</span>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-labelledby');
		expect(violations[0]?.message).toContain('label');
	});

	test('aria-label + explicit label', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input id="x" type="text" aria-label="X"><label for="x">L</label>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-label');
		expect(violations[0]?.message).toContain('label');
	});

	test('aria-label + implicit label', async () => {
		const { violations } = await mlRuleTest(rule, '<label><input type="text" aria-label="X">L</label>');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-label');
		expect(violations[0]?.message).toContain('label');
	});

	test('aria-label + content (button) — full match', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-label="X">Click</button>');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 1,
				raw: '<button aria-label="X">',
				message: 'The accessible name from "aria-label" overrides "content"',
			},
		]);
	});

	test('aria-labelledby + content (button)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button aria-labelledby="y">Click</button><span id="y">Y</span>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-labelledby');
		expect(violations[0]?.message).toContain('content');
	});

	test('aria-label + alt (img)', async () => {
		const { violations } = await mlRuleTest(rule, '<img alt="Photo" aria-label="X">');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-label');
		expect(violations[0]?.message).toContain('alt');
	});

	test('aria-labelledby + alt (img)', async () => {
		const { violations } = await mlRuleTest(rule, '<img alt="Photo" aria-labelledby="y"><span id="y">Y</span>');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-labelledby');
		expect(violations[0]?.message).toContain('alt');
	});

	test('aria-labelledby + aria-label', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input type="text" aria-labelledby="y" aria-label="X"><span id="y">Y</span>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-labelledby');
		expect(violations[0]?.message).toContain('aria-label');
	});

	test('aria-labelledby + aria-label + content (3 sources)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button aria-labelledby="y" aria-label="X">Click</button><span id="y">Y</span>',
		);
		expect(violations.length).toBe(2);
	});

	test('aria-label + legend (fieldset)', async () => {
		const { violations } = await mlRuleTest(rule, '<fieldset aria-label="X"><legend>Group</legend></fieldset>');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-label');
		expect(violations[0]?.message).toContain('legend');
	});

	test('aria-label + caption (table)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<table aria-label="X"><caption>Title</caption><tr><td>Data</td></tr></table>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-label');
		expect(violations[0]?.message).toContain('caption');
	});

	test('aria-label + value (input[type=submit])', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="submit" value="Go" aria-label="X">');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-label');
		expect(violations[0]?.message).toContain('value');
	});

	test('aria-labelledby self-reference + content (heading)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<h2 id="h" aria-labelledby="h foo">Meeting</h2><span id="foo">Notes</span>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-labelledby');
		expect(violations[0]?.message).toContain('content');
	});

	test('aria-labelledby referencing label ID + extra context', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<label for="x" id="lbl">Name</label><input id="x" aria-labelledby="lbl extra"><span id="extra">(required)</span>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-labelledby');
		expect(violations[0]?.message).toContain('label');
	});

	test('summary + aria-label', async () => {
		const { violations } = await mlRuleTest(rule, '<details><summary aria-label="X">Details</summary></details>');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('aria-label');
		expect(violations[0]?.message).toContain('content');
	});
});

describe('Options: checkTitleFallback / checkPlaceholderFallback', () => {
	test('title + label, option false (default) — no violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input id="x" type="text" title="Hint"><label for="x">L</label>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('title + label, option true — violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input id="x" type="text" title="Hint"><label for="x">L</label>',
			{
				rule: { options: { checkTitleFallback: true } },
			},
		);
		expect(violations.length).toBe(1);
	});

	test('placeholder + label, option false (default) — no violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input id="x" type="text" placeholder="Hint"><label for="x">L</label>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('placeholder + label, option true — violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input id="x" type="text" placeholder="Hint"><label for="x">L</label>',
			{
				rule: { options: { checkPlaceholderFallback: true } },
			},
		);
		expect(violations.length).toBe(1);
	});
});

describe('Edge cases', () => {
	test('empty aria-label="" does not count as a source', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-label="">Click</button>');
		expect(violations).toStrictEqual([]);
	});

	test('empty aria-labelledby="" does not count as a source', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-labelledby="">Click</button>');
		expect(violations).toStrictEqual([]);
	});

	test('aria-labelledby referencing non-existent ID does not count', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-labelledby="nonexistent">Click</button>');
		expect(violations).toStrictEqual([]);
	});

	test('mutable attribute (JSX) is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-label={label}>Click</button>', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('mutable attribute (Vue) is skipped', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><button :aria-label="label">Click</button></template>',
			{
				parser: { '.*': '@markuplint/vue-parser' },
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('mutable attribute (Svelte) is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-label={label}>Click</button>', {
			parser: { '.*': '@markuplint/svelte-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('nameFrom prohibited role (generic) is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="generic" aria-label="X">Text</div>');
		expect(violations).toStrictEqual([]);
	});

	test('nameFrom prohibited role (presentation) is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="presentation" aria-label="X">Text</div>');
		expect(violations).toStrictEqual([]);
	});

	test('nameFrom prohibited role (none) is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="none" aria-label="X">Text</div>');
		expect(violations).toStrictEqual([]);
	});

	test('nested fieldset — legend belongs to inner fieldset, not outer', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<fieldset aria-label="X"><fieldset><legend>Inner</legend></fieldset></fieldset>',
		);
		// Only aria-label on outer fieldset, no legend as direct child → 0 violations
		expect(violations).toStrictEqual([]);
	});

	test('nested table — caption belongs to inner table, not outer', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<table aria-label="X"><tr><td><table><caption>Inner</caption><tr><td>D</td></tr></table></td></tr></table>',
		);
		// Only aria-label on outer table, no caption as direct child → 0 violations
		expect(violations).toStrictEqual([]);
	});
});
