import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * An attribute that replaces the children of an element with markup that the template does not show is
 * declared by the spec of the framework (`DirectivePattern#isInnerHTML`): `v-html`, `x-html` and
 * `dangerouslySetInnerHTML`. Without the spec the attribute is a plain one.
 */

async function specs(name: 'vue-spec' | 'alpine-spec' | 'react-spec') {
	return schemaToSpec([
		htmlSpec as unknown as MLMLSpec,
		(await import(`@markuplint/${name}`)).default as ExtendedSpec,
	]);
}

function innerHTML(
	el: { readonly attributes: readonly { readonly name: string; readonly isInnerHTML?: true }[] } | null,
) {
	return [...(el?.attributes ?? [])].map(a => ({ name: a.name, isInnerHTML: a.isInnerHTML }));
}

describe('MLAttr#isInnerHTML', () => {
	test('v-html of Vue is, and the other directives are not', async () => {
		const document = createTestDocument('<template><p v-html="h" v-text="t" v-show="s"></p></template>', {
			parser: (await import('@markuplint/vue-parser')).parser,
			specs: await specs('vue-spec'),
		});
		expect(innerHTML(document.querySelector('p'))).toStrictEqual([
			{ name: 'v-html', isInnerHTML: true },
			{ name: 'v-text', isInnerHTML: undefined },
			{ name: 'v-show', isInnerHTML: undefined },
		]);
	});

	test('x-html of Alpine.js is, and x-text is not', async () => {
		const document = createTestDocument('<p x-html="h" x-text="t"></p>', {
			parser: (await import('@markuplint/alpine-parser')).parser,
			specs: await specs('alpine-spec'),
		});
		expect(innerHTML(document.querySelector('p'))).toStrictEqual([
			{ name: 'x-html', isInnerHTML: true },
			{ name: 'x-text', isInnerHTML: undefined },
		]);
	});

	test('dangerouslySetInnerHTML of React is, and a name that differs in case is not', async () => {
		const document = createTestDocument(
			'<p dangerouslySetInnerHTML={{ __html: h }} dangerouslysetinnerhtml="x"></p>',
			{
				parser: (await import('@markuplint/jsx-parser')).parser,
				specs: await specs('react-spec'),
			},
		);
		expect(innerHTML(document.querySelector('p')).map(a => a.isInnerHTML)).toStrictEqual([true, undefined]);
	});

	test('v-html is a plain attribute where the spec of Vue is not given', async () => {
		const document = createTestDocument('<template><p v-html="h"></p></template>', {
			parser: (await import('@markuplint/vue-parser')).parser,
		});
		expect(innerHTML(document.querySelector('p'))).toStrictEqual([{ name: 'v-html', isInnerHTML: undefined }]);
	});
});
