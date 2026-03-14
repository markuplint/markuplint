import { describe, test, expect } from 'vitest';

import { componentScanner } from './component-scanner.js';

describe('componentScanner (Vue)', () => {
	describe('scanComponent', () => {
		test('extracts root element and attrs from a simple component', () => {
			const source = `<template>
	<button type="button" class="btn">Click me</button>
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('button');
			expect(result!.attrs).toStrictEqual([
				{ name: 'type', value: 'button' },
				{ name: 'class', value: 'btn' },
			]);
			expect(result!.hasSlots).toBe(false);
		});

		test('detects slot usage', () => {
			const source = `<template>
	<div class="wrapper">
		<slot></slot>
	</div>
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('div');
			expect(result!.hasSlots).toBe(true);
		});

		test('handles boolean attributes', () => {
			const source = `<template>
	<button disabled>Submit</button>
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.attrs).toStrictEqual([{ name: 'disabled' }]);
		});

		test('returns null for fragment-only templates', () => {
			const source = `<template>
	some text only
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).toBeNull();
		});

		test('extracts custom component as rootElement without filtering', () => {
			const source = `<template>
	<BaseButton variant="primary">Submit</BaseButton>
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('BaseButton');
		});

		test('detects SVG namespace', () => {
			const source = `<template>
	<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('svg');
			expect(result!.namespace).toBe('svg');
		});

		test('includes line and col of root element', () => {
			const source = `<template>
	<div>content</div>
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.line).toBeGreaterThan(0);
			expect(result!.col).toBeGreaterThan(0);
		});

		test('returns null for empty string input', () => {
			const result = componentScanner.scanComponent('');
			expect(result).toBeNull();
		});

		test('includes scriptSource when <script setup> is present', () => {
			const source = `<script setup>
import { ref } from 'vue';
</script>
<template><div /></template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.scriptSource).toBeDefined();
			expect(result!.scriptSource!.content).toContain("import { ref } from 'vue'");
			expect(result!.scriptSource!.offset).toBeGreaterThan(0);
		});

		test('omits scriptSource when no <script setup> exists', () => {
			const source = `<template>
	<div>content</div>
</template>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.scriptSource).toBeUndefined();
		});
	});

	describe('extractScriptSource', () => {
		test('extracts <script setup> content', () => {
			const source = `<script setup>
import Button from './Button.vue';
</script>
<template><div /></template>`;
			const result = componentScanner.extractScriptSource(source);
			expect(result).not.toBeNull();
			expect(result!.content).toContain("import Button from './Button.vue'");
			expect(result!.offset).toBeGreaterThan(0);
		});

		test('extracts <script setup lang="ts"> content', () => {
			const source = `<script setup lang="ts">
import { ref } from 'vue';
</script>
<template><div /></template>`;
			const result = componentScanner.extractScriptSource(source);
			expect(result).not.toBeNull();
			expect(result!.content).toContain("import { ref } from 'vue'");
		});

		test('returns null when no <script setup> exists', () => {
			const source = '<template><div /></template>';
			const result = componentScanner.extractScriptSource(source);
			expect(result).toBeNull();
		});

		test('returns null when only regular <script> exists', () => {
			const source = `<script>
export default { name: 'App' };
</script>
<template><div /></template>`;
			const result = componentScanner.extractScriptSource(source);
			expect(result).toBeNull();
		});
	});
});
