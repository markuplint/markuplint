import type { MLCoreParams } from './ml-core.js';
import type { Pretender } from '@markuplint/ml-config';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from './convert-ruleset.js';
import { MLCore } from './ml-core.js';

function createCore(sourceCode: string, pretenders: readonly Pretender[]) {
	const params: MLCoreParams = {
		parser,
		sourceCode,
		ruleset: convertRuleset({}),
		rules: [],
		locale: { locale: 'en' },
		schemas: [spec as unknown as MLMLSpec, {}],
		ruleCommonSettings: {},
		parserOptions: {},
		severity: {},
		pretenders,
		filename: 'test.html',
	};
	return new MLCore(params);
}

function pretendedLocalName(core: MLCore) {
	const document = core.document;
	if (document instanceof Error) {
		throw document;
	}
	const el = document.nodeList[0];
	if (!el?.is(el.ELEMENT_NODE)) {
		throw new TypeError('Expected the first node to be an element');
	}
	return el.pretenderContext?.type === 'pretender' ? el.pretenderContext.as.localName : null;
}

describe('MLCore#update', () => {
	test('re-creates the document with the updated pretenders, not the construction-time ones', () => {
		const core = createCore('<custom-el></custom-el>', [{ selector: 'custom-el', as: 'div' }]);
		expect(pretendedLocalName(core)).toBe('div');

		core.update({ pretenders: [{ selector: 'custom-el', as: 'span' }] });

		expect(pretendedLocalName(core)).toBe('span');
	});

	test('keeps the construction-time pretenders when update() is called without any', () => {
		const core = createCore('<custom-el></custom-el>', [{ selector: 'custom-el', as: 'div' }]);

		core.update({});

		expect(pretendedLocalName(core)).toBe('div');
	});
});
