import { describe, test, expect } from 'vitest';

import { analyzeImports, collectReferencedModules, resolveComponentImport } from './index.js';
import type { ImportBinding } from './types.js';

describe('analyzeImports', () => {
	describe('Vue', () => {
		test('extracts imports from <script setup>', async () => {
			const source = `<template>
  <MyButton>Click</MyButton>
</template>

<script setup>
import MyButton from './MyButton.vue'
import { ref } from 'vue'
</script>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(2);
			expect(result!.bindings[0]).toStrictEqual({
				localName: 'MyButton',
				importedName: 'default',
				source: './MyButton.vue',
				type: 'default',
			});
			expect(result!.bindings[1]).toStrictEqual({
				localName: 'ref',
				importedName: 'ref',
				source: 'vue',
				type: 'named',
			});
		});

		test('returns empty bindings for Vue without <script setup> and no components', async () => {
			const source = `<template><div /></template>
<script>
export default { name: 'MyComp' }
</script>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toStrictEqual([]);
		});

		test('extracts imports from Options API components registration', async () => {
			const source = `<template>
  <Button /><Card />
</template>

<script>
import Button from './Button.vue'
import Card from './Card.vue'
import { someHelper } from './utils'
export default {
  components: { Button, Card }
}
</script>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(2);
			expect(result!.bindings[0]).toMatchObject({
				localName: 'Button',
				source: './Button.vue',
				type: 'default',
			});
			expect(result!.bindings[1]).toMatchObject({
				localName: 'Card',
				source: './Card.vue',
				type: 'default',
			});
		});

		test('Options API with aliased component registration', async () => {
			const source = `<template><Btn /></template>

<script>
import MyButton from './Button.vue'
export default {
  components: { Btn: MyButton }
}
</script>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(1);
			expect(result!.bindings[0]).toMatchObject({
				localName: 'MyButton',
				source: './Button.vue',
			});
		});

		test('Options API with a component registered by defineAsyncComponent', async () => {
			const source = `<template><Item /><Other /></template>

<script>
import { defineAsyncComponent } from 'vue'
export default {
  components: {
    Item: defineAsyncComponent(() => import('./Item.vue')),
    Other: defineAsyncComponent({ loader: () => import('./Other.vue') })
  }
}
</script>`;
			const result = await analyzeImports('App.vue', source);
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './Item.vue', type: 'dynamic' },
				{ localName: 'Other', importedName: 'default', source: './Other.vue', type: 'dynamic' },
			]);
		});

		test('<script setup> with a component loaded by defineAsyncComponent is named after the variable', async () => {
			const source = `<script setup>
import { defineAsyncComponent } from 'vue'
const Item = defineAsyncComponent(() => import('./Item.vue'))
</script>

<template><Item /></template>`;
			const result = await analyzeImports('App.vue', source);
			expect(result!.bindings.at(-1)).toStrictEqual({
				localName: 'Item',
				importedName: 'default',
				source: './Item.vue',
				type: 'dynamic',
			});
		});

		test('a Svelte script names a dynamic import after the variable', async () => {
			const source = `<script>
const Item = lazy(() => import('./Item.svelte'))
</script>

<Item />`;
			const result = await analyzeImports('App.svelte', source);
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './Item.svelte', type: 'dynamic' },
			]);
		});

		test('an Astro frontmatter names a dynamic import after the variable', async () => {
			const source = `---
const Item = lazy(() => import('./Item.astro'))
---

<Item />`;
			const result = await analyzeImports('Page.astro', source);
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './Item.astro', type: 'dynamic' },
			]);
		});

		test('an MDX ESM block with JSX still names a dynamic import after the variable', async () => {
			const source = `export const meta = <X />
export const Item = lazy(() => import('./Item'))

# Title`;
			const result = await analyzeImports('Doc.mdx', source);
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './Item', type: 'dynamic' },
			]);
		});

		test('Options API with defineComponent wrapper', async () => {
			const source = `<template><Button /></template>

<script lang="ts">
import { defineComponent } from 'vue'
import Button from './Button.vue'
export default defineComponent({
  components: { Button }
})
</script>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(1);
			expect(result!.bindings[0]).toMatchObject({
				localName: 'Button',
				source: './Button.vue',
				type: 'default',
			});
		});

		test('Options API with named imports', async () => {
			const source = `<template><Card /></template>

<script>
import { Card } from './ui'
export default {
  components: { Card }
}
</script>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(1);
			expect(result!.bindings[0]).toMatchObject({
				localName: 'Card',
				importedName: 'Card',
				source: './ui',
				type: 'named',
			});
		});

		test('prefers <script setup> over Options API when both exist', async () => {
			const source = `<script setup>
import Button from './Button.vue'
</script>

<script>
import Card from './Card.vue'
export default { components: { Card } }
</script>

<template><Button /><Card /></template>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			// Should use <script setup> bindings, not Options API
			expect(result!.bindings).toHaveLength(1);
			expect(result!.bindings[0]).toMatchObject({ localName: 'Button' });
		});

		test('extracts from <script setup lang="ts">', async () => {
			const source = `<script setup lang="ts">
import Button from './Button.vue'
import { Card as MyCard } from './ui'
</script>

<template>
  <Button /><MyCard />
</template>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(2);
			expect(result!.bindings[0]).toMatchObject({ localName: 'Button', source: './Button.vue' });
			expect(result!.bindings[1]).toMatchObject({ localName: 'MyCard', importedName: 'Card' });
		});

		test('extracts dynamic import from <script setup>', async () => {
			const source = `<script setup>
import Button from './Button.vue'
const Dialog = import('./Dialog.vue')
</script>

<template><Button /></template>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(2);
			expect(result!.bindings[0]).toMatchObject({ localName: 'Button', type: 'default' });
			expect(result!.bindings[1]).toMatchObject({ source: './Dialog.vue', type: 'dynamic' });
		});

		test('extracts dynamic import from a TSX file (React.lazy)', async () => {
			const source = [
				"import { lazy } from 'react';",
				"const Item = lazy(() => import('./Item'));",
				'export const W = () => <div><Item><span>c</span></Item></div>;',
			].join('\n');
			const result = await analyzeImports('App.tsx', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toStrictEqual([
				{ localName: 'lazy', importedName: 'lazy', source: 'react', type: 'named' },
				{ localName: 'Item', importedName: 'default', source: './Item', type: 'dynamic' },
			]);
		});

		test('excludes import type from bindings', async () => {
			const source = `<script setup lang="ts">
import Button from './Button.vue'
import type { ButtonProps } from './types'
</script>

<template><Button /></template>`;
			const result = await analyzeImports('App.vue', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(1);
			expect(result!.bindings[0]).toMatchObject({ localName: 'Button' });
		});

		describe('a script with `lang="tsx"` or `lang="jsx"` (issue #4322)', () => {
			const item = { localName: 'Item', importedName: 'default', source: './Item.vue', type: 'default' };
			const vue = (lang: string, body: string, setup = ' setup') =>
				`<script${setup} lang="${lang}">\nimport Item from "./Item.vue"\n${body}\n</script>\n<template><Item /></template>`;

			test.each([
				['a list', 'const render = () => <ul><li>x</li></ul>'],
				['JSX as an attribute value', 'const render = () => <A x={<C />} />'],
				[
					'an expression with an arrow function in children',
					'const render = () => <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>',
				],
				['a fragment', 'const render = () => <><A /></>'],
			])('reads the imports whatever JSX it holds, for %s', async (_, body) => {
				const result = await analyzeImports('App.vue', vue('tsx', body));
				expect(result!.bindings).toStrictEqual([item]);
			});

			test('reads the imports of `lang="jsx"` too', async () => {
				const result = await analyzeImports('App.vue', vue('jsx', 'const render = () => <><A /></>'));
				expect(result!.bindings).toStrictEqual([item]);
			});

			test('reads an import that comes after the JSX', async () => {
				const source = `<script setup lang="tsx">
const render = () => <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
import Item from "./Item.vue"
</script>`;
				const result = await analyzeImports('App.vue', source);
				expect(result!.bindings).toStrictEqual([item]);
			});

			test('reads a dynamic import that the script holds', async () => {
				const result = await analyzeImports(
					'App.vue',
					vue(
						'tsx',
						"const Slow = defineAsyncComponent(() => import('./Slow.vue'))\nconst r = () => <><A /></>",
					),
				);
				expect(result!.bindings).toStrictEqual([
					item,
					{ localName: 'Slow', importedName: 'default', source: './Slow.vue', type: 'dynamic' },
				]);
			});

			test('does not read an import that only appears in the text of JSX', async () => {
				const result = await analyzeImports(
					'App.vue',
					vue('tsx', "const r = () => <p>import Fake from './Fake.vue'</p>"),
				);
				expect(result!.bindings).toStrictEqual([item]);
			});

			test('reads the components of the Options API in a script that holds JSX', async () => {
				const source = `<script lang="tsx">
import Item from "./Item.vue"
import Other from "./Other.vue"
const render = () => <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
export default { components: { Item } }
</script>`;
				const result = await analyzeImports('App.vue', source);
				expect(result!.bindings).toStrictEqual([item]);
			});

			test('reads the Options API registration that comes after JSX', async () => {
				const source = `<script lang="jsx">
import Item from "./Item.vue"
export default { render: () => <><A /></>, components: { Item } }
</script>`;
				const result = await analyzeImports('App.vue', source);
				expect(result!.bindings).toStrictEqual([item]);
			});

			test('a script that declares no `lang` is not read as JSX, whatever another attribute says', async () => {
				// `data-lang` is no `lang`: the lexer rejects the JSX, and the TypeScript parser reads JSX as TypeScript
				const source = `<script setup data-lang="tsx">
import Item from "./Item.vue"
const r = () => <><A /></>
</script>`;
				const result = await analyzeImports('App.vue', source);
				expect(result!.bindings).toStrictEqual([]);
			});
		});
	});

	describe('Svelte', () => {
		test('extracts imports from <script>', async () => {
			const source = `<script>
import Button from './Button.svelte'
import { onMount } from 'svelte'
</script>

<Button>Click me</Button>`;
			const result = await analyzeImports('App.svelte', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(2);
			expect(result!.bindings[0]).toMatchObject({ localName: 'Button', source: './Button.svelte' });
			expect(result!.bindings[1]).toMatchObject({ localName: 'onMount', source: 'svelte' });
		});

		test('prefers instance script over module script', async () => {
			const source = `<script context="module">
export const prerender = true
</script>

<script>
import Button from './Button.svelte'
</script>

<Button />`;
			const result = await analyzeImports('App.svelte', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(1);
			expect(result!.bindings[0]).toMatchObject({ localName: 'Button', source: './Button.svelte' });
		});

		describe('`{#await import(...)}` in the template (issue #4327)', () => {
			test('binds the component of `then { default: C }` as the default export, as a script does', async () => {
				const source = `<script>
  let show = true
</script>

{#await import('./Component.svelte') then { default: Component }}
  <Component />
{/await}`;
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'Component', importedName: 'default', source: './Component.svelte', type: 'dynamic' },
				]);
			});

			test('binds the export that `then { Foo }` takes', async () => {
				const source = "{#await import('./ui.svelte') then { Foo }}<Foo />{/await}";
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'Foo', importedName: 'Foo', source: './ui.svelte', type: 'dynamic' },
				]);
			});

			test('binds the export that `then { Foo: Bar }` takes under the name it is given', async () => {
				const source = "{#await import('./ui.svelte') then { Foo: Bar }}<Bar />{/await}";
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'Bar', importedName: 'Foo', source: './ui.svelte', type: 'dynamic' },
				]);
			});

			test('binds the whole module of `then m` as a namespace', async () => {
				const source = "{#await import('./ui.svelte')}<p>wait</p>{:then m}<m.default />{/await}";
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'm', importedName: '*', source: './ui.svelte', type: 'namespace' },
				]);
			});

			test('leaves the import unnamed for a block without a pattern', async () => {
				const source = "{#await import('./Component.svelte')}<p>wait</p>{/await}";
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: '*', importedName: '*', source: './Component.svelte', type: 'dynamic' },
				]);
			});

			test('reads the blocks even when the file has no script', async () => {
				const source = "<div>{#await import('./A.svelte') then { default: A }}<A />{/await}</div>";
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'A', importedName: 'default', source: './A.svelte', type: 'dynamic' },
				]);
			});

			test('puts the imports of the script first, then those of the blocks in source order, nested ones too', async () => {
				const source = `<script>
import Button from './Button.svelte'
</script>
{#if ok}
  {#await import('./A.svelte') then { default: A }}
    {#await import('./B.svelte') then { default: B }}<B />{/await}
  {/await}
{/if}`;
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'Button', importedName: 'default', source: './Button.svelte', type: 'default' },
					{ localName: 'A', importedName: 'default', source: './A.svelte', type: 'dynamic' },
					{ localName: 'B', importedName: 'default', source: './B.svelte', type: 'dynamic' },
				]);
			});

			test('a block that binds the name an import of the script binds is read next to it', async () => {
				const source = `<script>
import C from './A.svelte'
</script>
{#await import('./B.svelte') then { default: C }}<C />{/await}`;
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings.map(b => [b.localName, b.source, b.type])).toStrictEqual([
					['C', './A.svelte', 'default'],
					['C', './B.svelte', 'dynamic'],
				]);
			});

			test('binds the export of a block whose expression is an import with a `.then`', async () => {
				const source = "{#await import('./ui.svelte').then(m => m.Item) then C}<C />{/await}";
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'C', importedName: 'Item', source: './ui.svelte', type: 'dynamic' },
				]);
			});

			test('two blocks that bind the same name are both read', async () => {
				const source = `{#await import('./A.svelte') then { default: C }}<C />{/await}
{#await import('./B.svelte') then { default: C }}<C />{/await}`;
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings.map(b => [b.localName, b.source])).toStrictEqual([
					['C', './A.svelte'],
					['C', './B.svelte'],
				]);
			});

			test.each([
				['a call that is not an import', '{#await fetchUser(id) then user}{user}{/await}'],
				['an import with a variable specifier', '{#await import(path) then { default: C }}<C />{/await}'],
				[
					'an import with a template literal specifier',
					'{#await import(`./${name}.svelte`) then { default: C }}<C />{/await}',
				],
			])('reads no binding for %s', async (_, source) => {
				const result = await analyzeImports('App.svelte', source);
				expect(result!.bindings).toStrictEqual([]);
			});

			test('reads the script of a file whose template the Svelte parser rejects, and no block', async () => {
				const result = await analyzeImports(
					'App.svelte',
					"<script>import A from './A.svelte'</script>{#await import(",
				);
				expect(result!.bindings).toStrictEqual([
					{ localName: 'A', importedName: 'default', source: './A.svelte', type: 'default' },
				]);
			});
		});
	});

	describe('Astro', () => {
		test('extracts imports from frontmatter', async () => {
			const source = `---
import Button from '../components/Button.astro'
import { getStaticPaths } from 'astro'
---

<Button>Click</Button>`;
			const result = await analyzeImports('page.astro', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(2);
			expect(result!.bindings[0]).toMatchObject({
				localName: 'Button',
				source: '../components/Button.astro',
			});
			expect(result!.bindings[1]).toMatchObject({
				localName: 'getStaticPaths',
				source: 'astro',
			});
		});
	});

	describe('MDX', () => {
		test('extracts imports from top-level ESM', async () => {
			const source = `import Button from './Button'
import { Card } from './ui'

# Hello World

<Button>Click me</Button>
<Card>Content</Card>`;
			const result = await analyzeImports('page.mdx', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toHaveLength(2);
			expect(result!.bindings[0]).toMatchObject({ localName: 'Button', source: './Button' });
			expect(result!.bindings[1]).toMatchObject({ localName: 'Card', source: './ui' });
		});

		test('reads the imports of an ESM that holds JSX the lexer cannot read, as TSX', async () => {
			const source = `import Button from './Button'
export const meta = <p>it's</p>

# Hello World

<Button>Click me</Button>`;
			const result = await analyzeImports('page.mdx', source);
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Button', importedName: 'default', source: './Button', type: 'default' },
			]);
		});

		test('returns empty bindings for MDX without imports', async () => {
			const source = '# Hello World\n\nSome content';
			const result = await analyzeImports('page.mdx', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toStrictEqual([]);
		});
	});

	describe('JSX/TSX (issue #3951)', () => {
		test('extracts imports from TSX source, including files that also contain JSX syntax', async () => {
			const source = "import Item from './a';\nexport const A = () => <Item>x</Item>;";
			const result = await analyzeImports('A.tsx', source);
			expect(result).not.toBeNull();
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './a', type: 'default' },
			]);
		});

		test('extracts imports from plain JS', async () => {
			const result = await analyzeImports('a.js', "import { Item } from './b';");
			expect(result).not.toBeNull();
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'Item', source: './b', type: 'named' },
			]);
		});

		test('extracts imports from plain TS', async () => {
			const result = await analyzeImports('a.ts', "import { Item } from './b';");
			expect(result).not.toBeNull();
			expect(result!.bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'Item', source: './b', type: 'named' },
			]);
		});
	});

	describe('unsupported frameworks', () => {
		test('returns null for .html files', async () => {
			const result = await analyzeImports('page.html', '<div>hello</div>');
			expect(result).toBeNull();
		});
	});
});

describe('resolveComponentImport', () => {
	const bindings: ImportBinding[] = [
		{ localName: 'MyButton', importedName: 'default', source: './MyButton.vue', type: 'default' },
		{ localName: 'Card', importedName: 'Card', source: './ui', type: 'named' },
		{ localName: 'Icons', importedName: '*', source: './icons', type: 'namespace' },
	];

	test('direct match by local name', () => {
		expect(resolveComponentImport('MyButton', bindings)).toStrictEqual(bindings[0]);
		expect(resolveComponentImport('Card', bindings)).toStrictEqual(bindings[1]);
		expect(resolveComponentImport('Icons', bindings)).toStrictEqual(bindings[2]);
	});

	test('returns undefined for unknown component', () => {
		expect(resolveComponentImport('Unknown', bindings)).toBeUndefined();
	});

	test('Vue kebab-case to PascalCase resolution', () => {
		expect(resolveComponentImport('my-button', bindings)).toStrictEqual(bindings[0]);
	});

	test('Vue kebab-case with 3+ segments', () => {
		const extBindings: ImportBinding[] = [
			{ localName: 'MyFancyButton', importedName: 'default', source: './MyFancyButton.vue', type: 'default' },
		];
		expect(resolveComponentImport('my-fancy-button', extBindings)).toStrictEqual(extBindings[0]);
	});

	test('non-matching kebab-case returns undefined', () => {
		expect(resolveComponentImport('other-button', bindings)).toBeUndefined();
	});

	test('single-word name without hyphen is not transformed', () => {
		expect(resolveComponentImport('card', bindings)).toBeUndefined();
	});

	test('does not match dynamic import bindings (localName is sentinel *)', () => {
		const bindingsWithDynamic: ImportBinding[] = [
			{ localName: '*', importedName: '*', source: './Dialog.vue', type: 'dynamic' },
			{ localName: 'Button', importedName: 'default', source: './Button.vue', type: 'default' },
		];
		// Dynamic binding should not match any component name
		expect(resolveComponentImport('Dialog', bindingsWithDynamic)).toBeUndefined();
		// Static binding still resolves
		expect(resolveComponentImport('Button', bindingsWithDynamic)).toStrictEqual(bindingsWithDynamic[1]);
	});
});

describe('collectReferencedModules', () => {
	test('lists the imports and the re-exports of a TS file, without duplicates', async () => {
		const source = [
			"import { A } from './a';",
			"export { A, B } from './a';",
			"export * from './c';",
			"export type { D } from './d';",
		].join('\n');

		expect(await collectReferencedModules('index.ts', source)).toStrictEqual(['./a', './c']);
	});

	test('lists the re-exports in the top-level ESM of an MDX file', async () => {
		const source = [
			"import { A } from './a';",
			"export { Callout } from './Callout';",
			"export * from './c';",
			"export type { D } from './d';",
			'export const meta = { title: "x" };',
			'',
			'# Title',
			'',
			'<Callout />',
		].join('\n');

		expect(await collectReferencedModules('page.mdx', source)).toStrictEqual(['./a', './Callout', './c']);
	});

	test('lists the imports of the ESM of an MDX file that holds JSX the lexer cannot read, as `analyzeImports` reads them', async () => {
		const source = [
			"import { A } from './a';",
			"export { Callout } from './Callout';",
			"export const meta = <p>it's</p>;",
			'',
			'# Title',
		].join('\n');

		expect(await collectReferencedModules('page.mdx', source)).toStrictEqual(['./a', './Callout']);
	});

	test('does not list a re-export in a Vue script block', async () => {
		const source = [
			'<script setup>',
			"import A from './A.vue';",
			'</script>',
			'<script>',
			"export { B } from './B';",
			'</script>',
			'<template><A /></template>',
		].join('\n');

		expect(await collectReferencedModules('App.vue', source)).toStrictEqual(['./A.vue']);
	});

	test('lists the specifier of a `{#await import(...)}` block of a Svelte file (issue #4327)', async () => {
		const source = [
			'<script>',
			"import Button from './Button.svelte';",
			'</script>',
			"{#await import('./Component.svelte') then { default: Component }}<Component />{/await}",
		].join('\n');

		expect(await collectReferencedModules('App.svelte', source)).toStrictEqual([
			'./Button.svelte',
			'./Component.svelte',
		]);
	});

	test('lists the specifier of a `{#await import(...)}` block of a Svelte file that has no script', async () => {
		const source = "{#await import('./Component.svelte') then { default: Component }}<Component />{/await}";

		expect(await collectReferencedModules('App.svelte', source)).toStrictEqual(['./Component.svelte']);
	});

	test('lists the specifier of a dynamic import in a plain JS file', async () => {
		const source = "export const load = () => import('./Item.js');";

		expect(await collectReferencedModules('loader.js', source)).toStrictEqual(['./Item.js']);
	});

	test('lists the specifier of a dynamic import in a TSX file (React.lazy)', async () => {
		const source = [
			"import { lazy } from 'react';",
			"const Item = lazy(() => import('./Item'));",
			'export const W = () => <Item />;',
		].join('\n');

		expect(await collectReferencedModules('App.tsx', source)).toStrictEqual(['react', './Item']);
	});

	test('returns null for an unsupported file type', async () => {
		expect(await collectReferencedModules('page.html', '<div></div>')).toBeNull();
	});
});
