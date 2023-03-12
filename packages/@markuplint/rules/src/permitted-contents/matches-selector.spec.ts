// @ts-nocheck

import type { TransparentModel } from './types';

import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { matchesSelector } from './matches-selector';

function c(model: string, innerHtml: string, tp?: string) {
	const el = createTestElement(`<div>${innerHtml}</div>`, { specs });
	const child = Array.from(el.childNodes)[0];
	if (tp) {
		// @ts-ignore
		child.__transparentModel = {
			el,
			additionalCondition: tp,
		} as TransparentModel;
	}
	return matchesSelector(model, child, specs, { ignoreHasMutableChildren: true }, 0);
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

it(':model(flow)', () => {
	expect(c(':model(flow)', '<a></a>').type).toBe('MATCHED');
	expect(c(':model(flow)', '<b></b>').type).toBe('MATCHED');
	expect(c(':model(flow)', '<c></c>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c(':model(flow)', 'text').type).toBe('MATCHED');
	expect(c(':model(flow)', '').type).toBe('MATCHED_ZERO');
});

it('#text', () => {
	expect(c('#text', '<a></a>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#text', '<b></b>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#text', '<c></c>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#text', 'text').type).toBe('MATCHED');
	expect(c('#text', '').type).toBe('MATCHED_ZERO');
});

// it(':model(flow):not(:model(interactive))', () => {
// 	expect(c(':model(flow)', '<a></a>', ':not(:model(interactive))').type).toBe('MATCHED');
// 	expect(c(':model(flow)', '<b></b>', ':not(:model(interactive))').type).toBe('MATCHED');
// 	expect(c(':model(flow)', '<c></c>', ':not(:model(interactive))').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
// 	expect(c(':model(flow)', 'text', ':not(:model(interactive))').type).toBe('MATCHED');
// 	expect(c(':model(flow)', '<button></button>', ':not(:model(interactive))').type).toBe(
// 		'TRANSPARENT_MODEL_DISALLOWS',
// 	);
// });
