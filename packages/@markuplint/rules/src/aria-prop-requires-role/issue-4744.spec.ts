import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

/**
 * Vue renders a `<template v-if>` away, so the `menuitemradio` in a `group` in it has the `menu` above as the
 * parent that it requires, and its `aria-checked` is a property of its role, not a global one.
 */
const code =
	'<template><div role="menu"><template v-if="x"><div role="group"><button type="button" role="menuitemradio" aria-checked="true">g</button></div></template></div></template>';

test('[aria-prop-requires-role-issue-4744-001] the role of an element in a template that is rendered away is kept', async () => {
	const { violations } = await mlRuleTest(rule, code, {
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[aria-prop-requires-role-issue-4744-002] it is kept without @markuplint/vue-spec as well', async () => {
	const { violations } = await mlRuleTest(rule, code, { parser: { '.*': '@markuplint/vue-parser' } });
	expect(violations).toStrictEqual([]);
});
