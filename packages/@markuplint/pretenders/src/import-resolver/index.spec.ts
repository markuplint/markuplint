import { describe, test, expect } from 'vitest';

import { analyzeImports, resolveComponentImport } from './index.js';
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
