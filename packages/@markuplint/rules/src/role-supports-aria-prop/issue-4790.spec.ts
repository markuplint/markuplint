import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * A landmark whose `aria-labelledby` refers to an id that nothing in the file has falls back to `generic`.
 * An element with spread attributes, a component that no pretender resolved and content that is not known
 * may be the element that has the id.
 */
describe('an id that the markup does not tell', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

	test('[role-supports-aria-prop-issue-4790-001] a landmark that refers to an id that an unknown element may have has the role', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<>
	<h2 {...props}>spread</h2>
	<div role="region" aria-labelledby="spread-id">a</div>
	<Header />
	<div role="region" aria-labelledby="in-component">b</div>
	<Dyn />
	<div role="region" aria-labelledby="in-dyn">c</div>
</>`,
			{
				...jsx,
				pretenders: [{ selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true }] } }],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['a spread', '<><h2 {...props}>t</h2><div role="region" aria-labelledby="t">a</div></>'],
		['a spread after the id', '<><h2 id="x" {...props}>t</h2><div role="region" aria-labelledby="t">a</div></>'],
		[
			'an id that code gives after a static one',
			'<><h2 id="x" id={y}>t</h2><div role="region" aria-labelledby="t">a</div></>',
		],
		['a component', '<><Header /><div role="region" aria-labelledby="t">a</div></>'],
		['a pretender with unknown contents', '<><Dyn /><div role="region" aria-labelledby="t">a</div></>'],
		['a block of children', '<><div>{children}</div><div role="region" aria-labelledby="t">a</div></>'],
	])('[role-supports-aria-prop-issue-4790-002] %s may have the id', async (_, source) => {
		const dyn = { selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true as const }] } };
		expect((await mlRuleTest(rule, source, { ...jsx, pretenders: [dyn] })).violations).toStrictEqual([]);
	});

	test('[role-supports-aria-prop-issue-4790-003] a tree whose ids the markup tells does not have it: the landmark falls back to generic', async () => {
		// A spread before the id is overridden by it
		const { violations } = await mlRuleTest(
			rule,
			'<><h2 {...props} id="h">t</h2><div role="region" aria-labelledby="t">a</div></>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 50,
				message: 'The "aria-labelledby" ARIA property is disallowed on the "generic" role',
				raw: 'aria-labelledby="t"',
			},
		]);
	});
});
