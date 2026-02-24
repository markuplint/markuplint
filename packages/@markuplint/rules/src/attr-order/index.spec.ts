import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('alphabetical order (value: true)', () => {
	test('no violation - already sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b" style="c"></div>');
		expect(violations.length).toBe(0);
	});

	test('violation - not sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<div style="x" class="a"></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'class',
				message: '"class" should be before "style"',
			},
		]);
	});

	test('no violation - single attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a"></div>');
		expect(violations.length).toBe(0);
	});

	test('no violation - no attributes', async () => {
		const { violations } = await mlRuleTest(rule, '<div></div>');
		expect(violations.length).toBe(0);
	});

	test('no violation - boolean attributes sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<input disabled readonly />');
		expect(violations.length).toBe(0);
	});

	test('violation - boolean attributes not sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<input readonly disabled />');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 17,
				raw: 'disabled',
				message: '"disabled" should be before "readonly"',
			},
		]);
	});
});

describe('priority list', () => {
	test('no violation - matches priority order', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" class="b" style="c"></div>', {
			rule: { value: ['id', 'class', 'style'] },
		});
		expect(violations.length).toBe(0);
	});

	test('violation - class before id', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: ['id', 'class'] },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'id',
				message: '"id" should be before "class"',
			},
		]);
	});

	test('unmatched attributes go to the end alphabetically', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" data-z="z" class="b" data-a="a"></div>', {
			rule: { value: ['id', 'class'] },
		});
		expect(violations.length).toBe(1);
	});

	test('unmatched attributes preserve source order when alphabetical: false', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" data-z="z" class="b" data-a="a"></div>', {
			rule: { value: ['id', 'class'], options: { alphabetical: false } },
		});
		// id → class → data-z → data-a (source order for unmatched)
		expect(violations.length).toBe(1);
	});
});

describe('group matching', () => {
	test('global group - class and id should precede data-x', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-x="1" class="a" id="b"></div>', {
			rule: { value: [{ group: 'global' }] },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 17,
				raw: 'class',
				message: '"class" should be before "data-x"',
			},
		]);
	});

	test('global → aria order', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label="x" class="a"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'aria' }] },
		});
		expect(violations.length).toBe(1);
	});

	test('no violation - global → aria → data correct order', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b" aria-label="x" data-x="1"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'aria' }, { group: 'data' }] },
		});
		expect(violations.length).toBe(0);
	});

	test('event group', async () => {
		const { violations } = await mlRuleTest(rule, '<div onclick="x" class="a"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'event' }] },
		});
		expect(violations.length).toBe(1);
	});

	test('data group', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-a="1" class="a"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'data' }] },
		});
		expect(violations.length).toBe(1);
	});
});

describe('pattern matching', () => {
	test('data- pattern first', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" data-x="1"></div>', {
			rule: { value: [{ pattern: '^data-' }] },
		});
		// data-x matches pattern → should be first
		expect(violations.length).toBe(1);
	});

	test('no violation - data- pattern first, already sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-x="1" class="a"></div>', {
			rule: { value: [{ pattern: '^data-' }] },
		});
		expect(violations.length).toBe(0);
	});
});

describe('conflict resolution (first-match-wins)', () => {
	test('explicit name vs global group - explicit wins', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: ['id', { group: 'global' }] },
		});
		// id matches "id" (entry 0), class matches global (entry 1)
		// id → class is correct order
		expect(violations.length).toBe(0);
	});

	test('explicit name vs global group - id should come before class', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: ['id', { group: 'global' }] },
		});
		// class → global (entry 1), id → "id" (entry 0)
		// Expected: id, class → violation
		expect(violations.length).toBe(1);
	});

	test('overlapping patterns - first pattern wins', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-bar="2" data-foo="1" class="a"></div>', {
			rule: { value: [{ pattern: '^d' }, { pattern: '^data-' }] },
		});
		// Both data-bar and data-foo match first pattern "^d"
		// Within group: alphabetical → data-bar, data-foo (already correct)
		// class is unmatched → goes to end
		expect(violations.length).toBe(0);
	});

	test('aria pattern vs aria group - first match wins', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label="x" aria-hidden="y"></div>', {
			rule: { value: [{ pattern: '^aria-label' }, { group: 'aria' }] },
		});
		// aria-label → pattern (entry 0), aria-hidden → aria group (entry 1)
		// aria-label, aria-hidden is correct order
		expect(violations.length).toBe(0);
	});
});

describe('group-internal order', () => {
	test('alphabetical order within group (default)', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: [{ group: 'global', order: 'alphabetical' }] },
		});
		// class < id alphabetically
		expect(violations.length).toBe(1);
	});

	test('source-order within group', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: [{ group: 'global', order: 'source-order' }] },
		});
		// source order is maintained → no violation
		expect(violations.length).toBe(0);
	});

	test('fixed order array within group', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-describedby="x" aria-label="y"></div>', {
			rule: { value: [{ group: 'aria', order: ['aria-label', 'aria-describedby'] }] },
		});
		// aria-label should be first
		expect(violations.length).toBe(1);
	});

	test('no violation - fixed order array correct', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label="y" aria-describedby="x"></div>', {
			rule: { value: [{ group: 'aria', order: ['aria-label', 'aria-describedby'] }] },
		});
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('fix: alphabetical sort', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div style="x" class="a"></div>', undefined, true);
		expect(fixedCode).toBe('<div class="a" style="x"></div>');
	});

	test('fix: three attributes alphabetical', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div style="x" class="a" id="b"></div>', undefined, true);
		expect(fixedCode).toBe('<div class="a" id="b" style="x"></div>');
	});

	test('fix: priority list', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div class="a" id="b"></div>',
			{ rule: { value: ['id', 'class'] } },
			true,
		);
		expect(fixedCode).toBe('<div id="b" class="a"></div>');
	});

	test('fix: multiline attributes preserve spacing', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div\n  style="x"\n  class="a"\n></div>', undefined, true);
		expect(fixedCode).toBe('<div\n  class="a"\n  style="x"\n></div>');
	});

	test('fix: boolean attributes', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<input readonly disabled />', undefined, true);
		expect(fixedCode).toBe('<input disabled readonly />');
	});

	test('fix: group order', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div data-x="1" class="a" id="b"></div>',
			{ rule: { value: [{ group: 'global' }, { group: 'data' }] } },
			true,
		);
		expect(fixedCode).toBe('<div class="a" id="b" data-x="1"></div>');
	});

	test('fix: options.alphabetical false - unmatched preserve source order', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div data-z="z" id="b" data-a="a"></div>',
			{
				rule: { value: ['id'], options: { alphabetical: false } },
			},
			true,
		);
		// id first (matched), then data-z, data-a in source order
		expect(fixedCode).toBe('<div id="b" data-z="z" data-a="a"></div>');
	});
});

describe('fix with parsers', () => {
	test('fix: Vue', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<template><div style="x" class="a"></div></template>',
			{ parser: { '.*': '@markuplint/vue-parser' } },
			true,
		);
		expect(fixedCode).toBe('<template><div class="a" style="x"></div></template>');
	});

	test('fix: JSX', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div style="x" className="a"></div>',
			{ parser: { '.*': '@markuplint/jsx-parser' } },
			true,
		);
		expect(fixedCode).toBe('<div className="a" style="x"></div>');
	});
});

describe('name property matching', () => {
	test('object form { name: "id" } works like string "id"', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: [{ name: 'id' }, { name: 'class' }] },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'id',
				message: '"id" should be before "class"',
			},
		]);
	});

	test('no violation - { name } form correct order', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: [{ name: 'id' }, { name: 'class' }] },
		});
		expect(violations.length).toBe(0);
	});

	test('fix: { name } form', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div class="a" id="b"></div>',
			{ rule: { value: [{ name: 'id' }, { name: 'class' }] } },
			true,
		);
		expect(fixedCode).toBe('<div id="b" class="a"></div>');
	});
});

describe('spread group', () => {
	test('spread attributes placed after global group', async () => {
		const { violations } = await mlRuleTest(rule, '<div {...props} className="a"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: [{ group: 'global' }, { group: 'spread' }] },
		});
		// className is not a global attr in JSX context, but spread should be after global
		expect(violations.length).toBe(0);
	});

	test('violation - spread before named attrs', async () => {
		const { violations } = await mlRuleTest(rule, '<div {...props} id="a" className="b"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: ['id', 'className', { group: 'spread' }] },
		});
		expect(violations.length).toBe(1);
	});

	test('fix: spread to end - no-op when spread has no nameNode', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div {...props} id="a" className="b"></div>',
			{
				parser: { '.*': '@markuplint/jsx-parser' },
				rule: { value: ['id', 'className', { group: 'spread' }] },
			},
			true,
		);
		// Fix is a no-op because spread attributes lack standard tokens for range calculation
		expect(fixedCode).toBe('<div {...props} id="a" className="b"></div>');
	});

	test('spread group defaults to source-order', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" {...props} {...other}></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: ['id', { group: 'spread' }] },
		});
		// source-order is default for spread, so {...props} before {...other} is correct
		expect(violations.length).toBe(0);
	});
});

describe('invalid regex pattern', () => {
	test('invalid pattern does not crash', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: [{ pattern: '[invalid' }] },
		});
		// Invalid regex is skipped — attrs treated as unmatched, sorted alphabetically
		expect(violations.length).toBe(0);
	});
});

describe('fixed order array - unlisted attributes', () => {
	test('unlisted attributes within group fall back to alphabetical', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div aria-hidden="y" aria-describedby="x" aria-label="z"></div>',
			{
				rule: { value: [{ group: 'aria', order: ['aria-label'] }] },
			},
		);
		// aria-label (listed) should be first, then aria-describedby < aria-hidden alphabetically
		expect(violations.length).toBe(1);
	});

	test('fix: unlisted attributes within group sorted alphabetically', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div aria-hidden="y" aria-describedby="x" aria-label="z"></div>',
			{
				rule: { value: [{ group: 'aria', order: ['aria-label'] }] },
			},
			true,
		);
		expect(fixedCode).toBe('<div aria-label="z" aria-describedby="x" aria-hidden="y"></div>');
	});
});

describe('edge cases', () => {
	test('value: true with single element', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text" />');
		expect(violations.length).toBe(0);
	});

	test('mixed case attribute names', async () => {
		const { violations } = await mlRuleTest(rule, '<div Style="x" Class="a"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		// JSX: attribute names are case-sensitive
		// C < S alphabetically
		expect(violations.length).toBe(1);
	});

	test('empty value array treated as alphabetical', async () => {
		const { violations } = await mlRuleTest(rule, '<div style="x" class="a"></div>', { rule: { value: [] } });
		// empty value → alphabetical
		expect(violations.length).toBe(1);
	});

	test('empty value with alphabetical: false is a no-op', async () => {
		const { violations } = await mlRuleTest(rule, '<div style="x" class="a"></div>', {
			rule: { value: [], options: { alphabetical: false } },
		});
		// No sorting at all — no violation
		expect(violations.length).toBe(0);
	});

	test('multiple elements sorted independently', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div><span style="x" class="y"></span>');
		// div: class < id → OK. span: style > class → violation
		expect(violations.length).toBe(1);
	});

	test('severity error uses "must" in message', async () => {
		const { violations } = await mlRuleTest(rule, '<div style="x" class="a"></div>', {
			rule: { severity: 'error' },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 16,
				raw: 'class',
				message: '"class" must be before "style"',
			},
		]);
	});
});
