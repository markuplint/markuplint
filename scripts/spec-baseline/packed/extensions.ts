/**
 * The extended specs that the composition is measured and checked with: those of the frameworks, which are what a
 * project that has a `specs` setting uses, and one that has the kinds of change that a user's file has. Both languages compose these,
 * and the bytes that they make are compared.
 *
 * @module
 */
import type { ExtensionLike } from './compose.ts';

import alpine from '@markuplint/alpine-spec';
import htmx from '@markuplint/htmx-spec';
import react from '@markuplint/react-spec';
import svelte from '@markuplint/svelte-spec';
import vue from '@markuplint/vue-spec';

/** An extension of a user: one more attribute and element, a category member, roles, and the rest. */
export const USER = {
	def: {
		'#globalAttrs': { '#extends': { 'x-user-attr': { type: 'Any', experimental: true } } },
		'#aria': {
			'1.1': {
				roles: [{ name: 'user-role-11', generalization: [] }],
				props: [],
				graphicsRoles: [],
				dpubRoles: [],
			},
			'1.2': {
				roles: [{ name: 'user-role-12', generalization: [] }],
				props: [],
				graphicsRoles: [],
				dpubRoles: [],
			},
			'1.3': {
				roles: [{ name: 'user-role', generalization: ['widget'] }],
				props: [],
				graphicsRoles: [],
				dpubRoles: [],
			},
		},
		'#contentModels': { '#flow': ['my-element'], '#my-category': ['div', 'span'] },
	},
	specs: [
		{ name: 'div', attributes: { 'x-div-attr': { type: 'Boolean' } }, globalAttrs: { '#ARIAAttrs': false } },
		{ name: 'not-in-the-base', attributes: {} },
	],
	directivePatterns: [{ attrName: '^v-', prefix: 'v-', type: 'prefix' }],
	movedToHead: ['my-head-element'],
	acceptedAttrNames: ['(user)'],
	templateContent: false,
	literalValues: { attrs: { class: { 日: 'x' } } },
} as unknown as ExtensionLike;

/** The ARIA of one version in {@link RICH}: roles that merge into those of the data by name, properties, graphics roles. */
const richVersion = (suffix: string) => ({
	roles: [{ name: 'button', deprecated: true }, { name: `rich-role-${suffix}`, generalization: ['widget'] }, 'link'],
	props: [
		{ name: 'aria-label', deprecated: true },
		{ name: `aria-rich-${suffix}`, type: 'property', value: 'string', enum: [] },
	],
	graphicsRoles: [
		{ name: 'graphics-document', deprecated: true },
		{ name: `graphics-rich-${suffix}`, generalization: [] },
	],
	dpubRoles: [{ name: 'doc-abstract', deprecated: true }],
});

/**
 * An extension that has every kind of change that `schemaToSpec` merges, against names that the data has: a global attribute that
 * is replaced and one that is added, roles, properties, graphics roles and publishing roles of every version that merge by
 * name, a member of a category and a category that is new, attributes of elements of HTML and of SVG, and the rest of the keys
 * with `customElements` of the literal values.
 */
export const RICH = {
	def: {
		'#globalAttrs': {
			'#extends': {
				'x-rich-attr': { type: 'Any', experimental: true },
				class: { type: 'Any', deprecated: true },
			},
		},
		'#aria': { '1.1': richVersion('11'), '1.2': richVersion('12'), '1.3': richVersion('13') },
		'#contentModels': { '#phrasing': ['x-rich-element'], '#x-rich': ['a', 'svg:circle'] },
	},
	specs: [
		{
			name: 'A',
			attributes: { href: { type: 'URL', deprecated: true }, 'x-extra': { type: 'Any' } },
			globalAttrs: { '#GlobalEventAttrs': false },
		},
		{ name: 'svg:circle', attributes: { r: { type: 'Any', experimental: true } } },
		{ name: 'x-not-in-the-data', attributes: {} },
	],
	directivePatterns: [{ attrName: '^x-', prefix: 'x-', type: 'prefix' }],
	movedToHead: ['x-rich-head'],
	acceptedAttrNames: ['(rich)'],
	templateContent: false,
	literalValues: {
		attrs: { class: { '\u65E5': 'x' } },
		customElements: { attrs: { 'x-rich': { 'data-a': 'b' } } },
	},
} as unknown as ExtensionLike;

/** The extensions by the name that a file and a measurement have for them. */
export const EXTENSIONS: Readonly<Record<string, ExtensionLike>> = {
	vue: vue as ExtensionLike,
	react: react as ExtensionLike,
	svelte: svelte as ExtensionLike,
	alpine: alpine as ExtensionLike,
	htmx: htmx as ExtensionLike,
	user: USER,
	rich: RICH,
};
