import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-invalid-aria-prop-value-issue-4435-001] a literal in {…} that is not a value of the state is reported as the string is', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-busy={"not-a-value"}></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "not-a-value" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy={"not-a-value"}',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4435-002] the same value as a string is reported as before', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-busy="not-a-value"></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "not-a-value" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy="not-a-value"',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4435-003] a literal that is a value of the state is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<><div aria-busy={true}></div><div aria-busy={"true"}></div><div aria-busy={false}></div></>',
		{ parser: { '.*': '@markuplint/jsx-parser' } },
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-issue-4435-004] the shorthand of JSX is `true`', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-issue-4435-005] the empty string that is written is not the shorthand', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden=""></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "" is disallowed on the "aria-hidden" ARIA state',
			raw: 'aria-hidden=""',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4435-006] a literal of the empty string is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden={""}></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "" is disallowed on the "aria-hidden" ARIA state',
			raw: 'aria-hidden={""}',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4435-007] null and code that is not a literal are not judged', async () => {
	const { violations } = await mlRuleTest(rule, '<><div aria-busy={null}></div><div aria-busy={cond}></div></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-issue-4435-008] a number is judged as the string of it is', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const { violations } = await mlRuleTest(rule, '<div aria-busy={5}></div>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "5" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy={5}',
		},
	]);

	// Control: a number that the property accepts is not reported
	expect(
		(await mlRuleTest(rule, '<div role="slider" aria-valuenow={5}></div>', { parser })).violations,
	).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-issue-4435-009] a prop of a component is not rendered here', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<Btn aria-busy={"x"} />', { parser })).violations).toStrictEqual([]);

	// Control: the same attribute on an element is reported
	const { violations } = await mlRuleTest(rule, '<div aria-busy={"x"}></div>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "x" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy={"x"}',
		},
	]);
});
