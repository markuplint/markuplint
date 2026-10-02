import { describe, test, expect } from 'vitest';

import { componentScanner } from './component-scanner.js';

function scanAttrs(attrs: string) {
	return componentScanner.scanComponent(`---\n---\n<input ${attrs} />\n`)?.attrs;
}

describe('componentScanner (Astro): dynamic attributes', () => {
	test('an expression value and the shorthand are dynamic attributes of their own name', () => {
		expect(scanAttrs('type={kind} {disabled}')).toStrictEqual([
			// { name: 'type', dynamic: true }, // without `expression`
			// { name: 'disabled', dynamic: true }, // without `expression`
			{ name: 'type', dynamic: true, expression: 'kind' },
			{ name: 'disabled', dynamic: true, expression: 'disabled' },
		]);
	});

	test('a template literal is a dynamic attribute', () => {
		expect(scanAttrs('data-id=`id-${kind}` alt="plain"')).toStrictEqual([
			{ name: 'data-id', dynamic: true },
			{ name: 'alt', value: 'plain' },
		]);
	});

	test('directives are not attributes', () => {
		expect(scanAttrs('class:list={x} set:html="h" client:load define:vars={v}')).toStrictEqual([]);
	});

	test('a namespaced attribute is a static attribute although the parser flags it as a directive', () => {
		expect(scanAttrs('xlink:href="#a" xml:lang="en"')).toStrictEqual([
			{ name: 'xlink:href', value: '#a' },
			{ name: 'xml:lang', value: 'en' },
		]);
	});
});

describe('componentScanner (Astro): spreads', () => {
	const scan = (attrs: string) => componentScanner.scanComponent(`---\n---\n<button ${attrs}>x</button>\n`);

	test('the expressions of the spreads of the root', () => {
		expect(scan('{...rest} type={kind} {...Astro.props}')?.spreads).toStrictEqual(['rest', 'Astro.props']);
	});

	test('a root without a spread has none', () => {
		expect(scan('type={kind}')).not.toHaveProperty('spreads');
	});

	test('a name written in two forms is not one expression', () => {
		expect(scan('class="btn" class={x}')?.attrs).toStrictEqual([{ name: 'class', dynamic: true }]);
	});

	test('a template literal has no expression', () => {
		expect(scan('data-id=`id-${kind}`')?.attrs).toStrictEqual([{ name: 'data-id', dynamic: true }]);
	});
});
