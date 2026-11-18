/**
 * The extended specs that the composition is measured and checked with: those of the frameworks, which are what a
 * project that has a `specs` setting uses, and one that has the kinds of change that a user's file has. Both languages compose these,
 * and the bytes that they make are compared.
 *
 * @module
 */
import type { ExtensionLike } from './compose.ts';

import react from '@markuplint/react-spec';
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

/** The extensions by the name that a file and a measurement have for them. */
export const EXTENSIONS: Readonly<Record<string, ExtensionLike>> = {
	vue: vue as ExtensionLike,
	react: react as ExtensionLike,
	user: USER,
};
