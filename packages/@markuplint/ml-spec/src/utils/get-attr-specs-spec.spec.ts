import htmlSpec from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { getAttrSpecs } from './get-attr-specs-spec.js';
import { resolveNamespace } from './resolve-namespace.js';

describe('getSpec', () => {
	test('svg:image[x]', () => {
		const specs = getAttrSpecs('image', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'x');
		expect(x).toStrictEqual({
			defaultValue: '0',
			name: 'x',
			type: ['<svg-length>', '<percentage>'],
			animatable: true,
		});
	});

	test('svg:foreignObject[x]', () => {
		const specs = getAttrSpecs('foreignObject', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'x');
		expect(x).toStrictEqual({
			defaultValue: '0',
			name: 'x',
			type: ['<svg-length>', '<percentage>'],
			animatable: true,
		});
	});

	test('svg:linearGradient[xlink:href]', () => {
		const specs = getAttrSpecs('linearGradient', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'xlink:href');
		expect(x).toStrictEqual({
			description: '',
			name: 'xlink:href',
			type: 'URL',
			deprecated: true,
		});
	});

	test('input[switch]: a single selector is a string', () => {
		const specs = getAttrSpecs('input', null, htmlSpec);
		const attr = specs?.find(spec => spec.name === 'switch');
		expect(attr?.condition).toBe("[type='checkbox' i]");
	});

	test('audio[controlslist]: an attribute that the source file of the element defines has the type that it writes', () => {
		const specs = getAttrSpecs('audio', null, htmlSpec);
		const attr = specs?.find(spec => spec.name === 'controlslist');
		expect(attr).toStrictEqual({
			name: 'controlslist',
			type: {
				token: { enum: ['nodownload', 'nofullscreen', 'noremoteplayback'] },
				ordered: false,
				caseInsensitive: true,
				unique: true,
				separator: 'space',
			},
			description: '',
		});
	});

	test('an attribute that the data lists with nothing but its name is known, as `Any`', () => {
		const schema = {
			def: { '#globalAttrs': {} },
			specs: [{ name: 'x', globalAttrs: {}, attributes: { foo: {} } }],
		};
		const specs = getAttrSpecs('x', null, schema as never);
		expect(specs).toStrictEqual([{ name: 'foo', type: 'Any', description: '' }]);
	});
});

/**
 * `@markuplint/html-spec` no longer carries an attribute that MDN lists with nothing but its name: the names come
 * from the sources, in the `attributes` of an element or through the categories of its `globalAttrs`. These are the
 * names that the data listed that way when the entries were removed, and every one of them is defined by a category
 * that its element selects, so none became unknown.
 */
const FORMER_NAME_ONLY_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	a: ['download', 'href', 'hreflang', 'ping', 'referrerpolicy', 'rel', 'target', 'type'],
	area: ['download', 'href', 'ping', 'referrerpolicy', 'rel', 'target'],
	audio: ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'preload', 'src'],
	button: [
		'autofocus',
		'disabled',
		'form',
		'formaction',
		'formenctype',
		'formmethod',
		'formnovalidate',
		'formtarget',
		'name',
	],
	embed: ['height', 'width'],
	fieldset: ['disabled', 'form', 'name'],
	form: ['autocapitalize'],
	iframe: ['height', 'loading', 'referrerpolicy', 'width'],
	img: ['crossorigin', 'elementtiming', 'fetchpriority', 'height', 'loading', 'referrerpolicy', 'width'],
	input: [
		'autocapitalize',
		'autofocus',
		'disabled',
		'form',
		'formaction',
		'formenctype',
		'formmethod',
		'formnovalidate',
		'formtarget',
		'id',
		'inputmode',
		'tabindex',
		'title',
	],
	link: ['crossorigin', 'fetchpriority', 'hreflang', 'media', 'referrerpolicy', 'type'],
	object: ['form', 'height', 'width'],
	optgroup: ['disabled'],
	option: ['disabled'],
	output: ['form', 'name'],
	script: ['nonce'],
	select: ['autofocus', 'disabled', 'form', 'name', 'required'],
	style: ['nonce', 'title'],
	td: ['colspan', 'headers', 'rowspan'],
	textarea: [
		'autocapitalize',
		'autocomplete',
		'autocorrect',
		'autofocus',
		'dirname',
		'disabled',
		'form',
		'maxlength',
		'minlength',
		'name',
		'readonly',
		'required',
		'spellcheck',
	],
	th: ['colspan', 'headers', 'rowspan'],
	video: ['autoplay', 'controls', 'crossorigin', 'height', 'loop', 'muted', 'preload', 'src', 'width'],
	'svg:a': ['download', 'href', 'hreflang', 'referrerpolicy', 'rel', 'target', 'type'],
	'svg:circle': ['cx', 'cy', 'r'],
	'svg:ellipse': ['cx', 'cy', 'rx', 'ry'],
	'svg:foreignObject': ['height', 'width', 'x', 'y'],
	'svg:image': ['height', 'width', 'x', 'y'],
	'svg:mask': ['mask-type'],
	'svg:path': ['d'],
	'svg:rect': ['height', 'rx', 'ry', 'width', 'x', 'y'],
	'svg:svg': ['x', 'y'],
	'svg:switch': ['requiredExtensions', 'systemLanguage'],
	'svg:symbol': ['height', 'width', 'x', 'y'],
	'svg:use': ['height', 'width', 'x', 'y'],
};

describe('an attribute that MDN listed with nothing but its name', () => {
	test.each(Object.entries(FORMER_NAME_ONLY_ATTRIBUTES))(
		'%s is still known with every one of its names',
		(element, names) => {
			const { localName, namespaceURI } = resolveNamespace(element);
			const known = new Set((getAttrSpecs(localName, namespaceURI, htmlSpec) ?? []).map(attr => attr.name));
			expect(names.filter(name => !known.has(name))).toStrictEqual([]);
		},
	);
});
