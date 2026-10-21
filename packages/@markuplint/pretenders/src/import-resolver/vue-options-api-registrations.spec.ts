import { describe, expect, test } from 'vitest';

import { extractVueOptionsApiRegistrations } from './extract-script-source.js';
import { analyzeImports, resolveComponentImport, resolveSelectorImport } from './index.js';

describe('extractVueOptionsApiRegistrations', () => {
	test('is the key the template uses and the name the binding has', () => {
		expect(
			extractVueOptionsApiRegistrations(
				`export default { components: { Button, Btn: MyButton, 'foo-bar': Foo, Item: defineAsyncComponent(() => import('./Item.vue')) } }`,
			),
		).toStrictEqual([
			{ key: 'Button', name: 'Button' },
			{ key: 'Btn', name: 'MyButton' },
			{ key: 'foo-bar', name: 'Foo' },
			{ key: 'Item', name: 'Item' },
		]);
	});

	test('is nothing without a components object, or for a value that gives no name', () => {
		expect(extractVueOptionsApiRegistrations('')).toStrictEqual([]);
		expect(extractVueOptionsApiRegistrations('export default {}')).toStrictEqual([]);
		expect(extractVueOptionsApiRegistrations('export default { components: { Foo: 1 } }')).toStrictEqual([]);
	});
});

describe('the components of the Options API of a Vue file', () => {
	const source = `<script>
import Foo from './Foo.vue'
import MyButton from './MyButton.vue'
import Card from './Card.vue'
export default { components: { 'foo-bar': Foo, Btn: MyButton, Card } }
</script>`;

	test('a binding is registered as its key when that is not its own name', async () => {
		const result = await analyzeImports('App.vue', source);

		expect(result!.bindings).toStrictEqual([
			{
				localName: 'Foo',
				importedName: 'default',
				source: './Foo.vue',
				type: 'default',
				registeredAs: 'foo-bar',
			},
			{
				localName: 'MyButton',
				importedName: 'default',
				source: './MyButton.vue',
				type: 'default',
				registeredAs: 'Btn',
			},
			{ localName: 'Card', importedName: 'default', source: './Card.vue', type: 'default' },
		]);
	});

	test('a tag is resolved by the key it is registered under, as Vue does', async () => {
		const { bindings } = (await analyzeImports('App.vue', source))!;

		expect(resolveComponentImport('foo-bar', bindings, 'App.vue')).toBe(bindings[0]);
		expect(resolveComponentImport('fooBar', bindings, 'App.vue')).toBeUndefined();
		expect(resolveComponentImport('Btn', bindings, 'App.vue')).toBe(bindings[1]);
		expect(resolveComponentImport('Card', bindings, 'App.vue')).toBe(bindings[2]);
		// Registered as `Btn`, not as the name it is imported under
		expect(resolveComponentImport('MyButton', bindings, 'App.vue')).toBeUndefined();
		expect(resolveComponentImport('Foo', bindings, 'App.vue')).toBeUndefined();
	});

	test('a selector is resolved by the key too', async () => {
		const { bindings } = (await analyzeImports('App.vue', source))!;

		expect(resolveSelectorImport('FooBar', bindings, 'App.vue')).toBe(bindings[0]);
		expect(resolveSelectorImport('Btn', bindings, 'App.vue')).toBe(bindings[1]);
	});
});
