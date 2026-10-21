import { describe, test, expect } from 'vitest';

import { componentScanner } from './component-scanner.js';

describe('componentScanner (Svelte)', () => {
	describe('scanComponent', () => {
		test('extracts root element and attrs from a simple component', () => {
			const source = '<button type="button" class="btn">Click me</button>';
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('button');
			expect(result!.attrs).toStrictEqual([
				{ name: 'type', value: 'button' },
				{ name: 'class', value: 'btn' },
			]);
			expect(result!.hasSlots).toBe(false);
		});

		test('detects <slot> usage (Svelte 4)', () => {
			const source = `<div class="wrapper">
	<slot></slot>
</div>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('div');
			expect(result!.hasSlots).toBe(true);
		});

		test('detects {@render children()} usage (Svelte 5)', () => {
			const source = `<div class="wrapper">
	{@render children()}
</div>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.hasSlots).toBe(true);
		});

		test('handles boolean attributes', () => {
			const source = '<button disabled>Submit</button>';
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.attrs).toStrictEqual([{ name: 'disabled' }]);
		});

		test('detects SVG namespace', () => {
			const source = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>';
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('svg');
			expect(result!.namespace).toBe('svg');
		});

		test('includes line and col of root element', () => {
			const source = '<div>content</div>';
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.line).toBeGreaterThan(0);
			expect(result!.col).toBeGreaterThan(0);
		});

		test('returns null for empty string input', () => {
			const result = componentScanner.scanComponent('');
			expect(result).toBeNull();
		});

		test('includes scriptSource when <script> is present', () => {
			const source = `<script>
import { onMount } from 'svelte';
</script>
<div>content</div>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.scriptSource).toBeDefined();
			expect(result!.scriptSource!.content).toContain("import { onMount } from 'svelte'");
			expect(result!.scriptSource!.offset).toBeGreaterThan(0);
		});

		test('omits scriptSource when no <script> exists', () => {
			const source = '<div>content</div>';
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.scriptSource).toBeUndefined();
		});
	});

	describe('extractScriptSource', () => {
		test('extracts instance <script> content', () => {
			const source = `<script>
import { onMount } from 'svelte';
let count = 0;
</script>
<div>{count}</div>`;
			const result = componentScanner.extractScriptSource(source);
			expect(result).not.toBeNull();
			expect(result!.content).toContain("import { onMount } from 'svelte'");
			expect(result!.offset).toBeGreaterThan(0);
		});

		test('prefers instance script over module script', () => {
			const source = `<script context="module">
export const preload = () => {};
</script>
<script>
import Component from './Component.svelte';
</script>
<div />`;
			const result = componentScanner.extractScriptSource(source);
			expect(result).not.toBeNull();
			expect(result!.content).toContain("import Component from './Component.svelte'");
		});

		test('falls back to module script when no instance script', () => {
			const source = `<script context="module">
export const meta = { title: 'Page' };
</script>
<div />`;
			const result = componentScanner.extractScriptSource(source);
			expect(result).not.toBeNull();
			expect(result!.content).toContain('export const meta');
		});

		test('returns null when no script exists', () => {
			const source = '<div>no script</div>';
			const result = componentScanner.extractScriptSource(source);
			expect(result).toBeNull();
		});
	});

	describe('extractTemplateImports', () => {
		test('returns the expression and the pattern of `then` of an `#await` block', () => {
			const source = "{#await import('./C.svelte') then { default: C }}<C />{/await}";
			expect(componentScanner.extractTemplateImports(source)).toStrictEqual([
				{ expression: "import('./C.svelte')", value: '{ default: C }' },
			]);
		});

		test('returns the pattern of a `{:then}` block', () => {
			const source = "{#await import('./C.svelte')}<p>wait</p>{:then m}<m.default />{/await}";
			expect(componentScanner.extractTemplateImports(source)).toStrictEqual([
				{ expression: "import('./C.svelte')", value: 'm' },
			]);
		});

		test('returns no value for a block without a pattern', () => {
			const source = "{#await import('./C.svelte')}<p>wait</p>{/await}";
			expect(componentScanner.extractTemplateImports(source)).toStrictEqual([
				{ expression: "import('./C.svelte')" },
			]);
		});

		test('returns the blocks in source order, the nested ones and those in other blocks too', () => {
			const source = `<script>let ok = true</script>
{#if ok}
	{#await import('./A.svelte') then { default: A }}
		{#each [1] as n}
			{#await import('./B.svelte') then { default: B }}<B />{/await}
		{/each}
	{/await}
{:else}
	<div>{#await import('./C.svelte') then c}<c.default />{/await}</div>
{/if}`;
			expect(componentScanner.extractTemplateImports(source)).toStrictEqual([
				{ expression: "import('./A.svelte')", value: '{ default: A }' },
				{ expression: "import('./B.svelte')", value: '{ default: B }' },
				{ expression: "import('./C.svelte')", value: 'c' },
			]);
		});

		test('returns the blocks inside a component, an element, a snippet and a key block', () => {
			const source = `<Layout><div>{#await import('./A.svelte') then a}{/await}</div></Layout>
{#snippet s()}{#await import('./B.svelte') then b}{/await}{/snippet}
{#key k}{#await import('./C.svelte') then c}{/await}{/key}`;
			expect(componentScanner.extractTemplateImports(source).map(b => b.value)).toStrictEqual(['a', 'b', 'c']);
		});

		test('returns the expression as written, whether it is an import or not', () => {
			const source = '{#await load(x) then v}{v}{/await}';
			expect(componentScanner.extractTemplateImports(source)).toStrictEqual([
				{ expression: 'load(x)', value: 'v' },
			]);
		});

		test('returns nothing for a source without an `#await` block', () => {
			expect(componentScanner.extractTemplateImports('<script>let a = 1</script><p>{a}</p>')).toStrictEqual([]);
		});

		test('returns nothing for a source the Svelte parser rejects', () => {
			expect(componentScanner.extractTemplateImports('{#await import(')).toStrictEqual([]);
		});
	});
});
