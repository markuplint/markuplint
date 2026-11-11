import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const pretendedHost = { pretenders: [{ selector: 'x-btn', as: { element: 'div', inheritAttrs: true } }] };

test('[require-accessible-name-issue-4527-001] a pretended host takes its name from its declarative shadow root', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<x-btn role="button"><template shadowrootmode="open">Save</template></x-btn>',
		pretendedHost,
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4527-002] a pretended host whose shadow root has no text has no name', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<x-btn role="button"><template shadowrootmode="open"></template>Save</x-btn>',
		pretendedHost,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require accessible name',
			raw: '<x-btn role="button">',
		},
	]);
});

test('[require-accessible-name-issue-4527-003] what the component renders of its own is not rendered under a shadow root, unknown or not', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<x-btn role="button"><template shadowrootmode="open"></template></x-btn>',
		{
			pretenders: [
				{ selector: 'x-btn', as: { element: 'div', inheritAttrs: true, contents: [{ dynamic: true }] } },
			],
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require accessible name',
			raw: '<x-btn role="button">',
		},
	]);
});

test('[require-accessible-name-issue-4527-004] a template given to a component that drops its children is not rendered', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<Btn role="button"><template shadowrootmode="open">Save</template></Btn>',
		{
			parser: { '.*': '@markuplint/svelte-parser' },
			pretenders: [{ selector: 'Btn', as: { element: 'div', inheritAttrs: true, slots: null } }],
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require accessible name',
			raw: '<Btn role="button">',
		},
	]);
});

test('[require-accessible-name-issue-4527-005] a template given to a component that renders its children in itself names it', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<Btn role="button"><template shadowrootmode="open">Save</template></Btn>',
		{
			parser: { '.*': '@markuplint/svelte-parser' },
			pretenders: [{ selector: 'Btn', as: { element: 'div', inheritAttrs: true } }],
		},
	);
	expect(violations).toStrictEqual([]);
});
