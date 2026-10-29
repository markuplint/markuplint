import { parser } from '@markuplint/html-parser';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { test, expect, vi } from 'vitest';

import { convertRuleset } from '../../index.js';
import { dummySchemas } from '../../test/index.js';
import { MLDocument } from '../node/document.js';
import type { MLElement } from '../node/element.js';
import type * as MLSpec from '@markuplint/ml-spec';

import { getAccname, getAccnameVisits } from './accname.js';
import { createNode } from './create-node.js';

vi.mock('@markuplint/ml-spec', async importOriginal => {
	const original = await importOriginal<typeof MLSpec>();
	return {
		...original,
		computeAccessibleName: () => {
			throw new TypeError('An environment that cannot run the computation');
		},
	};
});

function c(sourceCode: string) {
	const ast = parser.parse(sourceCode);
	const ruleset = convertRuleset({});
	const document = new MLDocument(ast, ruleset, dummySchemas(), { ariaVersion: ARIA_RECOMMENDED_VERSION });
	return createNode(ast.nodeList[0]!, document) as MLElement<any, any>;
}

test('a failed computation gives no name and reaches nothing', () => {
	const button = c('<button><span aria-hidden="true">x</span>Save</button>');
	expect([getAccname(button, '1.2'), getAccnameVisits(button, '1.2', false).size]).toStrictEqual(['', 0]);
});
