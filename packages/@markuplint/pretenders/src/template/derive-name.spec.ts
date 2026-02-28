import { describe, test, expect } from 'vitest';

import { deriveName } from './derive-name.js';

describe('deriveName', () => {
	test('removes .vue extension and keeps PascalCase', () => {
		expect(deriveName('BaseButton.vue')).toBe('BaseButton');
	});

	test('removes .svelte extension and keeps PascalCase', () => {
		expect(deriveName('Dialog.svelte')).toBe('Dialog');
	});

	test('removes .astro extension and keeps PascalCase', () => {
		expect(deriveName('Card.astro')).toBe('Card');
	});

	test('converts kebab-case filename to PascalCase', () => {
		expect(deriveName('base-button.vue')).toBe('BaseButton');
	});

	test('converts kebab-case with multiple segments to PascalCase', () => {
		expect(deriveName('my-fancy-dialog.svelte')).toBe('MyFancyDialog');
	});

	test('uses parent directory name for index files', () => {
		expect(deriveName('Card/index.vue')).toBe('Card');
	});

	test('uses parent directory name for index.svelte', () => {
		expect(deriveName('components/Dialog/index.svelte')).toBe('Dialog');
	});

	test('uses parent directory name for index.astro', () => {
		expect(deriveName('layouts/Main/index.astro')).toBe('Main');
	});

	test('handles absolute path with index file', () => {
		expect(deriveName('/home/user/project/src/components/Card/index.vue')).toBe('Card');
	});

	test('handles absolute path with named file', () => {
		expect(deriveName('/home/user/project/src/components/BaseButton.vue')).toBe('BaseButton');
	});

	test('converts kebab-case directory name to PascalCase for index files', () => {
		expect(deriveName('my-card/index.vue')).toBe('MyCard');
	});

	test('handles single character segments in kebab-case', () => {
		expect(deriveName('x-button.vue')).toBe('XButton');
	});

	test('preserves already PascalCase names', () => {
		expect(deriveName('MyComponent.vue')).toBe('MyComponent');
	});

	test('handles camelCase filenames by uppercasing first letter', () => {
		expect(deriveName('myComponent.vue')).toBe('MyComponent');
	});
});
