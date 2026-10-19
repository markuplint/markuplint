import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest, mlTestFile } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * Vue resolves a tag to a component registered (or imported under `<script setup>`) as the tag as written,
 * camelized, or capitalized after camelizing: `<FooBar>`, `<fooBar>` and `<foo-bar>` are one component, and
 * `<foobar>` is not (https://vuejs.org/guide/components/registration.html#component-name-casing).
 *
 * `FooBar` pretends to be an `img`, which forbids children, so a child given to it is a `permitted-contents`
 * violation when the pretender applies. When it does not, the tag is an unknown element, which a `div` does
 * not permit.
 */

const vue = { parser: { '.*': '@markuplint/vue-parser' } };

describe('a pretender and the spelling of the name of a component in a Vue template', () => {
	async function lint(tag: string) {
		const { violations } = await mlTest(`<template><div><${tag}><span>c</span></${tag}></div></template>`, {
			...vue,
			pretenders: [{ selector: 'FooBar', as: 'img' }],
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => `${v.raw}: ${v.message}`);
	}

	test.each(['FooBar', 'fooBar', 'foo-bar'])('<%s> is the component and is checked as an img', async tag => {
		expect(await lint(tag)).toStrictEqual([`<${tag}>: The element disallows contents`]);
	});

	test('<foobar> is not the component but an unknown element', async () => {
		expect(await lint('foobar')).toStrictEqual([
			'<foobar>: The "foobar" element is not allowed in the "div" element in this context',
		]);
	});

	test('the selector in kebab-case is the component too', async () => {
		const { violations } = await mlTest('<template><div><FooBar><span>c</span></FooBar></div></template>', {
			...vue,
			pretenders: [{ selector: 'foo-bar', as: 'img' }],
			rules: { 'permitted-contents': true },
		});
		expect(violations.map(v => v.raw)).toStrictEqual(['<FooBar>']);
	});

	test('a custom element keeps its name: <ion-button> is not <button>', async () => {
		const { violations } = await mlTest('<template><div><ion-button><span>c</span></ion-button></div></template>', {
			...vue,
			pretenders: [{ selector: 'button', as: 'img' }],
			rules: { 'permitted-contents': true },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('a selector of nodeRules and the spelling of the name of a component in a Vue template', () => {
	async function lint(tag: string, selector: string) {
		const { violations } = await mlTest(`<template><div><${tag}></${tag}></div></template>`, {
			...vue,
			rules: {},
			nodeRules: [{ selector, rules: { 'require-attr': 'id' } }],
		});
		return violations.map(v => v.raw);
	}

	test.each([
		['FooBar', 'FooBar'],
		['fooBar', 'FooBar'],
		['foo-bar', 'FooBar'],
		['FooBar', 'foo-bar'],
		['fooBar', 'foo-bar'],
		['foo-bar', 'fooBar'],
	])('<%s> matches the selector %s', async (tag, selector) => {
		expect(await lint(tag, selector)).toStrictEqual([`<${tag}>`]);
	});

	test.each([
		['foobar', 'FooBar'],
		['foobar', 'foo-bar'],
	])('<%s> does not match the selector %s', async (tag, selector) => {
		expect(await lint(tag, selector)).toStrictEqual([]);
	});

	test('a component with one word is not an HTML element of the same name, nor the other way round', async () => {
		expect(await lint('Button', 'Button')).toStrictEqual(['<Button>']);
		expect(await lint('Button', 'button')).toStrictEqual([]);
		expect(await lint('button', 'button')).toStrictEqual(['<button>']);
		expect(await lint('button', 'Button')).toStrictEqual([]);
	});

	test('a built-in component is matched by its name as written or in kebab-case', async () => {
		expect(await lint('transition', 'Transition')).toStrictEqual(['<transition>']);
		expect(await lint('keep-alive', 'KeepAlive')).toStrictEqual(['<keep-alive>']);
	});
});

describe('the tag of a component imported by a Vue file with pretenders.auto', () => {
	let tmpDir: string;

	async function write(files: Record<string, string>) {
		for (const [file, content] of Object.entries(files)) {
			await mkdir(path.dirname(path.join(tmpDir, file)), { recursive: true });
			await writeFile(path.join(tmpDir, file), content);
		}
	}

	async function lint(file: string) {
		const { violations } = await mlTestFile(path.join(tmpDir, file), {
			...vue,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-vue-name-'));
		// Foo.vue renders an img, which forbids children
		await write({ 'Foo.vue': '<template><img src="x.png" /></template>\n' });
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	// The pretender is selected by the name the import gives, and a selector is one name whichever way a
	// component with more than one word is written.
	test.each(['myButton', 'my-button', 'MyButton'])('<%s> of `import myButton`', async tag => {
		await write({
			'Page.vue': `<script setup>
import myButton from './Foo.vue';
</script>
<template><div><${tag}><span>c</span></${tag}></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual([`permitted-contents: <${tag}>`]);
	});

	test.each(['MyButton', 'myButton', 'my-button'])('<%s> of `import MyButton`', async tag => {
		await write({
			'Page.vue': `<script setup>
import MyButton from './Foo.vue';
</script>
<template><div><${tag}><span>c</span></${tag}></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual([`permitted-contents: <${tag}>`]);
	});

	// `card` is no native element, so Vue resolves `<card>` to `import Card`; `button` is one, and is never `Button`
	test('<card> of `import Card`, which is no native element', async () => {
		await write({
			'Page.vue': `<script setup>
import Card from './Foo.vue';
</script>
<template><div><card><span>c</span></card></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual(['permitted-contents: <card>']);
	});

	test('a wrapper whose root is the lowercase tag of an imported component that is no native element', async () => {
		await write({
			'Wrapper.vue': `<script setup>
import Card from './Foo.vue';
</script>
<template><card /></template>
`,
			'Page.vue': `<script setup>
import Wrapper from './Wrapper.vue';
</script>
<template><div><Wrapper><span>c</span></Wrapper></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual(['permitted-contents: <Wrapper>']);
	});

	test('a wrapper whose root is the kebab-case tag of an imported component', async () => {
		await write({
			'Wrapper.vue': `<script setup>
import FooBar from './Foo.vue';
</script>
<template><foo-bar /></template>
`,
			'Page.vue': `<script setup>
import Wrapper from './Wrapper.vue';
</script>
<template><div><Wrapper><span>c</span></Wrapper></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual(['permitted-contents: <Wrapper>']);
	});

	test('a wrapper whose root is the camelCase tag of an imported component', async () => {
		await write({
			'Wrapper.vue': `<script setup>
import fooBar from './Foo.vue';
</script>
<template><fooBar /></template>
`,
			'Page.vue': `<script setup>
import Wrapper from './Wrapper.vue';
</script>
<template><div><Wrapper><span>c</span></Wrapper></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual(['permitted-contents: <Wrapper>']);
	});

	test('a component registered under a kebab-case key of the Options API', async () => {
		await write({
			'Page.vue': `<script>
import Foo from './Foo.vue';
export default { components: { 'foo-bar': Foo } };
</script>
<template><div><foo-bar><span>c</span></foo-bar></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual(['permitted-contents: <foo-bar>']);
	});

	test('a member of a namespace import whose name has a lowercase initial', async () => {
		await write({
			'ui.ts': "export { default as Item } from './Foo.vue';\n",
			'Page.vue': `<script setup>
import * as ui from './ui';
</script>
<template><div><ui.Item><span>c</span></ui.Item></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual(['permitted-contents: <ui.Item>']);
	});

	// Vue gives a prop the attribute of the usage site by the camelCase of its name
	describe('a prop written in camelCase', () => {
		async function lintAccessibleName(usage: string) {
			await write({
				'Labeled.vue': `<script setup>
defineProps(['myLabel'])
</script>
<template><button :aria-label="myLabel"></button></template>
`,
				'Page.vue': `<script setup>
import Labeled from './Labeled.vue';
</script>
<template><div>${usage}</div></template>
`,
			});
			const { violations } = await mlTestFile(path.join(tmpDir, 'Page.vue'), {
				...vue,
				pretenders: { auto: true },
				rules: { 'require-accessible-name': true },
			});
			return violations.map(v => `${v.ruleId}: ${v.raw}`);
		}

		test.each(['my-label', 'myLabel'])('is given the attribute %s of the usage site', async name => {
			expect(await lintAccessibleName(`<Labeled ${name}="Save" />`)).toStrictEqual([]);
		});

		test('is nothing when the usage site does not write it', async () => {
			expect(await lintAccessibleName('<Labeled />')).toStrictEqual(['require-accessible-name: <Labeled />']);
		});
	});
});
