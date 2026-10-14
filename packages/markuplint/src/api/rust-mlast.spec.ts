import type { MLASTElement, MLASTHTMLAttr } from '@markuplint/ml-ast';
import type { ExtendedSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import { describe, expect, test } from 'vitest';

import { mlastForRust } from './rust-mlast.js';

const html = (code: string) => parser.parse(code);

/** The patterns of `@markuplint/vue-spec` that the cases below use, in its order. */
const vueSpec: ExtendedSpec = {
	directivePatterns: [
		{ pattern: '^(?:v-bind:|:)([^.]+)\\..+$', isDirective: true, isDynamicValue: true },
		{ pattern: '^(?:v-bind:|:|v-on:|@)\\[', isDirective: true, isDynamicValue: true },
		{
			pattern: '^(?:v-bind:|:)([^.]+)$',
			potentialName: '$1',
			isDynamicValue: true,
			isDuplicatable: ['class', 'style'],
		},
		{ pattern: '^(?:v-on:|@)([^.]+)(?:\\..+)?$', potentialName: 'on$1', isDirective: true, isDynamicValue: true },
		{ pattern: '^v-', isDirective: true, isDynamicValue: true },
	],
};

/** The `MLASTHTMLAttr`s of the first element of `json`, by the name as written. */
const attrsOf = (json: string) => {
	const { nodeList } = JSON.parse(json) as { nodeList: MLASTElement[] };
	const el = nodeList.find(node => node.type === 'starttag')!;
	return Object.fromEntries((el.attributes as MLASTHTMLAttr[]).map(attr => [attr.name.raw, attr]));
};

describe('mlastForRust', () => {
	test('[rust-mlast-directive-001] resolves the directives of the spec as the TypeScript attribute does', () => {
		const attrs = attrsOf(
			mlastForRust(html('<a :href="url" v-if="show" @click="go" :[name]="x" class="a" :class="b"></a>'), {
				spec: vueSpec,
				parser: {},
			}),
		);

		expect(attrs[':href']).toMatchObject({ potentialName: 'href', isDynamicValue: true });
		expect(attrs['v-if']).toMatchObject({ potentialName: 'v-if', isDirective: true, isDynamicValue: true });
		expect(attrs['@click']).toMatchObject({ potentialName: 'onclick', isDirective: true, isDynamicValue: true });
		expect(attrs[':[name]']).toMatchObject({ isDirective: true, isDynamicValue: true });
		expect(attrs[':class']).toMatchObject({ potentialName: 'class', isDuplicatable: true });
		expect(attrs.class).toMatchObject({ potentialName: 'class' });
	});

	test('[rust-mlast-directive-002] gives an attribute no pattern matches the name it was written with', () => {
		const attrs = attrsOf(mlastForRust(html('<a HREF="x" data-Foo></a>'), { spec: vueSpec, parser: {} }));

		expect(attrs.HREF).toMatchObject({ potentialName: 'HREF' });
		expect(attrs['data-Foo']).toMatchObject({ potentialName: 'data-Foo' });
		expect(attrs.HREF).not.toHaveProperty('isDirective', true);
	});

	test('[rust-mlast-directive-003] keeps the name a parser resolved', () => {
		const ast = html('<a :href="url"></a>');
		const el = ast.nodeList.find(node => node.type === 'starttag')!;
		Object.assign(el.attributes[0]!, { potentialName: 'by-the-parser' });

		const attrs = attrsOf(mlastForRust(ast, { spec: vueSpec, parser: {} }));

		expect(attrs[':href']).toMatchObject({ potentialName: 'by-the-parser' });
		expect(attrs[':href']).not.toHaveProperty('isDynamicValue', true);
	});

	test('[rust-mlast-directive-004] resolves the attributes of nested elements', () => {
		const { nodeList } = JSON.parse(
			mlastForRust(html('<div><p><a :href="url"></a></p></div>'), { spec: vueSpec, parser: {} }),
		) as { nodeList: MLASTElement[] };
		const div = nodeList.find(node => node.type === 'starttag')!;
		const p = div.childNodes[0] as MLASTElement;
		const a = p.childNodes[0] as MLASTElement;

		expect(a.attributes[0]).toMatchObject({ potentialName: 'href', isDynamicValue: true });
	});

	test('[rust-mlast-idl-001] maps the IDL name to the content attribute as the spec asks (`idl`: React)', () => {
		const spec: ExtendedSpec = { acceptedAttrNames: 'idl' };
		const attrs = attrsOf(
			mlastForRust(html('<div tabIndex="0" class="a" htmlfor="b"></div>'), { spec, parser: {} }),
		);

		expect(attrs.tabIndex).toMatchObject({ potentialName: 'tabindex' });
		// `class` is the content name; the IDL name `className` is what the spec accepts.
		expect(attrs.class).toMatchObject({ potentialName: 'class', candidate: 'className' });
	});

	test('[rust-mlast-idl-002] leaves the names alone without `acceptedAttrNames`', () => {
		const attrs = attrsOf(mlastForRust(html('<div tabIndex="0" class="a"></div>'), { spec: {}, parser: {} }));

		expect(attrs.tabIndex).toMatchObject({ potentialName: 'tabIndex' });
		expect(attrs.class).not.toHaveProperty('candidate');
	});

	test('[rust-mlast-settings-001] sends what the document takes from the parser next to the nodes', () => {
		const json = JSON.parse(
			mlastForRust(html('<div></div>'), {
				spec: {},
				parser: { endTag: 'xml', booleanish: true, tagNameCaseSensitive: true },
			}),
		) as Record<string, unknown>;

		expect(json).toMatchObject({ endTag: 'xml', booleanish: true, tagNameCaseSensitive: true });
	});

	test('[rust-mlast-settings-002] leaves out what the parser does not say', () => {
		const json = JSON.parse(mlastForRust(html('<div></div>'), { spec: {}, parser: {} })) as Record<string, unknown>;

		expect(json).not.toHaveProperty('endTag');
		expect(json).not.toHaveProperty('booleanish');
		expect(json).not.toHaveProperty('tagNameCaseSensitive');
	});
});
