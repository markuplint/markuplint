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
 * In a Vue document the lists of `@vue/shared` decide whether a tag is native (`VueParser#isNativeTag`), not the
 * specification: `<marquee>` and `<search>` have one, and Vue resolves them to a component when one is imported
 * or registered. The type selector, the guard that keeps a pretender off a native element and `pretenders.auto`
 * answer the same for a tag. See issue #4351.
 */

const vue = { parser: { '.*': '@markuplint/vue-parser' } };

describe('a selector of nodeRules and a tag that has a specification but is no native tag to Vue', () => {
	async function lint(tag: string, selector: string) {
		const { violations } = await mlTest(`<template><div><${tag}></${tag}></div></template>`, {
			...vue,
			rules: {},
			nodeRules: [{ selector, rules: { 'require-attr': 'id' } }],
		});
		return violations.map(v => v.raw);
	}

	test.each([
		['marquee', 'Marquee'],
		['marquee', 'marquee'],
		['search', 'Search'],
	])('<%s> matches the selector %s', async (tag, selector) => {
		expect(await lint(tag, selector)).toStrictEqual([`<${tag}>`]);
	});

	test('<button> is still no match of Button', async () => {
		expect(await lint('button', 'Button')).toStrictEqual([]);
	});
});

describe('a pretender and a tag that has a specification but is no native tag to Vue', () => {
	async function lint(tag: string, selector: string) {
		const { violations } = await mlTest(`<template><div><${tag}><span>c</span></${tag}></div></template>`, {
			...vue,
			pretenders: [{ selector, as: 'img' }],
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => `${v.raw}: ${v.message}`);
	}

	test.each(['marquee', 'search'])('<%s> takes a pretender and is checked as an img', async tag => {
		expect(await lint(tag, tag)).toStrictEqual([`<${tag}>: The element disallows contents`]);
	});

	test('<button> is native to Vue: the pretender does not apply', async () => {
		expect(await lint('button', 'button')).toStrictEqual([]);
	});

	// Vue's `isNativeTag` knows no namespace and holds `mesh` of SVG, which the specification does not have
	test('<mesh> of SVG is native to Vue: the pretender does not apply', async () => {
		const { violations } = await mlTest('<template><svg><mesh><span>c</span></mesh></svg></template>', {
			...vue,
			pretenders: [{ selector: 'mesh', as: 'img' }],
			rules: { 'permitted-contents': true },
		});
		// As an img it would be "disallows contents"; the element itself is unknown to the specification
		expect(violations.map(v => `${v.raw}: ${v.message}`)).toStrictEqual([
			'<mesh>: The "mesh" element is not allowed in the "svg" element in this context',
		]);
	});

	// A camelCase name of SVG is native to Vue (`isSVGTag` is case-sensitive) and has a specification
	test('<clipPath> of SVG is native to Vue: the pretender does not apply', async () => {
		const { violations } = await mlTest('<template><svg><clipPath><span>c</span></clipPath></svg></template>', {
			...vue,
			pretenders: [{ selector: 'clipPath', as: 'img' }],
			rules: { 'permitted-contents': true },
		});
		expect(violations.map(v => v.message)).not.toContain('The element disallows contents');
	});

	test('a deprecated element without a pretender is still reported by no-obsolete-element', async () => {
		const { violations } = await mlTest('<template><div><marquee></marquee></div></template>', {
			...vue,
			rules: { 'no-obsolete-element': true },
		});
		expect(violations.map(v => v.raw)).toStrictEqual(['<marquee>']);
	});
});

describe('the tag of a component imported by a Vue file with pretenders.auto, that has a specification', () => {
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
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-vue-native-'));
		// Foo.vue renders an img, which forbids children
		await write({ 'Foo.vue': '<template><img src="x.png" /></template>\n' });
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test.each([
		['marquee', 'Marquee'],
		['search', 'Search'],
	])('<%s> of `import %s` is the component and is checked as an img', async (tag, name) => {
		await write({
			'Page.vue': `<script setup>
import ${name} from './Foo.vue';
</script>
<template><div><${tag}><span>c</span></${tag}></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual([`permitted-contents: <${tag}>`]);
	});

	test('<button> of `import Button` is no component', async () => {
		await write({
			'Page.vue': `<script setup>
import Button from './Foo.vue';
</script>
<template><div><button><span>c</span></button></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual([]);
	});
});
