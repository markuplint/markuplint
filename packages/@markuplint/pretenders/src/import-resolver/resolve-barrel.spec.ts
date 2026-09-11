import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { resolveBarrelExport } from './resolve-barrel.js';

/**
 * Creates a temporary directory structure for barrel file tests.
 */
let tmpDir: string;

beforeAll(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barrel-test-'));

	// Create components directory with barrel index
	const componentsDir = path.join(tmpDir, 'components');
	fs.mkdirSync(componentsDir);

	// components/Button.vue
	fs.writeFileSync(path.join(componentsDir, 'Button.vue'), '<template><button /></template>');

	// components/Card.vue
	fs.writeFileSync(path.join(componentsDir, 'Card.vue'), '<template><div class="card" /></template>');

	// components/index.ts — barrel re-exports
	fs.writeFileSync(
		path.join(componentsDir, 'index.ts'),
		["export { default as Button } from './Button.vue'", "export { default as Card } from './Card.vue'"].join('\n'),
	);

	// Create a namespace barrel
	const iconsDir = path.join(tmpDir, 'icons');
	fs.mkdirSync(iconsDir);
	fs.writeFileSync(path.join(iconsDir, 'Star.vue'), '<template><svg /></template>');
	fs.writeFileSync(path.join(iconsDir, 'index.ts'), "export * from './Star.vue'\n");

	// Create a non-barrel file
	fs.writeFileSync(path.join(tmpDir, 'utils.ts'), 'export function helper() {}');

	// Create barrel with .js index
	const widgetsDir = path.join(tmpDir, 'widgets');
	fs.mkdirSync(widgetsDir);
	fs.writeFileSync(path.join(widgetsDir, 'Toggle.vue'), '<template><input type="checkbox" /></template>');
	fs.writeFileSync(path.join(widgetsDir, 'index.js'), "export { default as Toggle } from './Toggle.vue'\n");

	// Create named re-export barrel
	const formsDir = path.join(tmpDir, 'forms');
	fs.mkdirSync(formsDir);
	fs.writeFileSync(path.join(formsDir, 'TextInput.vue'), '<template><input type="text" /></template>');
	fs.writeFileSync(path.join(formsDir, 'index.ts'), "export { TextInput } from './TextInput.vue'\n");

	// Create barrel with type-only re-exports mixed in
	const typedDir = path.join(tmpDir, 'typed');
	fs.mkdirSync(typedDir);
	fs.writeFileSync(path.join(typedDir, 'Modal.vue'), '<template><dialog /></template>');
	fs.writeFileSync(
		path.join(typedDir, 'index.ts'),
		["export type { ModalProps } from './types'", "export { default as Modal } from './Modal.vue'"].join('\n'),
	);
});

afterAll(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('resolveBarrelExport', () => {
	test('resolves named re-export from barrel index.ts', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./components', 'Button', basePath);
		expect(result).toBe('./Button.vue');
	});

	test('resolves second named re-export from barrel', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./components', 'Card', basePath);
		expect(result).toBe('./Card.vue');
	});

	test('returns null for non-existent export name', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./components', 'NonExistent', basePath);
		expect(result).toBeNull();
	});

	test('returns null for non-barrel file (no index)', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./utils', 'helper', basePath);
		expect(result).toBeNull();
	});

	test('resolves from barrel with index.js', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./widgets', 'Toggle', basePath);
		expect(result).toBe('./Toggle.vue');
	});

	test('resolves named (non-default) re-export', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./forms', 'TextInput', basePath);
		expect(result).toBe('./TextInput.vue');
	});

	test('returns null for specifier that is already a file', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./components/Button.vue', 'default', basePath);
		expect(result).toBeNull();
	});

	test('returns null for non-relative specifier (npm package)', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('vue', 'ref', basePath);
		expect(result).toBeNull();
	});

	test('skips export type and resolves value re-export', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		const result = resolveBarrelExport('./typed', 'Modal', basePath);
		expect(result).toBe('./Modal.vue');
	});

	test('does not resolve type-only export name', () => {
		const basePath = path.join(tmpDir, 'App.vue');
		// `export type { ModalProps }` does not match the value re-export regex
		const result = resolveBarrelExport('./typed', 'ModalProps', basePath);
		expect(result).toBeNull();
	});
});
