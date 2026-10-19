import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('alphabetical order (value: true)', () => {
	test('[attr-order-valid-001] no violation - already sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b" style="c"></div>');
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-001] violation - not sorted', async () => {
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

	test('[attr-order-valid-002] no violation - single attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a"></div>');
		expect(violations.length).toBe(0);
	});

	test('[attr-order-valid-003] no violation - no attributes', async () => {
		const { violations } = await mlRuleTest(rule, '<div></div>');
		expect(violations.length).toBe(0);
	});

	test('[attr-order-valid-004] no violation - boolean attributes sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<input disabled readonly />');
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-002] violation - boolean attributes not sorted', async () => {
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
	test('[attr-order-valid-005] no violation - matches priority order', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" class="b" style="c"></div>', {
			rule: { value: ['id', 'class', 'style'] },
		});
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-003] violation - class before id', async () => {
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

	test('[attr-order-invalid-004] unmatched attributes go to the end alphabetically', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" data-z="z" class="b" data-a="a"></div>', {
			rule: { value: ['id', 'class'] },
		});
		expect(violations.length).toBe(1);
	});

	test('[attr-order-invalid-005] unmatched attributes preserve source order when alphabetical: false', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" data-z="z" class="b" data-a="a"></div>', {
			rule: { value: ['id', 'class'], options: { alphabetical: false } },
		});
		// id → class → data-z → data-a (source order for unmatched)
		expect(violations.length).toBe(1);
	});
});

describe('group matching', () => {
	test('[attr-order-invalid-006] global group - class and id should precede data-x', async () => {
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

	test('[attr-order-invalid-007] global → aria order', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label="x" class="a"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'aria' }] },
		});
		expect(violations.length).toBe(1);
	});

	test('[attr-order-valid-006] no violation - global → aria → data correct order', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b" aria-label="x" data-x="1"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'aria' }, { group: 'data' }] },
		});
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-008] event group', async () => {
		const { violations } = await mlRuleTest(rule, '<div onclick="x" class="a"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'event' }] },
		});
		expect(violations.length).toBe(1);
	});

	test('[attr-order-invalid-009] data group', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-a="1" class="a"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'data' }] },
		});
		expect(violations.length).toBe(1);
	});
});

describe('role group', () => {
	test('[attr-order-invalid-021] role group - role should be before aria group', async () => {
		const { violations } = await mlRuleTest(rule, '<ul aria-label="x" role="radiogroup"></ul>', {
			rule: { value: [{ group: 'global' }, { group: 'role' }, { group: 'aria' }] },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 20,
				raw: 'role',
				message: '"role" should be before "aria-label"',
			},
		]);
	});

	test('[attr-order-valid-019] no violation - role before aria matches configured order', async () => {
		const { violations } = await mlRuleTest(rule, '<ul role="radiogroup" aria-label="x"></ul>', {
			rule: { value: [{ group: 'global' }, { group: 'role' }, { group: 'aria' }] },
		});
		expect(violations.length).toBe(0);
	});

	test('[attr-order-valid-020] no violation - aria before role matches configured order', async () => {
		const { violations } = await mlRuleTest(rule, '<ul aria-label="x" role="radiogroup"></ul>', {
			rule: { value: [{ group: 'aria' }, { group: 'role' }] },
		});
		expect(violations.length).toBe(0);
	});

	test('[attr-order-valid-021] role group does not match aria-* attributes with similar names', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-roledescription="x" role="y"></div>', {
			rule: { value: [{ group: 'aria' }, { group: 'role' }] },
		});
		// "aria-roledescription" must stay matched by the aria group (entry 0), not "role" (entry 1)
		expect(violations.length).toBe(0);
	});

	test('[attr-order-fix-013] fix: role group placed before aria group', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<ul aria-label="x" role="radiogroup"></ul>',
			{ rule: { value: [{ group: 'role' }, { group: 'aria' }] } },
			true,
		);
		expect(fixedCode).toBe('<ul role="radiogroup" aria-label="x"></ul>');
	});

	test('[attr-order-issue-4033-001] role placed before aria-* via an explicit role group', async () => {
		const { violations } = await mlRuleTest(rule, '<ul role="radiogroup" aria-label="XXX"></ul>', {
			rule: {
				value: [
					{ group: 'global', order: 'source-order' },
					{ group: 'role', order: 'source-order' },
					{ group: 'aria', order: 'source-order' },
				],
			},
		});
		expect(violations.length).toBe(0);
	});
});

describe('pattern matching', () => {
	test('[attr-order-invalid-010] data- pattern first', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" data-x="1"></div>', {
			rule: { value: [{ pattern: '^data-' }] },
		});
		// data-x matches pattern → should be first
		expect(violations.length).toBe(1);
	});

	test('[attr-order-valid-007] no violation - data- pattern first, already sorted', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-x="1" class="a"></div>', {
			rule: { value: [{ pattern: '^data-' }] },
		});
		expect(violations.length).toBe(0);
	});
});

describe('conflict resolution (first-match-wins)', () => {
	test('[attr-order-valid-008] explicit name vs global group - explicit wins', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: ['id', { group: 'global' }] },
		});
		// id matches "id" (entry 0), class matches global (entry 1)
		// id → class is correct order
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-011] explicit name vs global group - id should come before class', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: ['id', { group: 'global' }] },
		});
		// class → global (entry 1), id → "id" (entry 0)
		// Expected: id, class → violation
		expect(violations.length).toBe(1);
	});

	test('[attr-order-valid-009] overlapping patterns - first pattern wins', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-bar="2" data-foo="1" class="a"></div>', {
			rule: { value: [{ pattern: '^d' }, { pattern: '^data-' }] },
		});
		// Both data-bar and data-foo match first pattern "^d"
		// Within group: alphabetical → data-bar, data-foo (already correct)
		// class is unmatched → goes to end
		expect(violations.length).toBe(0);
	});

	test('[attr-order-valid-010] aria pattern vs aria group - first match wins', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label="x" aria-hidden="y"></div>', {
			rule: { value: [{ pattern: '^aria-label' }, { group: 'aria' }] },
		});
		// aria-label → pattern (entry 0), aria-hidden → aria group (entry 1)
		// aria-label, aria-hidden is correct order
		expect(violations.length).toBe(0);
	});
});

describe('group-internal order', () => {
	test('[attr-order-invalid-012] alphabetical order within group (default)', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: [{ group: 'global', order: 'alphabetical' }] },
		});
		// class < id alphabetically
		expect(violations.length).toBe(1);
	});

	test('[attr-order-valid-011] source-order within group', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: [{ group: 'global', order: 'source-order' }] },
		});
		// source order is maintained → no violation
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-013] fixed order array within group', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-describedby="x" aria-label="y"></div>', {
			rule: { value: [{ group: 'aria', order: ['aria-label', 'aria-describedby'] }] },
		});
		// aria-label should be first
		expect(violations.length).toBe(1);
	});

	test('[attr-order-valid-012] no violation - fixed order array correct', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label="y" aria-describedby="x"></div>', {
			rule: { value: [{ group: 'aria', order: ['aria-label', 'aria-describedby'] }] },
		});
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('[attr-order-fix-001] fix: alphabetical sort', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div style="x" class="a"></div>', undefined, true);
		expect(fixedCode).toBe('<div class="a" style="x"></div>');
	});

	test('[attr-order-fix-002] fix: three attributes alphabetical', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div style="x" class="a" id="b"></div>', undefined, true);
		expect(fixedCode).toBe('<div class="a" id="b" style="x"></div>');
	});

	test('[attr-order-fix-003] fix: priority list', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div class="a" id="b"></div>',
			{ rule: { value: ['id', 'class'] } },
			true,
		);
		expect(fixedCode).toBe('<div id="b" class="a"></div>');
	});

	test('[attr-order-fix-004] fix: multiline attributes preserve spacing', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div\n  style="x"\n  class="a"\n></div>', undefined, true);
		expect(fixedCode).toBe('<div\n  class="a"\n  style="x"\n></div>');
	});

	test('[attr-order-fix-005] fix: boolean attributes', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<input readonly disabled />', undefined, true);
		expect(fixedCode).toBe('<input disabled readonly />');
	});

	test('[attr-order-fix-006] fix: group order', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div data-x="1" class="a" id="b"></div>',
			{ rule: { value: [{ group: 'global' }, { group: 'data' }] } },
			true,
		);
		expect(fixedCode).toBe('<div class="a" id="b" data-x="1"></div>');
	});

	test('[attr-order-fix-007] fix: options.alphabetical false - unmatched preserve source order', async () => {
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
	test('[attr-order-fix-008] fix: Vue', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<template><div style="x" class="a"></div></template>',
			{ parser: { '.*': '@markuplint/vue-parser' } },
			true,
		);
		expect(fixedCode).toBe('<template><div class="a" style="x"></div></template>');
	});

	test('[attr-order-fix-009] fix: JSX', async () => {
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
	test('[attr-order-invalid-014] object form { name: "id" } works like string "id"', async () => {
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

	test('[attr-order-valid-013] no violation - { name } form correct order', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="b" class="a"></div>', {
			rule: { value: [{ name: 'id' }, { name: 'class' }] },
		});
		expect(violations.length).toBe(0);
	});

	test('[attr-order-fix-010] fix: { name } form', async () => {
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
	test('[attr-order-valid-014] spread attributes placed after global group', async () => {
		const { violations } = await mlRuleTest(rule, '<div {...props} className="a"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: [{ group: 'global' }, { group: 'spread' }] },
		});
		// className is not a global attr in JSX context, but spread should be after global
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-015] violation - spread before named attrs', async () => {
		const { violations } = await mlRuleTest(rule, '<div {...props} id="a" className="b"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: ['id', 'className', { group: 'spread' }] },
		});
		expect(violations.length).toBe(1);
	});

	test('[attr-order-fix-011] fix: spread to end - no-op when spread has no nameNode', async () => {
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

	test('[attr-order-valid-015] spread group defaults to source-order', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a" {...props} {...other}></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: ['id', { group: 'spread' }] },
		});
		// source-order is default for spread, so {...props} before {...other} is correct
		expect(violations.length).toBe(0);
	});
});

describe('invalid regex pattern', () => {
	test('[attr-order-valid-016] invalid pattern does not crash', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: [{ pattern: '[invalid' }] },
		});
		// Invalid regex is skipped — attrs treated as unmatched, sorted alphabetically
		expect(violations.length).toBe(0);
	});
});

describe('fixed order array - unlisted attributes', () => {
	test('[attr-order-invalid-016] unlisted attributes within group fall back to alphabetical', async () => {
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

	test('[attr-order-fix-012] fix: unlisted attributes within group sorted alphabetically', async () => {
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
	test('[attr-order-valid-017] value: true with single element', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text" />');
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-017] mixed case attribute names', async () => {
		const { violations } = await mlRuleTest(rule, '<div Style="x" Class="a"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		// JSX: attribute names are case-sensitive
		// C < S alphabetically
		expect(violations.length).toBe(1);
	});

	test('[attr-order-invalid-018] empty value array treated as alphabetical', async () => {
		const { violations } = await mlRuleTest(rule, '<div style="x" class="a"></div>', { rule: { value: [] } });
		// empty value → alphabetical
		expect(violations.length).toBe(1);
	});

	test('[attr-order-valid-018] empty value with alphabetical: false is a no-op', async () => {
		const { violations } = await mlRuleTest(rule, '<div style="x" class="a"></div>', {
			rule: { value: [], options: { alphabetical: false } },
		});
		// No sorting at all — no violation
		expect(violations.length).toBe(0);
	});

	test('[attr-order-invalid-019] multiple elements sorted independently', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="a" id="b"></div><span style="x" class="y"></span>');
		// div: class < id → OK. span: style > class → violation
		expect(violations.length).toBe(1);
	});

	test('[attr-order-invalid-020] severity error uses "must" in message', async () => {
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

describe('attribute name case (issue #4309)', () => {
	test('[attr-order-issue-4309-001] HTML: alphabetical order compares the names as the DOM gives them', async () => {
		// `class` < `id` by key, though `I` sorts before `c` as written
		const { violations } = await mlRuleTest(rule, '<div class="b" ID="a"></div>');
		expect(violations).toStrictEqual([]);
		const reversed = await mlRuleTest(rule, '<div ID="a" class="b"></div>');
		expect(reversed.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 13,
				raw: 'class',
				message: '"class" should be before "ID"',
			},
		]);
		const control = await mlRuleTest(rule, '<div style="a" CLASS="b"></div>');
		expect(control.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'CLASS',
				message: '"CLASS" should be before "style"',
			},
		]);
	});

	test('[attr-order-issue-4309-002] HTML: upper-case names belong to the predefined groups', async () => {
		const { violations } = await mlRuleTest(rule, '<div ARIA-LABEL="x" ID="a"></div>', {
			rule: { value: [{ group: 'global' }, { group: 'aria' }] },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 21,
				raw: 'ID',
				message: '"ID" should be before "ARIA-LABEL"',
			},
		]);
	});

	test('[attr-order-issue-4309-003] HTML: upper-case names belong to the event, role and data groups', async () => {
		const { violations } = await mlRuleTest(rule, '<div DATA-X="1" ROLE="button" ONCLICK="f()"></div>', {
			rule: { value: [{ group: 'event' }, { group: 'role' }, { group: 'data' }] },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 31,
				raw: 'ONCLICK',
				message: '"ONCLICK" should be before "DATA-X"',
			},
		]);
	});

	test('[attr-order-issue-4309-004] HTML: a name entry matches in either spelling, on either side', async () => {
		const sourceUpper = await mlRuleTest(rule, '<div CLASS="a" ID="b"></div>', {
			rule: { value: ['id', { name: 'class' }] },
		});
		expect(sourceUpper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'ID',
				message: '"ID" should be before "CLASS"',
			},
		]);
		const configUpper = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: ['ID', { name: 'CLASS' }] },
		});
		expect(configUpper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'id',
				message: '"id" should be before "class"',
			},
		]);
	});

	test('[attr-order-issue-4309-005] HTML: an order array matches in either spelling, on either side', async () => {
		const sourceUpper = await mlRuleTest(rule, '<div CLASS="a" ID="b"></div>', {
			rule: { value: [{ group: 'global', order: ['id', 'class'] }] },
		});
		expect(sourceUpper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'ID',
				message: '"ID" should be before "CLASS"',
			},
		]);
		const configUpper = await mlRuleTest(rule, '<div class="a" id="b"></div>', {
			rule: { value: [{ group: 'global', order: ['ID', 'CLASS'] }] },
		});
		expect(configUpper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'id',
				message: '"id" should be before "class"',
			},
		]);
	});

	test('[attr-order-issue-4309-006] HTML: names with equal keys keep their source order', async () => {
		const plain = await mlRuleTest(rule, '<div id="a" ID="b"></div>');
		expect(plain.violations).toStrictEqual([]);
		const grouped = await mlRuleTest(rule, '<div A-FOO="c" ID="a" id="b"></div>', {
			rule: { value: [{ group: 'global' }] },
		});
		expect(grouped.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'ID',
				message: '"ID" should be before "A-FOO"',
			},
		]);
	});

	test('[attr-order-issue-4309-007] HTML: a pattern entry matches the name as written', async () => {
		const exact = await mlRuleTest(rule, '<div ID="a" class="b"></div>', {
			rule: { value: [{ pattern: '^id$' }, { pattern: '^class$' }] },
		});
		expect(exact.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 13,
				raw: 'class',
				message: '"class" should be before "ID"',
			},
		]);
		const both = await mlRuleTest(rule, '<div CLASS="a" ID="b"></div>', {
			rule: { value: [{ pattern: '^[Ii][Dd]$' }, { pattern: '^[Cc][Ll][Aa][Ss][Ss]$' }] },
		});
		expect(both.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'ID',
				message: '"ID" should be before "CLASS"',
			},
		]);
	});

	test('[attr-order-issue-4309-008] HTML: fix keeps the spelling of the names', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div ARIA-LABEL="x" ID="a"></div>',
			{
				rule: { value: [{ group: 'global' }, { group: 'aria' }] },
			},
			true,
		);
		expect(fixedCode).toBe('<div ID="a" ARIA-LABEL="x"></div>');
	});

	test('[attr-order-issue-4309-009] JSX: an HTML element folds the names', async () => {
		const folded = await mlRuleTest(rule, '<div className="a" ID="b"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(folded.violations).toStrictEqual([]);
		const control = await mlRuleTest(rule, '<div ID="a" className="b"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(control.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 13,
				raw: 'className',
				message: '"className" should be before "ID"',
			},
		]);
		const group = await mlRuleTest(rule, '<div DATA-X="1" ROLE="button"></div>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: [{ group: 'role' }, { group: 'data' }] },
		});
		expect(group.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 17,
				raw: 'ROLE',
				message: '"ROLE" should be before "DATA-X"',
			},
		]);
	});

	test('[attr-order-issue-4309-010] JSX: an SVG element keeps the names as written', async () => {
		const exact = await mlRuleTest(rule, '<svg id="a" ID="b"></svg>', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(exact.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 13,
				raw: 'ID',
				message: '"ID" should be before "id"',
			},
		]);
		const html = await mlRuleTest(rule, '<svg id="a" ID="b"></svg>');
		expect(html.violations).toStrictEqual([]);
	});

	test('[attr-order-issue-4309-011] Vue: the props of a component belong to the groups as written', async () => {
		const options = {
			parser: { '.*': '@markuplint/vue-parser' },
			rule: { value: [{ group: 'data' }, { group: 'aria' }, { group: 'global' }] },
		};
		const { violations } = await mlRuleTest(
			rule,
			'<template><MyComp id="a" aria-label="b" data-x="1" /></template>',
			options,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 41,
				raw: 'data-x',
				message: '"data-x" should be before "id"',
			},
		]);
	});
});
