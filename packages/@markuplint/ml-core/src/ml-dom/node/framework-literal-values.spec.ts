import type { MLParser } from '@markuplint/ml-ast';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createTestElement } from '../../test/index.js';

/**
 * How each framework renders a literal in an attribute that is written as code, from its spec or its parser
 * (`literalValues`) and the default of `@markuplint/ml-core`. The cases are what the source of each framework
 * does (the packages say where, in the JSDoc of their `literalValues`).
 *
 * The expected value is the string that the attribute has, `null` when the framework does not output it,
 * and `UNKNOWN` when the frameworks differ and it is not known.
 */

const UNKNOWN = Symbol('UNKNOWN');

type Expected = string | null | typeof UNKNOWN;
type Case = readonly [code: string, name: string, expected: Expected];

type Framework = {
	readonly parser: () => Promise<MLParser>;
	readonly spec?: () => Promise<ExtendedSpec>;
	/** The source that surrounds the element of a case, where the language needs it (`<template>` of Vue) */
	readonly wrap?: (code: string) => string;
};

const FRAMEWORKS = {
	react: {
		parser: async () => (await import('@markuplint/jsx-parser')).parser,
		spec: async () => (await import('@markuplint/react-spec')).default,
	},
	mdx: {
		parser: async () => (await import('@markuplint/mdx-parser')).parser,
	},
	vue: {
		parser: async () => (await import('@markuplint/vue-parser')).parser,
		spec: async () => (await import('@markuplint/vue-spec')).default,
		wrap: code => `<template>${code}</template>`,
	},
	svelte: {
		parser: async () => (await import('@markuplint/svelte-parser')).parser,
		spec: async () => (await import('@markuplint/svelte-spec')).default,
	},
	astro: {
		parser: async () => (await import('@markuplint/astro-parser')).parser,
	},
	pug: {
		parser: async () => (await import('@markuplint/pug-parser')).parser,
	},
	alpine: {
		parser: async () => (await import('@markuplint/html-parser')).parser,
		spec: async () => (await import('@markuplint/alpine-spec')).default,
	},
} as const satisfies Record<string, Framework>;

async function render(framework: keyof typeof FRAMEWORKS, code: string, name: string): Promise<Expected> {
	const fw: Framework = FRAMEWORKS[framework];
	const parser = await fw.parser();
	const ext = await fw.spec?.();
	const specs = schemaToSpec([htmlSpec as unknown as MLMLSpec, ...(ext ? [ext] : [])]);
	const el = createTestElement(fw.wrap ? fw.wrap(code) : code, { parser, specs });
	const attr = el.attributes.find(a => a.name === name);
	if (!attr) {
		throw new TypeError(`No attribute ${name} in ${code}`);
	}
	if (attr.isAbsent) {
		return null;
	}
	if (attr.isDynamicValue) {
		return UNKNOWN;
	}
	return attr.value;
}

function describeCases(framework: keyof typeof FRAMEWORKS, cases: readonly Case[], title: string = framework) {
	describe(title, () => {
		test.each(cases)('%s: %s', async (code, name, expected) => {
			expect(await render(framework, code, name)).toBe(expected);
		});
	});
}

describeCases('react', [
	// The default
	['<div title={true}></div>', 'title', null],
	['<div title={false}></div>', 'title', null],
	['<div title={"x"}></div>', 'title', 'x'],
	['<div title={0}></div>', 'title', '0'],
	['<div title={""}></div>', 'title', ''],
	['<div aria-busy={true}></div>', 'aria-busy', 'true'],
	['<div aria-busy={false}></div>', 'aria-busy', 'false'],
	['<div data-x={false}></div>', 'data-x', 'false'],
	['<button disabled={true}></button>', 'disabled', ''],
	['<button disabled={false}></button>', 'disabled', null],
	['<button disabled={""}></button>', 'disabled', null],
	['<button disabled={0}></button>', 'disabled', null],
	['<button disabled={"x"}></button>', 'disabled', ''],
	['<div hidden={true}></div>', 'hidden', ''],
	['<div hidden={false}></div>', 'hidden', null],
	['<div hidden={"until-found"}></div>', 'hidden', 'until-found'],
	['<div hidden={""}></div>', 'hidden', null],
	// The booleanish string
	['<div contentEditable={true}></div>', 'contenteditable', 'true'],
	['<div contentEditable={false}></div>', 'contenteditable', 'false'],
	['<div spellCheck={false}></div>', 'spellcheck', 'false'],
	['<div draggable={true}></div>', 'draggable', 'true'],
	['<input value={true} />', 'value', 'true'],
	['<input value={0} />', 'value', '0'],
	// The overloaded boolean
	['<a download={true}></a>', 'download', ''],
	['<a download={false}></a>', 'download', null],
	['<a download={"x.txt"}></a>', 'download', 'x.txt'],
	['<input capture={true} />', 'capture', ''],
	// A number from 1
	['<textarea cols={0}></textarea>', 'cols', null],
	['<textarea rows={""}></textarea>', 'rows', null],
	['<textarea cols={20}></textarea>', 'cols', '20'],
	['<input size={4} />', 'size', '4'],
	// A boolean attribute of the spec that React does not render as boolean
	['<img ismap={true} />', 'ismap', null],
	['<img ismap={false} />', 'ismap', null],
	// A custom element
	['<x-el aria-hidden={true}></x-el>', 'aria-hidden', ''],
	['<x-el aria-hidden={false}></x-el>', 'aria-hidden', 'false'],
	['<x-el data-x={true}></x-el>', 'data-x', ''],
	['<x-el title={true}></x-el>', 'title', ''],
	['<x-el title={false}></x-el>', 'title', null],
	['<x-el disabled={""}></x-el>', 'disabled', ''],
	['<x-el disabled={true}></x-el>', 'disabled', ''],
	['<x-el disabled={false}></x-el>', 'disabled', null],
	['<x-el disabled={0}></x-el>', 'disabled', '0'],
	['<x-el hidden={true}></x-el>', 'hidden', ''],
	['<x-el hidden={false}></x-el>', 'hidden', null],
]);

describeCases('mdx', [
	['<div aria-hidden />', 'aria-hidden', 'true'],
	['<div aria-hidden={true} />', 'aria-hidden', 'true'],
	['<div aria-hidden={"false"} />', 'aria-hidden', 'false'],
	['<button disabled={false}></button>', 'disabled', null],
]);

describeCases('vue', [
	// The default
	['<div :title="true"></div>', 'title', 'true'],
	['<div :title="false"></div>', 'title', 'false'],
	['<div :title="null"></div>', 'title', null],
	['<div :title="undefined"></div>', 'title', null],
	['<div :title="\'x\'"></div>', 'title', 'x'],
	['<div :title="0"></div>', 'title', '0'],
	['<div v-bind:title="1"></div>', 'title', '1'],
	['<div :aria-hidden="true"></div>', 'aria-hidden', 'true'],
	['<button :disabled="true"></button>', 'disabled', ''],
	['<button :disabled="false"></button>', 'disabled', null],
	['<button :disabled="0"></button>', 'disabled', null],
	// "It will also be included if the value is an empty string"
	['<button :disabled=\'""\'></button>', 'disabled', ''],
	['<div :hidden="true"></div>', 'hidden', ''],
	['<div :hidden="false"></div>', 'hidden', null],
	// `class` and `style` are always output, and what is not a string, an array or an object is empty
	['<div :class="false"></div>', 'class', ''],
	['<div :class="null"></div>', 'class', ''],
	['<div :style="true"></div>', 'style', ''],
	['<div :class="\'a b\'"></div>', 'class', 'a b'],
	// Not a literal, and not an attribute of the same name
	['<div :class="{ a: b }"></div>', 'class', UNKNOWN],
	['<div :title="cond ? 1 : 2"></div>', 'title', UNKNOWN],
	// A modifier that sets the property is a directive that has no attribute name
	['<div :title.prop="true"></div>', ':title.prop', UNKNOWN],
	['<button :disabled></button>', 'disabled', UNKNOWN],
]);

describeCases('svelte', [
	['<div title={true}></div>', 'title', 'true'],
	['<div title={false}></div>', 'title', 'false'],
	['<div title={null}></div>', 'title', null],
	['<div title={"x"}></div>', 'title', 'x'],
	['<button disabled={true}></button>', 'disabled', ''],
	['<button disabled={false}></button>', 'disabled', null],
	['<button disabled={0}></button>', 'disabled', null],
	// "`''` is a present boolean attribute, as it is in markup and on the client"
	['<button disabled={""}></button>', 'disabled', ''],
	['<div hidden={true}></div>', 'hidden', ''],
	['<div hidden={false}></div>', 'hidden', null],
	['<div hidden={"until-found"}></div>', 'hidden', 'until-found'],
	['<div translate={true}></div>', 'translate', 'yes'],
	['<div translate={false}></div>', 'translate', 'no'],
	['<div class={false}></div>', 'class', 'false'],
	['<div class={null}></div>', 'class', null],
	// A single expression in quotes is the expression
	['<button disabled="{false}"></button>', 'disabled', null],
	['<div title="{true}"></div>', 'title', 'true'],
	// A string with an expression in it is a string
	['<a href="page/{p}"></a>', 'href', 'page/{p}'],
	// A value that is not an attribute value
	['<div class={{ a, b }}></div>', 'class', UNKNOWN],
	['<div class={["a", "b"]}></div>', 'class', UNKNOWN],
]);

describeCases('astro', [
	['<div title={true}></div>', 'title', 'true'],
	['<div title={false}></div>', 'title', 'false'],
	['<div title={null}></div>', 'title', null],
	['<div title={""}></div>', 'title', ''],
	['<button disabled={true}></button>', 'disabled', ''],
	['<button disabled={false}></button>', 'disabled', null],
	// A boolean attribute takes `""` as a falsy value
	['<button disabled={""}></button>', 'disabled', null],
	['<div hidden={true}></div>', 'hidden', ''],
	['<div hidden={false}></div>', 'hidden', null],
	['<div hidden={0}></div>', 'hidden', '0'],
	['<a download={true}></a>', 'download', ''],
	['<a download={false}></a>', 'download', null],
	['<div popover={true}></div>', 'popover', ''],
	// Not a boolean attribute of Astro
	['<img ismap={true} />', 'ismap', 'true'],
	['<img ismap={false} />', 'ismap', 'false'],
	['<select multiple={false}></select>', 'multiple', 'false'],
	// A custom element takes every boolean as a string
	['<x-el disabled={false}></x-el>', 'disabled', 'false'],
	['<x-el disabled={true}></x-el>', 'disabled', 'true'],
	['<x-el hidden={false}></x-el>', 'hidden', 'false'],
	['<x-el hidden={true}></x-el>', 'hidden', 'true'],
	['<x-el title={true}></x-el>', 'title', 'true'],
	// `class:list` is not the class
	['<div class:list={true}></div>', 'class', UNKNOWN],
]);

describeCases('pug', [
	['input(disabled=true)', 'disabled', ''],
	['input(disabled=false)', 'disabled', null],
	['input(disabled=0)', 'disabled', '0'],
	['input(disabled=null)', 'disabled', null],
	['div(title=true)', 'title', ''],
	['div(title=false)', 'title', null],
	['div(title=0)', 'title', '0'],
	['div(title="x")', 'title', 'x'],
	['div(title="")', 'title', ''],
	['div(title=`x`)', 'title', 'x'],
	['div(aria-hidden=true)', 'aria-hidden', ''],
	['div(data-x=false)', 'data-x', null],
	['div(class="")', 'class', null],
	['div(class=0)', 'class', null],
	['div(class="a")', 'class', 'a'],
	['div(style="")', 'style', null],
	['div(hidden=0)', 'hidden', '0'],
	['div(hidden=true)', 'hidden', ''],
	['div(title=`a${b}`)', 'title', UNKNOWN],
	['div(title=foo)', 'title', UNKNOWN],
]);

describeCases('alpine', [
	['<div :title="true"></div>', 'title', 'true'],
	['<div :title="false"></div>', 'title', null],
	['<div :title="null"></div>', 'title', null],
	['<div :title="0"></div>', 'title', '0'],
	['<div x-bind:title="\'x\'"></div>', 'title', 'x'],
	['<div :data-x="false"></div>', 'data-x', null],
	// The four that keep `false` and `null` as strings
	['<div :aria-pressed="false"></div>', 'aria-pressed', 'false'],
	['<div :aria-expanded="null"></div>', 'aria-expanded', 'null'],
	['<div :aria-checked="undefined"></div>', 'aria-checked', 'undefined'],
	['<div :aria-selected="true"></div>', 'aria-selected', 'true'],
	['<div :aria-hidden="false"></div>', 'aria-hidden', null],
	// A boolean attribute is present for anything but those three, `0` and the empty string included
	['<button :disabled="true"></button>', 'disabled', ''],
	['<button :disabled="false"></button>', 'disabled', null],
	['<button :disabled="0"></button>', 'disabled', ''],
	['<button :disabled=\'""\'></button>', 'disabled', ''],
	// `hidden` is not a boolean attribute of Alpine
	['<div :hidden="true"></div>', 'hidden', 'true'],
	['<div :hidden="false"></div>', 'hidden', null],
	['<div :hidden="0"></div>', 'hidden', '0'],
	['<div :class="true"></div>', 'class', null],
	['<div :class="0"></div>', 'class', null],
	['<div :style="false"></div>', 'style', 'false'],
	// A modifier changes the name that is bound
	['<div :title.camel="true"></div>', 'title', UNKNOWN],
]);

/**
 * The cases of one attribute name in a group: `names` are written one by one with each literal. The expected
 * values are written here, not taken from the declaration, so that a table that changes fails.
 */
function rowsOf(
	make: (name: string, literal: string) => string,
	names: readonly string[],
	cases: readonly (readonly [literal: string, expected: Expected])[],
): Case[] {
	return names.flatMap(name => cases.map(([literal, expected]): Case => [make(name, literal), name, expected]));
}

const inJSX = (name: string, literal: string) => `<div ${name}={${literal}}></div>`;
const inVue = (name: string, literal: string) => `<div :${name}="${literal}"></div>`;
const inCustomElement = (name: string, literal: string) => `<x-el ${name}={${literal}}></x-el>`;
const inPug = (name: string, literal: string) => `div(${name}=${literal})`;

describeCases(
	'react',
	[
		...rowsOf(
			inJSX,
			['autoreverse', 'externalresourcesrequired', 'focusable', 'preservealpha'],
			[
				['true', 'true'],
				['false', 'false'],
			],
		),
		...rowsOf(
			inJSX,
			['capture', 'download'],
			[
				['true', ''],
				['false', null],
			],
		),
		...rowsOf(
			inJSX,
			['cols', 'rows', 'size', 'span'],
			[
				['0', null],
				["''", null],
				['true', 'true'],
				['3', '3'],
			],
		),
		...rowsOf(
			inJSX,
			['disablepictureinpicture', 'disableremoteplayback'],
			[
				['true', ''],
				['false', null],
				['0', null],
				["''", null],
			],
		),
		...rowsOf(
			inJSX,
			[
				'alpha',
				'focusgroupstart',
				'headingreset',
				'ismap',
				'shadowrootclonable',
				'shadowrootcustomelementregistry',
				'shadowrootdelegatesfocus',
				'shadowrootserializable',
				'switch',
				'suppresscontenteditablewarning',
				'suppresshydrationwarning',
			],
			[
				['true', null],
				['false', null],
			],
		),
		...rowsOf(
			inCustomElement,
			['aria-hidden', 'data-x'],
			[
				['true', ''],
				['false', 'false'],
			],
		),
	],
	'react: every attribute of the table',
);

describeCases(
	'vue',
	[
		...rowsOf(
			inVue,
			['class', 'style'],
			[
				['true', ''],
				['false', ''],
				['null', ''],
				['undefined', ''],
				['0', ''],
			],
		),
	],
	'vue: every attribute of the table',
);

describeCases(
	'svelte',
	[
		...rowsOf(
			inJSX,
			['disablepictureinpicture', 'disableremoteplayback', 'indeterminate', 'webkitdirectory'],
			[
				['true', ''],
				['false', null],
				['0', null],
			],
		),
		...rowsOf(
			inJSX,
			[
				'alpha',
				'focusgroupstart',
				'headingreset',
				'shadowrootclonable',
				'shadowrootcustomelementregistry',
				'shadowrootdelegatesfocus',
				'shadowrootserializable',
				'switch',
			],
			[
				['true', 'true'],
				['false', 'false'],
				['0', '0'],
				["''", ''],
			],
		),
	],
	'svelte: every attribute of the table',
);

describeCases(
	'astro',
	[
		...rowsOf(
			inJSX,
			['disablepictureinpicture', 'disableremoteplayback'],
			[
				['true', ''],
				['false', null],
				['0', null],
				["''", null],
			],
		),
		...rowsOf(
			inJSX,
			[
				'alpha',
				'focusgroupstart',
				'headingreset',
				'ismap',
				'multiple',
				'shadowrootclonable',
				'shadowrootcustomelementregistry',
				'shadowrootdelegatesfocus',
				'shadowrootserializable',
				'switch',
			],
			[
				['true', 'true'],
				['false', 'false'],
				['0', '0'],
				["''", ''],
			],
		),
		...rowsOf(
			inJSX,
			['popover', 'download'],
			[
				['true', ''],
				['false', null],
			],
		),
		...rowsOf(
			inCustomElement,
			['disabled'],
			[
				['0', '0'],
				["''", ''],
			],
		),
		...rowsOf(
			inCustomElement,
			['download'],
			[
				['true', 'true'],
				['false', 'false'],
			],
		),
		...rowsOf(
			inCustomElement,
			['popover'],
			[
				['true', ''],
				['false', null],
			],
		),
	],
	'astro: every attribute of the table',
);

describeCases(
	'pug',
	[
		...rowsOf(
			inPug,
			['aria-hidden', 'data-x'],
			[
				['true', ''],
				['false', null],
			],
		),
		...rowsOf(
			inPug,
			['class', 'style'],
			[
				["''", null],
				['0', null],
			],
		),
		...rowsOf(
			inPug,
			['disabled'],
			[
				['0', '0'],
				["''", ''],
			],
		),
	],
	'pug: every attribute of the table',
);

describeCases(
	'alpine',
	[
		...rowsOf(
			inVue,
			['aria-pressed', 'aria-checked', 'aria-expanded', 'aria-selected', 'style'],
			[
				['false', 'false'],
				['null', 'null'],
				['undefined', 'undefined'],
			],
		),
		...rowsOf(
			inVue,
			['class'],
			[
				['true', null],
				['false', null],
				['null', null],
				['undefined', null],
				['0', null],
				["''", null],
			],
		),
		...rowsOf(
			inVue,
			['alpha', 'focusgroupstart', 'headingreset', 'shadowrootcustomelementregistry', 'switch'],
			[
				['true', 'true'],
				['0', '0'],
				["''", ''],
			],
		),
		...rowsOf(
			inVue,
			['disabled'],
			[
				['0', ''],
				["''", ''],
				['false', null],
			],
		),
	],
	'alpine: every attribute of the table',
);
