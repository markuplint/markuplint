// @ts-nocheck

import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { recursiveBranch } from './recursive-branch';

function c(models: Parameters<typeof recursiveBranch>[0], innerHtml: string) {
	const el = createTestElement(`<div>${innerHtml}</div>`);
	return recursiveBranch(models, Array.from(el.childNodes), specs, { ignoreHasMutableChildren: true }, 0);
}

it('a', () => {
	expect(c('a', '<a></a>').type).toBe('MATCHED');
	expect(c('a', '<b></b>').type).toBe('UNMATCHED_SELECTORS');
	expect(c('a', '<c></c>').type).toBe('UNMATCHED_SELECTORS');
	expect(c('a', 'text').type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c('a', '').type).toBe('MISSING_NODE');
});

it('#flow', () => {
	expect(c('#flow', '<a></a>').type).toBe('MATCHED');
	expect(c('#flow', '<b></b>').type).toBe('MATCHED');
	expect(c('#flow', '<c></c>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#flow', 'text').type).toBe('MATCHED');
	expect(c('#flow', '').type).toBe('MATCHED_ZERO');
});

it('a, #flow', () => {
	expect(c(['a', '#flow'], '<a></a>').type).toBe('MATCHED');
	expect(c(['a', '#flow'], '<b></b>').type).toBe('MATCHED');
	expect(c(['a', '#flow'], '<c></c>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c(['a', '#flow'], 'text').type).toBe('MATCHED');
	expect(c(['a', '#flow'], '').type).toBe('MATCHED_ZERO');
});

it('c, #flow', () => {
	expect(c(['c', '#flow'], '<a></a>').type).toBe('MATCHED');
	expect(c(['c', '#flow'], '<b></b>').type).toBe('MATCHED');
	expect(c(['c', '#flow'], '<c></c>').type).toBe('MATCHED');
	expect(c(['c', '#flow'], 'text').type).toBe('MATCHED');
	expect(c(['c', '#flow'], '').type).toBe('MATCHED_ZERO');
});
