import { describe, test, expect } from 'vitest';

import {
	extractVueScriptSetup,
	extractSvelteScript,
	extractAstroFrontmatter,
	extractMdxEsm,
} from './extract-script-source.js';

describe('extractVueScriptSetup', () => {
	test('extracts basic <script setup> content', () => {
		const source = `<template>
  <div>hello</div>
</template>

<script setup>
import Button from './Button.vue'
const msg = 'hello'
</script>`;
		const result = extractVueScriptSetup(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.vue'");
		expect(result!.content).toContain("const msg = 'hello'");
	});

	test('extracts <script setup lang="ts"> content', () => {
		const source = `<template>
  <Button />
</template>

<script setup lang="ts">
import Button from './Button.vue'
import type { ButtonProps } from './types'
</script>`;
		const result = extractVueScriptSetup(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.vue'");
	});

	test('extracts <script lang="ts" setup> content (reversed attrs)', () => {
		const source = `<script lang="ts" setup>
import { ref } from 'vue'
</script>

<template><div /></template>`;
		const result = extractVueScriptSetup(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import { ref } from 'vue'");
	});

	test('ignores regular <script> (not setup)', () => {
		const source = `<script>
export default {
  name: 'MyComponent'
}
</script>

<template><div /></template>`;
		const result = extractVueScriptSetup(source);
		expect(result).toBeNull();
	});

	test('returns null for source without script tag', () => {
		const source = '<template><div>hello</div></template>';
		const result = extractVueScriptSetup(source);
		expect(result).toBeNull();
	});

	test('offset points to content start (after opening tag)', () => {
		const source = "<script setup>\nimport X from './X'\n</script>";
		const result = extractVueScriptSetup(source);
		expect(result).not.toBeNull();
		// offset is right after '<script setup>' (14 chars)
		expect(result!.offset).toBe('<script setup>'.length);
	});
});

describe('extractSvelteScript', () => {
	test('extracts <script> content from Svelte component', () => {
		const source = `<script>
import Button from './Button.svelte'
let count = 0
</script>

<Button on:click={() => count++}>Click me</Button>`;
		const result = extractSvelteScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.svelte'");
		expect(result!.content).toContain('let count = 0');
	});

	test('extracts <script lang="ts"> content', () => {
		const source = `<script lang="ts">
import { type Snippet } from 'svelte'
let count: number = 0
</script>

<p>{count}</p>`;
		const result = extractSvelteScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import { type Snippet } from 'svelte'");
	});

	test('returns null for source without script tag', () => {
		const source = '<p>Hello World</p>';
		const result = extractSvelteScript(source);
		expect(result).toBeNull();
	});

	test('prefers instance <script> over <script context="module">', () => {
		const source = `<script context="module">
export const metadata = {}
</script>

<script>
import Button from './Button.svelte'
</script>

<Button />`;
		const result = extractSvelteScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.svelte'");
		expect(result!.content).not.toContain('metadata');
	});

	test('falls back to module script when no instance script exists', () => {
		const source = `<script context="module">
import { API_URL } from './config'
export const metadata = { url: API_URL }
</script>

<p>Static content</p>`;
		const result = extractSvelteScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import { API_URL } from './config'");
	});

	test('prefers instance script when module script comes after', () => {
		const source = `<script>
import Button from './Button.svelte'
</script>

<script context="module">
export const metadata = {}
</script>

<Button />`;
		const result = extractSvelteScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.svelte'");
		expect(result!.content).not.toContain('metadata');
	});
});

describe('extractAstroFrontmatter', () => {
	test('extracts frontmatter content', () => {
		const source = `---
import Button from '../components/Button.astro'
const title = 'Hello'
---

<Button>{title}</Button>`;
		const result = extractAstroFrontmatter(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from '../components/Button.astro'");
		expect(result!.content).toContain("const title = 'Hello'");
	});

	test('returns null for source without frontmatter', () => {
		const source = '<html><body>Hello</body></html>';
		const result = extractAstroFrontmatter(source);
		expect(result).toBeNull();
	});

	test('returns null for source with only opening delimiter', () => {
		const source = `---
import X from './X'
some unclosed frontmatter`;
		const result = extractAstroFrontmatter(source);
		expect(result).toBeNull();
	});

	test('offset points to content start (after opening ---)', () => {
		const source = "---\nimport X from './X'\n---\n<div />";
		const result = extractAstroFrontmatter(source);
		expect(result).not.toBeNull();
		expect(result!.offset).toBe(4); // After "---\n"
	});
});

describe('extractMdxEsm', () => {
	test('extracts source when import statements are present', () => {
		const source = `import Button from './Button'
import { Card } from './ui'

# Hello World

<Button>Click me</Button>`;
		const result = extractMdxEsm(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button'");
		expect(result!.content).toContain("import { Card } from './ui'");
		expect(result!.offset).toBe(0);
	});

	test('returns null when no import statements exist', () => {
		const source = '# Hello World\n\nSome markdown content';
		const result = extractMdxEsm(source);
		expect(result).toBeNull();
	});

	test('returns null for empty source', () => {
		const result = extractMdxEsm('');
		expect(result).toBeNull();
	});
});
