import type { Config } from '@markuplint/ml-config';

import rules, { ruleAliasTable } from '@markuplint/rules';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

/**
 * Rules the Rust engine does not take over: the TS engine evaluates them whatever the parser is
 * (`ml-engine.ts`), so a file that enables one never reaches it.
 */
const notInRust = new Set(['no-unsupported-browser-features', 'no-mismatched-aspect-ratio']);

/** Every rule that is not a deprecated alias of others and that the comparison can be made on. */
const comparedRules = Object.fromEntries(
	Object.keys(rules)
		.filter(name => !(name in ruleAliasTable) && !notInRust.has(name))
		.map(name => [name, true]),
);

type Fixture = {
	readonly name: string;
	readonly fileName: string;
	readonly parser: string;
	readonly spec?: string;
	readonly sourceCode: string;
};

// What a template does with dynamic content is what the parsers differ in, so each file has a
// loop, a condition, bound and unbound attributes, a component, and text that is not ASCII.
const fixtures: readonly Fixture[] = [
	{
		name: 'Vue',
		fileName: 'a.vue',
		parser: '@markuplint/vue-parser',
		spec: '@markuplint/vue-spec',
		sourceCode: `<script setup>
import Foo from './Foo.vue';
</script>

<template>
  <main>
    <h1>日本語😀</h1>
    <ul>
      <li v-for="item in items" :key="item.id" :class="{ a: item.a }">{{ item.name }}</li>
    </ul>
    <img :src="src" :alt="alt">
    <img src="a.png">
    <input v-model="value" type="text" id="x">
    <label for="x">L</label>
    <Foo :bar="1" @click="go" v-if="show"><template #default="{ a }"><span>{{ a }}</span></template></Foo>
    <a :href="url" class="a" :class="b"></a>
    <button @click.prevent="go"></button>
    <slot name="s"></slot>
    <div v-else></div>
  </main>
</template>
`,
	},
	{
		name: 'JSX',
		fileName: 'a.jsx',
		parser: '@markuplint/jsx-parser',
		spec: '@markuplint/react-spec',
		sourceCode: `export const A = ({ items, ...props }) => (
  <>
    <h1 className="t">日本語😀</h1>
    <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
    <img src={src} alt={alt} />
    <img src="a.png" />
    <input type="text" id="x" tabIndex={0} />
    <label htmlFor="x">L</label>
    <Foo {...props} bar="1" />
    <a href={url}></a>
    <button onClick={go}></button>
    <button aria-pressed />
    <div aria-hidden="" />
  </>
);
`,
	},
	{
		name: 'Svelte',
		fileName: 'a.svelte',
		parser: '@markuplint/svelte-parser',
		spec: '@markuplint/svelte-spec',
		sourceCode: `<script>
  let items = [];
</script>

<main>
  <h1>日本語😀</h1>
  {#each items as item (item.id)}
    <li class:a={item.a} on:click={go}>{item.name}</li>
  {/each}
  <img {src} alt={alt}>
  <img src="a.png">
  <input bind:value type="text" id="x">
  <label for="x">L</label>
  {#if show}<Foo {...props} bar="1" />{:else}<p></p>{/if}
  <a href={url}></a>
  <button on:click={go}></button>
</main>
`,
	},
	{
		name: 'Astro',
		fileName: 'a.astro',
		parser: '@markuplint/astro-parser',
		sourceCode: `---
import Foo from './Foo.astro';
const items = [];
---
<main>
  <h1>日本語😀</h1>
  <ul>{items.map(i => <li>{i.name}</li>)}</ul>
  <img src={src} alt={alt}>
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <Foo client:load bar="1" />
  <a href={url}></a>
  <button set:html={x}></button>
</main>
`,
	},
	{
		name: 'Pug',
		fileName: 'a.pug',
		parser: '@markuplint/pug-parser',
		sourceCode: `doctype html
html(lang="ja")
  body
    main
      h1 日本語😀
      ul
        each item in items
          li= item.name
      img(src=src alt=alt)
      img(src="a.png")
      input(type="text" id="x")
      label(for="x") L
      a(href=url)
      button(onclick="go()")
`,
	},
	{
		name: 'EJS',
		fileName: 'a.ejs',
		parser: '@markuplint/ejs-parser',
		sourceCode: `<main>
  <h1>日本語😀</h1>
  <ul><% items.forEach(function (i) { %><li><%= i.name %></li><% }) %></ul>
  <img src="<%= src %>" alt="<%= alt %>">
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <a href="<%= url %>"></a>
  <button></button>
</main>
`,
	},
	{
		name: 'ERB',
		fileName: 'a.erb',
		parser: '@markuplint/erb-parser',
		sourceCode: `<main>
  <h1>日本語😀</h1>
  <ul><% items.each do |i| %><li><%= i.name %></li><% end %></ul>
  <img src="<%= src %>" alt="<%= alt %>">
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <a href="<%= url %>"></a>
  <button></button>
</main>
`,
	},
	{
		name: 'PHP',
		fileName: 'a.php',
		parser: '@markuplint/php-parser',
		sourceCode: `<main>
  <h1>日本語😀</h1>
  <ul><?php foreach ($items as $i): ?><li><?= $i->name ?></li><?php endforeach; ?></ul>
  <img src="<?= $src ?>" alt="<?= $alt ?>">
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <a href="<?= $url ?>"></a>
  <button></button>
</main>
`,
	},
	{
		name: 'Liquid',
		fileName: 'a.liquid',
		parser: '@markuplint/liquid-parser',
		sourceCode: `<main>
  <h1>日本語😀</h1>
  <ul>{% for i in items %}<li>{{ i.name }}</li>{% endfor %}</ul>
  <img src="{{ src }}" alt="{{ alt }}">
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <a href="{{ url }}"></a>
  <button></button>
</main>
`,
	},
	{
		name: 'Nunjucks',
		fileName: 'a.njk',
		parser: '@markuplint/nunjucks-parser',
		sourceCode: `<main>
  <h1>日本語😀</h1>
  <ul>{% for i in items %}<li>{{ i.name }}</li>{% endfor %}</ul>
  <img src="{{ src }}" alt="{{ alt }}">
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <a href="{{ url }}"></a>
  <button></button>
</main>
`,
	},
	{
		name: 'Mustache',
		fileName: 'a.mustache',
		parser: '@markuplint/mustache-parser',
		sourceCode: `<main>
  <h1>日本語😀</h1>
  <ul>{{#items}}<li>{{name}}</li>{{/items}}</ul>
  <img src="{{src}}" alt="{{alt}}">
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <a href="{{url}}"></a>
  <button></button>
</main>
`,
	},
	{
		name: 'Smarty',
		fileName: 'a.tpl',
		parser: '@markuplint/smarty-parser',
		sourceCode: `<main>
  <h1>日本語😀</h1>
  <ul>{foreach $items as $i}<li>{$i.name}</li>{/foreach}</ul>
  <img src="{$src}" alt="{$alt}">
  <img src="a.png">
  <input type="text" id="x">
  <label for="x">L</label>
  <a href="{$url}"></a>
  <button></button>
</main>
`,
	},
	{
		name: 'MDX',
		fileName: 'a.mdx',
		parser: '@markuplint/mdx-parser',
		sourceCode: `import Foo from './Foo'

# 日本語😀

<div className="a">
  <img src="a.png" />
  <Foo bar="1" />
  <a href={url}></a>
</div>
`,
	},
	{
		name: 'Alpine.js',
		fileName: 'a.alpine.html',
		parser: '@markuplint/alpine-parser',
		spec: '@markuplint/alpine-spec',
		sourceCode: `<main x-data="{ open: false }">
  <h1>日本語😀</h1>
  <img :src="src" :alt="alt">
  <img src="a.png">
  <a :href="url" x-show="open" @click="open = !open"></a>
  <button x-on:click="go"></button>
  <template x-for="i in items"><li x-text="i"></li></template>
</main>
`,
	},
];

describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore lints the files of framework parsers', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const exec = async (fixture: Fixture, options: { rust: boolean; fix: boolean }) => {
		const file = await MLEngine.toMLFile({ sourceCode: fixture.sourceCode, name: fixture.fileName });
		const pattern = `${fixture.fileName.replaceAll('.', '\\.')}$`;
		const config: Config = {
			parser: { [pattern]: fixture.parser },
			...(fixture.spec ? { specs: { [pattern]: fixture.spec } } : {}),
			rules: comparedRules,
		};
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: options.rust,
			fix: options.fix,
			config,
		});
		return engine.exec();
	};

	// The two engines order the violations differently (TS by rule, Rust by position); the set is
	// what has to be the same.
	const summarize = (violations: readonly { ruleId: string; line: number; col: number; raw: string }[] | undefined) =>
		(violations ?? []).map(v => `${v.ruleId} ${v.line}:${v.col} ${JSON.stringify(v.raw)}`).toSorted();

	const stderrOf = (write: { readonly mock: { readonly calls: readonly unknown[][] } }) =>
		write.mock.calls.map(args => String(args[0])).join('');

	it.each(fixtures)('reports what the TypeScript engine reports for $name', async fixture => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

		const expected = await exec(fixture, { rust: false, fix: false });
		const actual = await exec(fixture, { rust: true, fix: false });

		expect(stderrOf(write)).not.toContain('falling back to TypeScript engine');
		expect(summarize(actual?.violations)).toStrictEqual(summarize(expected?.violations));
	});

	it.each(fixtures)('fixes what the TypeScript engine fixes for $name', async fixture => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

		const expected = await exec(fixture, { rust: false, fix: true });
		const actual = await exec(fixture, { rust: true, fix: true });

		expect(stderrOf(write)).not.toContain('falling back to TypeScript engine');
		expect(actual?.fixedCode).toBe(expected?.fixedCode);
	});
});

// Components are what the pretenders are for, and the components of a framework file are the
// elements its parser reports as authored.
describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore applies the pretenders to framework files', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		{
			name: 'JSX',
			fileName: 'a.jsx',
			parser: '@markuplint/jsx-parser',
			code: 'export const A = () => <div><Button /><Button aria-label="x" /><Icon /></div>;',
			pretenders: [
				{ selector: 'Button', as: 'button' },
				{ selector: 'Icon', as: { element: 'img', attrs: [{ name: 'alt', value: 'icon' }] } },
			],
		},
		{
			name: 'Vue',
			fileName: 'a.vue',
			parser: '@markuplint/vue-parser',
			code: '<template><div><Button /><Button aria-label="x" /><Icon /></div></template>',
			pretenders: [
				{ selector: 'Button', as: 'button' },
				{ selector: 'Icon', as: { element: 'img', attrs: [{ name: 'alt', value: 'icon' }] } },
			],
		},
	])('reports what the TypeScript engine reports for $name', async ({ fileName, parser, code, pretenders }) => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const run = async (rust: boolean) => {
			const file = await MLEngine.toMLFile({ sourceCode: code, name: fileName });
			const engine = new MLEngine(file!, {
				noSearchConfig: true,
				locale: 'en',
				experimentalRustCore: rust,
				config: {
					parser: { [`${fileName.replaceAll('.', '\\.')}$`]: parser },
					pretenders,
					rules: {
						'require-accessible-name': true,
						'no-empty-palpable-content': false,
						'permitted-contents': true,
					},
				},
			});
			return engine.exec();
		};

		const expected = await run(false);
		const actual = await run(true);

		expect(write.mock.calls.map(args => String(args[0])).join('')).not.toContain(
			'falling back to TypeScript engine',
		);
		// A component that pretends to be a `button` and has no name is what there is to find.
		expect(expected?.violations.map(v => v.ruleId)).toContain('require-accessible-name');
		const fields = (result: typeof expected) =>
			result?.violations.map(v => `${v.ruleId} ${v.line}:${v.col} ${JSON.stringify(v.raw)}`).toSorted();
		expect(fields(actual)).toStrictEqual(fields(expected));
	});
});

// The offsets of a fix are the parser's, in UTF-16 code units, and the edits go to the source as
// the file holds it: the fixed code has to be the TS engine's, which these cases pin down as well.
describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore fixes the files of framework parsers', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const quotes = { 'attr-value-quotes': { severity: 'error', value: 'double' } } as const;
	const duplicates = { 'no-duplicate-attr': true } as const;

	it.each([
		{
			name: 'Pug single quotes',
			fileName: 'a.pug',
			parser: '@markuplint/pug-parser',
			rules: quotes,
			code: "div(class='foo')",
			fixed: 'div(class="foo")',
		},
		{
			name: 'Vue single quotes',
			fileName: 'a.vue',
			parser: '@markuplint/vue-parser',
			rules: quotes,
			code: "<template><div :class='foo'></div></template>",
			fixed: '<template><div :class="foo"></div></template>',
		},
		{
			name: 'Vue duplicate attribute',
			fileName: 'a.vue',
			parser: '@markuplint/vue-parser',
			rules: duplicates,
			code: '<template><div class="a" class="b"></div></template>',
			fixed: '<template><div class="a"></div></template>',
		},
		{
			name: 'Markdown raw HTML',
			fileName: 'a.md',
			parser: '@markuplint/markdown-parser',
			rules: quotes,
			code: "Some text\n\n<div data-attr='value'>content</div>\n",
			fixed: 'Some text\n\n<div data-attr="value">content</div>\n',
		},
		{
			name: 'Vue after non-ASCII text',
			fileName: 'a.vue',
			parser: '@markuplint/vue-parser',
			rules: quotes,
			code: "<template><p>日本語😀</p><div class='a' id=b></div></template>",
			fixed: '<template><p>日本語😀</p><div class="a" id="b"></div></template>',
		},
		{
			name: 'JSX after non-ASCII text',
			fileName: 'a.jsx',
			parser: '@markuplint/jsx-parser',
			rules: { ...quotes, 'case-sensitive-attr-name': true },
			code: "export const A = () => <><p>日本語😀</p><div class='a' ID='b' /></>;",
			fixed: 'export const A = () => <><p>日本語😀</p><div class="a" id="b" /></>;',
		},
	])('fixes $name as the TypeScript engine does', async ({ fileName, parser, rules, code, fixed }) => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const run = async (rust: boolean) => {
			const file = await MLEngine.toMLFile({ sourceCode: code, name: fileName });
			const engine = new MLEngine(file!, {
				noSearchConfig: true,
				locale: 'en',
				experimentalRustCore: rust,
				fix: true,
				config: { parser: { [`${fileName.replaceAll('.', '\\.')}$`]: parser }, rules },
			});
			return engine.exec();
		};

		const expected = await run(false);
		const actual = await run(true);

		expect(write.mock.calls.map(args => String(args[0])).join('')).not.toContain(
			'falling back to TypeScript engine',
		);
		expect(expected?.fixedCode).toBe(fixed);
		expect(actual?.fixedCode).toBe(fixed);
	});
});

describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore reports a document the parser cannot build', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// The parsers throw on a repeated attribute; the TS engine reports it as the `parse-error`
	// violation, and the Rust engine does not get as far as a DOM.
	it.each([
		{
			name: 'Svelte',
			fileName: 'a.svelte',
			parser: '@markuplint/svelte-parser',
			code: '<a href="x" href="y"></a>',
		},
		{ name: 'Pug', fileName: 'a.pug', parser: '@markuplint/pug-parser', code: 'a(href="x" href="y")' },
	])('reports the parse-error of $name as the TypeScript engine does', async ({ fileName, parser, code }) => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const run = async (rust: boolean) => {
			const file = await MLEngine.toMLFile({ sourceCode: code, name: fileName });
			const engine = new MLEngine(file!, {
				noSearchConfig: true,
				locale: 'en',
				experimentalRustCore: rust,
				config: {
					parser: { [`${fileName.replaceAll('.', '\\.')}$`]: parser },
					rules: { 'no-duplicate-attr': true },
				},
			});
			return engine.exec();
		};

		const expected = await run(false);
		const actual = await run(true);

		const fields = (result: typeof expected) =>
			result?.violations.map(({ ruleId, severity, line, col, message, raw }) => ({
				ruleId,
				severity,
				line,
				col,
				message,
				raw,
			}));

		expect(stderrOf(write)).not.toContain('falling back to TypeScript engine');
		expect(expected?.violations.map(v => v.ruleId)).toStrictEqual(['parse-error']);
		expect(fields(actual)).toStrictEqual(fields(expected));
	});

	// With `severity.parseError` off the violation is not reported, and with `fix` the code is left
	// as it is, as the file never parsed.
	it('reports nothing and leaves the code alone when parseError is off', async () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const code = '<a href="x" href="y"></a>';
		const run = async (rust: boolean) => {
			const file = await MLEngine.toMLFile({ sourceCode: code, name: 'a.svelte' });
			const engine = new MLEngine(file!, {
				noSearchConfig: true,
				locale: 'en',
				experimentalRustCore: rust,
				fix: true,
				config: {
					parser: { 'a\\.svelte$': '@markuplint/svelte-parser' },
					severity: { parseError: false },
					rules: { 'no-duplicate-attr': true },
				},
			});
			return engine.exec();
		};

		const expected = await run(false);
		const actual = await run(true);

		expect(stderrOf(write)).not.toContain('falling back to TypeScript engine');
		expect(expected?.violations).toStrictEqual([]);
		expect(actual?.violations).toStrictEqual([]);
		expect(actual?.fixedCode).toBe(code);
		expect(expected?.fixedCode).toBe(code);
	});

	const stderrOf = (write: { readonly mock: { readonly calls: readonly unknown[][] } }) =>
		write.mock.calls.map(args => String(args[0])).join('');
});

describe.skipIf(!nativeAddonIsBuilt)(
	'experimentalRustCore selects what the TypeScript engine selects with :model()',
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		// `no-restricted-element` reports every element its selector matches, so it shows what
		// `:model()` matches. The entries of a category carry conditions (`ul:has(>li)`,
		// `audio[controls]`, `input:not([type='hidden' i])`) and `#custom`.
		//
		// `selects` is how many elements the TS engine selects, so a case that both engines leave
		// empty by mistake does not pass.
		it.each([
			{ code: '<sup></sup>', selector: ':model(palpable)', selects: 1 },
			{ code: '<ul><li></li></ul>', selector: ':model(palpable)', selects: 1 },
			{ code: '<ul></ul>', selector: ':model(palpable)', selects: 0 },
			{ code: '<audio controls></audio><audio></audio>', selector: ':model(palpable)', selects: 1 },
			{ code: '<input type="text"><input type="hidden">', selector: ':model(palpable)', selects: 1 },
			{ code: '<math></math>', selector: ':model(palpable)', selects: 1 },
			{ code: '<x-foo></x-foo>', selector: ':model(flow)', selects: 1 },
			{ code: '<x-foo></x-foo>', selector: ':model(phrasing)', selects: 1 },
			{ code: '<x-foo></x-foo>', selector: ':model(interactive)', selects: 0 },
			{ code: '<x-foo></x-foo>', selector: ':model(custom)', selects: 0 },
			{ code: '<annotation-xml></annotation-xml>', selector: ':model(flow)', selects: 0 },
			{ code: '<svg><rect></rect></svg>', selector: ':model(SVGRenderable)', selects: 2 },
			{ code: '<div></div><span></span>', selector: ':model( Flow )', selects: 2 },
			{ code: '<li id="text"></li><li id="custom"></li>', selector: ':model(flow)', selects: 0 },
		])('selects what the TypeScript engine selects for $selector in $code', async ({ code, selector, selects }) => {
			const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
			const run = async (rust: boolean) => {
				const file = await MLEngine.toMLFile({ sourceCode: code, name: 'a.html' });
				const engine = new MLEngine(file!, {
					noSearchConfig: true,
					locale: 'en',
					experimentalRustCore: rust,
					config: { rules: { 'no-restricted-element': { value: [selector] } } },
				});
				return engine.exec();
			};
			const selected = (result: Awaited<ReturnType<typeof run>>) =>
				result?.violations.map(v => `${v.line}:${v.col} ${v.raw}`).toSorted();

			const expected = await run(false);
			const actual = await run(true);

			expect(write.mock.calls.map(args => String(args[0])).join('')).not.toContain(
				'falling back to TypeScript engine',
			);
			expect(selected(expected)).toHaveLength(selects);
			expect(selected(actual)).toStrictEqual(selected(expected));
		});

		// A component (`<Foo />`) is not a native HTML element, so `#custom` covers it as it does a
		// custom element (`<x-bar />`); the parser sets its `elementType`.
		it.each([
			{ selector: ':model(phrasing)', selects: 3 },
			{ selector: ':model(flow)', selects: 4 },
			{ selector: ':model(interactive)', selects: 0 },
		])('selects a component and a custom element for $selector in JSX', async ({ selector, selects }) => {
			const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
			const run = async (rust: boolean) => {
				const file = await MLEngine.toMLFile({
					sourceCode: 'export const A = () => (<div><Foo /><x-bar /><span /></div>);',
					name: 'a.jsx',
				});
				const engine = new MLEngine(file!, {
					noSearchConfig: true,
					locale: 'en',
					experimentalRustCore: rust,
					config: {
						parser: { '\\.jsx$': '@markuplint/jsx-parser' },
						specs: { '\\.jsx$': '@markuplint/react-spec' },
						rules: { 'no-restricted-element': { value: [selector] } },
					},
				});
				return engine.exec();
			};
			const selected = (result: Awaited<ReturnType<typeof run>>) =>
				result?.violations.map(v => `${v.line}:${v.col} ${v.raw}`).toSorted();

			const expected = await run(false);
			const actual = await run(true);

			expect(write.mock.calls.map(args => String(args[0])).join('')).not.toContain(
				'falling back to TypeScript engine',
			);
			expect(selected(expected)).toHaveLength(selects);
			expect(selected(actual)).toStrictEqual(selected(expected));
		});
	},
);
