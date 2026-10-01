import { describe, test, expect } from 'vitest';

import { componentScanner } from './component-scanner.js';

function scanAttrs(attrs: string) {
	return componentScanner.scanComponent(`<input ${attrs} />`)?.attrs;
}

describe('componentScanner (Svelte): dynamic attributes', () => {
	test('an expression value and the shorthand are dynamic attributes of their own name', () => {
		expect(scanAttrs('type={kind} {disabled} onclick={go}')).toStrictEqual([
			{ name: 'type', dynamic: true },
			{ name: 'disabled', dynamic: true },
			{ name: 'onclick', dynamic: true },
		]);
	});

	test('an interpolation inside a quoted value is dynamic', () => {
		expect(scanAttrs('title="a {b}" alt="plain"')).toStrictEqual([
			{ name: 'title', dynamic: true },
			{ name: 'alt', value: 'plain' },
		]);
	});

	test('bind: is a dynamic attribute of the bound name', () => {
		expect(scanAttrs('bind:value bind:Checked={c}')).toStrictEqual([
			{ name: 'value', dynamic: true },
			{ name: 'checked', dynamic: true },
		]);
	});

	test('a binding to a value that is not an attribute is left out', () => {
		expect(
			scanAttrs('bind:group bind:this={el} bind:clientWidth={w} bind:innerHTML={h} bind:paused'),
		).toStrictEqual([]);
	});

	test('the other directives are not attributes', () => {
		expect(
			scanAttrs(
				'class:active={a} style:color={c} use:action on:click={go} animate:flip transition:fade in:fly out:fly let:item',
			),
		).toStrictEqual([]);
	});

	test('a namespaced attribute is a static attribute', () => {
		expect(scanAttrs('xlink:href="#a" xml:lang="en"')).toStrictEqual([
			{ name: 'xlink:href', value: '#a' },
			{ name: 'xml:lang', value: 'en' },
		]);
	});
});
