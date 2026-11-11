import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * A component that no pretender resolved renders something that is not known: it may render
 * the text that is a valid date and time.
 */
describe('A component that no pretender resolved', () => {
	const jsx = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('[require-datetime-issue-4572-001] the component in time may render the date and time', async () => {
		expect((await mlRuleTest(rule, '<time><FormattedDate /></time>', jsx)).violations).toStrictEqual([]);
	});

	test('[require-datetime-issue-4572-002] a component in a descendant of time may render the date and time', async () => {
		expect((await mlRuleTest(rule, '<time><b><FormattedDate /></b></time>', jsx)).violations).toStrictEqual([]);
	});

	test('[require-datetime-issue-4572-003] a component that a pretender resolved is the element that it renders', async () => {
		const { violations } = await mlRuleTest(rule, '<time><FormattedDate /></time>', {
			...jsx,
			pretenders: [{ selector: 'FormattedDate', as: 'span' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<time>',
				message: 'Need the "datetime" attribute',
			},
		]);
	});

	test('[require-datetime-issue-4572-004] text beside a component may be completed by it', async () => {
		expect((await mlRuleTest(rule, '<time>2026<FormattedDate /></time>', jsx)).violations).toStrictEqual([]);
	});

	test('[require-datetime-issue-4572-005] a component inside an element that a pretender resolved is not known either', async () => {
		const { violations } = await mlRuleTest(rule, '<time><span><FormattedDate /></span></time>', {
			...jsx,
			pretenders: [{ selector: 'span', as: 'span' }],
		});
		expect(violations).toStrictEqual([]);
	});
});
