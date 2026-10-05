import { describe, expect, test } from 'vitest';

import { analyzeScript, createTemplatePropResolver } from './analyze-script.js';

const locals = (framework: 'vue' | 'svelte' | 'astro', source: string) => [
	...analyzeScript(framework, source).locals.entries(),
];

describe('analyzeScript: Vue <script setup>', () => {
	test('the array form of defineProps', () => {
		expect(locals('vue', "defineProps(['label', 'title'])")).toStrictEqual([
			['label', 'label'],
			['title', 'title'],
		]);
	});

	test('the object form of defineProps; a prop with a default is not trusted', () => {
		expect(
			locals('vue', 'defineProps({ label: String, size: { type: Number, default: 1 }, "data-x": String })'),
		).toStrictEqual([
			['label', 'label'],
			['data-x', 'data-x'],
		]);
	});

	test('the type literal form of defineProps', () => {
		expect(locals('vue', 'defineProps<{ label: string; size?: number }>()')).toStrictEqual([
			['label', 'label'],
			['size', 'size'],
		]);
	});

	test('a type that is not a literal says nothing about the names', () => {
		expect(locals('vue', 'defineProps<Props>()')).toStrictEqual([]);
	});

	test('withDefaults: a prop with a default is not trusted', () => {
		expect(
			locals('vue', 'withDefaults(defineProps<{ label?: string; size?: number }>(), { size: 1 })'),
		).toStrictEqual([['label', 'label']]);
	});

	test('the props object', () => {
		const analysis = analyzeScript('vue', "const props = defineProps(['label'])");
		expect([...analysis.objects]).toContain('props');
		expect([...analysis.locals]).toStrictEqual([['label', 'label']]);
	});

	test('destructured props: an alias is the prop of the original name, a default is not trusted, and the rest is a spread of props', () => {
		const analysis = analyzeScript(
			'vue',
			'const { label, size = 1, title: heading, ...rest } = defineProps<{ label: string; size?: number; title: string }>()',
		);
		expect([...analysis.locals]).toStrictEqual([
			['label', 'label'],
			['title', 'title'],
			['heading', 'title'],
		]);
		expect([...analysis.rests]).toContain('rest');
	});

	test('a name that the script declares again is not the prop', () => {
		expect(locals('vue', "defineProps(['label', 'title']); const label = ref('x')")).toStrictEqual([
			['title', 'title'],
		]);
	});

	test('an import declares a name too', () => {
		expect(locals('vue', "import label from './label'; defineProps(['label'])")).toStrictEqual([]);
	});

	test('a script that is missing says nothing', () => {
		expect(locals('vue', '')).toStrictEqual([]);
		expect([...analyzeScript('vue').locals]).toStrictEqual([]);
	});

	test('a script that is not a script says nothing and does not throw', () => {
		expect(locals('vue', '<<<>>> {{{')).toStrictEqual([]);
	});
});

describe('analyzeScript: Svelte', () => {
	test('export let: a prop with an initial value is not trusted', () => {
		expect(locals('svelte', "export let label;\nexport let size = 1;\nexport let a, b = 'x';")).toStrictEqual([
			['label', 'label'],
			['a', 'a'],
		]);
	});

	test('$props(): destructured props and the rest', () => {
		const analysis = analyzeScript('svelte', 'let { label, size = 1, ...rest } = $props();');
		expect([...analysis.locals]).toStrictEqual([['label', 'label']]);
		expect([...analysis.rests]).toStrictEqual(expect.arrayContaining(['rest', '$$restProps', '$$props']));
	});

	test('$props() as an object', () => {
		const analysis = analyzeScript('svelte', 'let props = $props();');
		expect([...analysis.objects]).toStrictEqual(expect.arrayContaining(['props', '$$props']));
	});

	test('a typed destructuring', () => {
		expect(locals('svelte', 'let { label }: { label: string } = $props();')).toStrictEqual([['label', 'label']]);
	});
});

describe('analyzeScript: Astro', () => {
	test('Astro.props destructured: the rest is a spread of props', () => {
		const analysis = analyzeScript('astro', 'const { label, size = 1, ...rest } = Astro.props;');
		expect([...analysis.locals]).toStrictEqual([['label', 'label']]);
		expect([...analysis.rests]).toStrictEqual(expect.arrayContaining(['rest', 'Astro.props']));
	});

	test('Astro.props as an object', () => {
		const analysis = analyzeScript('astro', 'const props = Astro.props;');
		expect([...analysis.objects]).toStrictEqual(expect.arrayContaining(['props', 'Astro.props']));
	});
});

describe('createTemplatePropResolver (template)', () => {
	const vue = createTemplatePropResolver(
		'vue',
		analyzeScript('vue', "const props = defineProps(['label', 'myLabel'])"),
	);
	const astro = createTemplatePropResolver('astro', analyzeScript('astro', 'const { label } = Astro.props;'));

	test('a name that is a prop', () => {
		expect(vue('label')).toBe('label');
		expect(astro('label')).toBe('label');
	});

	test('a property of the props object', () => {
		expect(vue('props.label')).toBe('label');
		expect(vue('$props.label')).toBe('label');
		expect(astro('Astro.props.label')).toBe('label');
	});

	test('whitespace around the expression is ignored', () => {
		expect(vue('  label ')).toBe('label');
	});

	test('anything that does more than name the prop is not one', () => {
		expect(vue("label ?? 'x'")).toBeUndefined();
		expect(vue('label.length')).toBeUndefined();
		expect(vue('props?.label')).toBeUndefined();
		expect(vue('other')).toBeUndefined();
		expect(vue('')).toBeUndefined();
		expect(vue()).toBeUndefined();
	});

	test('the children are not an attribute', () => {
		expect(vue('props.children')).toBeUndefined();
	});

	test('Vue lowercases the names of the attributes, so a prop written in camelCase is not matched at the usage site', () => {
		expect(vue('myLabel')).toBeUndefined();
		expect(vue('props.myLabel')).toBeUndefined();
	});
});
