import { compileDirectivePatterns, resolveDirective } from '@markuplint/ml-spec';
import { describe, expect, test } from 'vitest';

import spec from './index.js';

const patterns = compileDirectivePatterns(spec.directivePatterns ?? []);

/**
 * The key that Vue keeps of a `v-bind` is what `transformBind` of `@vue/compiler-dom` 3.5.45 makes of it
 * (checked by compiling each name and reading the keys of the props that it generates).
 */
describe('directivePatterns: the key of a repeat', () => {
	test.each([
		['.id', '.id', false],
		['.id.attr', '^.id', false],
		['.view-box.camel', '.viewBox', false],
		['.id.', '.id', false],
		[':id.prop', '.id', false],
		['v-bind:id.prop', '.id', false],
		[':id.attr', '^id', false],
		[':id.prop.attr', '^.id', false],
		[':id.attr.prop', '^.id', false],
		[':view-box.camel', 'viewBox', true],
		[':view-box.camel.prop', '.viewBox', false],
		[':view-box.prop.camel.attr', '^.viewBox', false],
		[':id.foo', 'id', true],
		[':id.', 'id', true],
		[':id..x', 'id', true],
		[':id.PROP', 'id', true],
	])('%s is keyed %s (folded as an attribute: %s)', (name, key, folds) => {
		const resolution = resolveDirective(name, patterns);
		expect(resolution?.isDirective).toBe(true);
		expect(resolution?.duplicateKey).toBe(key);
		expect(resolution?.duplicateKeyFolds === true).toBe(folds);
	});

	test.each([':class.foo', ':style.camel', 'v-bind:class.', ':class.foo.bar'])(
		'%s is keyed by the name as written: Vue merges its key with the others of `class` and `style`',
		name => {
			const resolution = resolveDirective(name, patterns);
			expect(resolution?.isDirective).toBe(true);
			expect(resolution).not.toHaveProperty('duplicateKey');
		},
	);

	test.each([':class.prop', ':style.attr'])('%s has a prefix, so it is not the key of `class` or `style`', name => {
		expect(resolveDirective(name, patterns)?.duplicateKey).toBe(name.endsWith('prop') ? '.class' : '^style');
	});

	test.each([':[x]', ':[x].prop', 'v-bind:[x]', '@[x]', 'v-on:[x]', '.[x]'])(
		'%s is a dynamic name, keyed by the name as written',
		name => {
			const resolution = resolveDirective(name, patterns);
			expect(resolution?.isDirective).toBe(true);
			expect(resolution).not.toHaveProperty('duplicateKey');
		},
	);

	test.each([
		'@keydown.enter',
		'@keydown.space',
		'v-on:click.stop.prevent',
		'@KEYDOWN',
		'v-model',
		'v-model:foo',
		'#slot',
	])('%s is keyed by the name as written', name => {
		const resolution = resolveDirective(name, patterns);
		expect(resolution?.isDirective).toBe(true);
		expect(resolution).not.toHaveProperty('duplicateKey');
	});

	test('a bound attribute without a modifier is an attribute of the DOM, compared by its name', () => {
		const resolution = resolveDirective(':id', patterns);
		expect(resolution?.potentialName).toBe('id');
		expect(resolution?.isDirective).toBeUndefined();
		expect(resolution).not.toHaveProperty('duplicateKey');
	});

	test(':class may repeat `class`, and is keyed by the name as written', () => {
		const resolution = resolveDirective(':class', patterns);
		expect(resolution?.isDuplicatable).toBe(true);
		expect(resolution).not.toHaveProperty('duplicateKey');
	});
});
